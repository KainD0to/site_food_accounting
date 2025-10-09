import express from 'express';
import pkg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

// Загружаем переменные из .env файла
dotenv.config();

const { Pool } = pkg;
const app = express();

// Настройки CORS для production
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://site-food-accounting-frontend.onrender.com'
  ],
  credentials: true
}));
app.use(express.json());

// Проверяем что переменные загрузились
console.log('🔐 DATABASE_URL:', process.env.DATABASE_URL ? 'загружен' : 'не загружен');
console.log('🌐 NODE_ENV:', process.env.NODE_ENV);
console.log('🔗 FRONTEND_URL:', process.env.FRONTEND_URL);

// Подключение к PostgreSQL - ДЛЯ RENDER ИСПОЛЬЗУЕМ DATABASE_URL
const poolConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
  : {
      // Локальная разработка
      user: 'postgres',
      host: 'localhost',
      database: 'food-accounting-db',
      password: process.env.DB_PASSWORD,
      port: 5432,
    };

const pool = new Pool(poolConfig);

// Проверка подключения при старте
pool.on('connect', () => {
  console.log('✅ Подключение к PostgreSQL установлено');
});

pool.on('error', (err) => {
  console.error('❌ Ошибка PostgreSQL:', err);
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    
    // Дополнительная проверка - посчитаем записи в таблицах
    const adminCount = await pool.query('SELECT COUNT(*) FROM admin');
    const parentsCount = await pool.query('SELECT COUNT(*) FROM parents');
    const studentsCount = await pool.query('SELECT COUNT(*) FROM students');
    
    res.json({ 
      status: 'OK', 
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      tables: {
        admin: parseInt(adminCount.rows[0].count),
        parents: parseInt(parentsCount.rows[0].count),
        students: parseInt(studentsCount.rows[0].count)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(500).json({ 
      status: 'Error', 
      database: 'disconnected',
      error: error.message,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  }
});

// Простой тестовый endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend работает!',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Аутентификация администратора
app.post('/api/admin/login', async (req, res) => {
  try {
    const { full_name, password } = req.body;
    console.log('🔑 Попытка входа админа:', full_name);

    const result = await pool.query(
      'SELECT * FROM admin WHERE full_name = $1',
      [full_name]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Администратор не найден' });
    }

    const admin = result.rows[0];
    
    if (password !== admin.password) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const token = 'admin-token-' + admin.id;

    res.json({
      message: 'Успешный вход',
      token,
      user: {
        id: admin.id,
        full_name: admin.full_name,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Аутентификация родителя
app.post('/api/parent/login', async (req, res) => {
  try {
    const { full_name, password } = req.body;
    console.log('🔑 Попытка входа родителя:', full_name);

    const result = await pool.query(
      'SELECT * FROM parents WHERE full_name = $1',
      [full_name]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Родитель не найден' });
    }

    const parent = result.rows[0];
    
    if (password !== parent.password) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const token = 'parent-token-' + parent.id;

    res.json({
      message: 'Успешный вход',
      token,
      user: {
        id: parent.id,
        full_name: parent.full_name,
        role: 'parent'
      }
    });
  } catch (error) {
    console.error('Parent login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить всех студентов (только для админа)
app.get('/api/students', async (req, res) => {
  try {
    const token = req.headers.authorization;
    console.log('🔐 Token для студентов:', token);
    
    if (!token || !token.includes('admin-token')) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    console.log('📋 Запрос всех студентов...');
    
    const result = await pool.query(`
      SELECT s.*, p.full_name as parent_name,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id) as balance
      FROM students s 
      LEFT JOIN parents p ON s.parent_id = p.id 
      ORDER BY s.full_name
    `);
    
    console.log(`✅ Найдено студентов: ${result.rows.length}`);
    console.log('📊 Студенты:', result.rows);
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка загрузки студентов:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить студентов родителя
app.get('/api/parent/students', async (req, res) => {
  try {
    const token = req.headers.authorization;
    console.log('🔐 Token для родителя:', token);
    
    if (!token || !token.includes('parent-token')) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Извлекаем parent_id из токена (parent-token-1 → 1)
    const parentId = parseInt(token.split('-').pop());
    console.log(`👨‍👦 Запрос студентов для родителя ID: ${parentId}`);
    
    const result = await pool.query(`
      SELECT s.*,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id) as balance
      FROM students s 
      WHERE s.parent_id = $1
      ORDER BY s.full_name
    `, [parentId]);
    
    console.log(`✅ Найдено студентов у родителя: ${result.rows.length}`);
    console.log('📊 Студенты родителя:', result.rows);
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка загрузки студентов родителя:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить платежи студента
app.get('/api/students/:id/payments', async (req, res) => {
  try {
    const studentId = req.params.id;
    const token = req.headers.authorization;
    
    console.log(`💰 Запрос платежей студента ID: ${studentId}`);
    
    // Проверка прав доступа для родителя
    if (token && token.includes('parent-token')) {
      const parentId = parseInt(token.split('-').pop());
      const studentCheck = await pool.query(
        'SELECT * FROM students WHERE id = $1 AND parent_id = $2',
        [studentId, parentId]
      );
      
      if (studentCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }
    }

    const result = await pool.query(
      'SELECT * FROM payments WHERE student_id = $1 ORDER BY payment_date DESC, created_at DESC',
      [studentId]
    );

    console.log(`✅ Найдено платежей: ${result.rows.length}`);
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка загрузки платежей:', error);
    res.status(500).json({ error: error.message });
  }
});

// Добавить платеж (только для администратора)
app.post('/api/payments', async (req, res) => {
  try {
    const token = req.headers.authorization;
    
    if (!token || !token.includes('admin-token')) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { student_id, payment_date, amount, description } = req.body;
    
    console.log('➕ Добавление платежа:', { student_id, amount, description });

    const result = await pool.query(
      `INSERT INTO payments (student_id, payment_date, amount, description, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [student_id, payment_date, amount, description, 1] // created_by = 1 (админ)
    );

    console.log('✅ Платеж добавлен:', result.rows[0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка добавления платежа:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🔐 Пароль из .env: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-2) : 'НЕ ЗАГРУЖЕН'}`);
  console.log('='.repeat(50));
});
import express from 'express';
import pkg from 'pg';
import cors from 'cors';
//библиотеки защиты
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📁 Текущая директория:', __dirname);
console.log('🔍 Ищем .env файл...');

// Попробуем несколько возможных путей
const envPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, 'backend', '.env'),
  '.env'
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log(`✅ .env загружен из: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    console.log(`❌ Не удалось загрузить из ${envPath}:`, error.message);
  }
}

if (!envLoaded) {
  console.log('❌ .env файл не найден ни по одному из путей:', envPaths);
}

console.log('🔧 Проверка переменных окружения ПОСЛЕ загрузки:');
console.log('📍 NODE_ENV:', process.env.NODE_ENV);
console.log('🏠 DB_HOST:', process.env.DB_HOST);
console.log('📁 DB_NAME:', process.env.DB_NAME);
console.log('👤 DB_USER:', process.env.DB_USER);
console.log('🔐 DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'не указан');


const { Pool } = pkg;
const app = express(); // ← ПЕРЕНЕСИ СЮДА!

// ==================== MIDDLEWARE ====================

// Защита headers
app.use(helmet());

// Лимит запросов
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // максимум 100 запросов с одного IP
});
app.use(limiter);

// CORS только для нужных доменов
app.use(cors({
  origin: [
    'https://site-food-accounting-frontend.onrender.com',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());

// ==================== БАЗА ДАННЫХ ====================

console.log('🔧 Проверка переменных окружения:');
console.log('📍 NODE_ENV:', process.env.NODE_ENV);
console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL ? 'ЕСТЬ' : 'НЕТ');
console.log('🏠 DB_HOST:', process.env.DB_HOST || 'не указан');
console.log('📁 DB_NAME:', process.env.DB_NAME || 'не указан');
console.log('👤 DB_USER:', process.env.DB_USER || 'не указан');
console.log('🔐 DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'не указан');

let poolConfig;

if (process.env.DATABASE_URL) {
  // Для Render - используем DATABASE_URL с SSL
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  };
  console.log('🎯 Используем DATABASE_URL (Production)');
} else {
  // Для локальной разработки
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  };
  console.log('🎯 Используем локальную БД (Development)');
}

const pool = new Pool(poolConfig);

// Тестируем подключение при старте
async function testDatabaseConnection() {
  let client;
  try {
    console.log('🔄 Тестируем подключение к БД...');
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Подключение к БД УСПЕШНО');
    console.log('⏰ Время БД:', result.rows[0].current_time);
    console.log('📊 Версия:', result.rows[0].db_version.split('\n')[0]);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error.message);
    console.log('🔧 Конфиг подключения:', {
      host: poolConfig.host,
      database: poolConfig.database,
      user: poolConfig.user,
      port: poolConfig.port,
      hasPassword: !!poolConfig.password,
      hasSSL: !!poolConfig.ssl
    });
    return false;
  } finally {
    if (client) client.release();
  }
}

// Создаем таблицы если их нет
async function initializeDatabase() {
  let client;
  try {
    client = await pool.connect();
    
    // Проверяем существование таблиц
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('admin', 'parents', 'students', 'payments')
    `);
    
    console.log(`📊 Найдено таблиц: ${tablesCheck.rows.length}`);
    
    if (tablesCheck.rows.length === 0) {
      console.log('🗃️ Создаем таблицы...');
      
      await client.query(`
        CREATE TABLE admin (
          id SERIAL PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL,
          password VARCHAR(100) NOT NULL
        )
      `);

      await client.query(`
        CREATE TABLE parents (
          id SERIAL PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL,
          password VARCHAR(100) NOT NULL,
          parent_id INTEGER,
          usertype VARCHAR
        )
      `);

      await client.query(`
        CREATE TABLE students (
          id SERIAL PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL,
          student_id INTEGER,
          balance REAL,
          parent_id INTEGER
        )
      `);

      await client.query(`
        CREATE TABLE payments (
          id SERIAL PRIMARY KEY,
          student_id INTEGER,
          payment_date DATE NOT NULL,
          amount NUMERIC(10,2) NOT NULL,
          description TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER
        )
      `);

      // Создаем функцию
      await client.query(`
        CREATE OR REPLACE FUNCTION get_student_balance(student_id integer, target_date date DEFAULT CURRENT_DATE)
        RETURNS numeric AS $$
        SELECT COALESCE(SUM(amount), 0)
        FROM payments 
        WHERE student_id = $1 AND payment_date <= $2;
        $$ LANGUAGE sql
      `);

      console.log('✅ Таблицы созданы');
    }
    
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error);
  } finally {
    if (client) client.release();
  }
}

// Запускаем при старте
setTimeout(async () => {
  const connected = await testDatabaseConnection();
  if (connected) {
    await initializeDatabase();
  }
}, 1000);

// ==================== ROUTES ====================

// Простой тест - УБЕДИТЕСЬ ЧТО СЕРВЕР РАБОТАЕТ
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Backend работает!',
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      admin_login: 'POST /api/admin/login'
    },
    timestamp: new Date().toISOString()
  });
});

// Добавьте этот route перед другими маршрутами
app.get('/api/test-db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    client.release();
    
    res.json({ 
      status: 'DB connected', 
      time: result.rows[0].time,
      config: {
        host: pool.options.host,
        database: pool.options.database,
        user: pool.options.user,
        port: pool.options.port
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'DB connection failed', 
      error: error.message,
      config: {
        host: pool.options.host,
        database: pool.options.database,
        user: pool.options.user,
        port: pool.options.port
      }
    });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'OK', 
      database: 'connected',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(500).json({ 
      status: 'Error', 
      database: 'disconnected',
      error: error.message,
      environment: process.env.NODE_ENV
    });
  }
});

// Тестовый endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend работает!',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Аутентификация администратора
app.post('/api/admin/login', async (req, res) => {
  console.log('🔑 ========== ПОПЫТКА ВХОДА АДМИНА ==========');
  
  try {
    console.log('📨 Тело запроса:', JSON.stringify(req.body));
    
    const { full_name, password } = req.body;
    
    if (!full_name || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    console.log(`🔐 Вход: "${full_name}", Пароль: "${password}"`);

    // Проверяем в базе
    const result = await pool.query(
      'SELECT * FROM admin WHERE full_name = $1',
      [full_name.trim()]  // убираем пробелы
    );

    console.log(`📊 Найдено записей: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      const admin = result.rows[0];
      console.log('👤 Найден администратор:', admin);
      console.log(`🔍 Сравниваем пароли: введен "${password}" vs в БД "${admin.password}"`);
      
      if (password === admin.password) {
        console.log('✅ Пароль верный');
        return res.json({
          message: 'Успешный вход',
          token: 'admin-token-' + admin.id,
          user: {
            id: admin.id,
            full_name: admin.full_name,
            role: 'admin'
          }
        });
      } else {
        console.log('❌ Пароль НЕ совпадает');
      }
    } else {
      console.log('❌ Администратор не найден');
    }

    res.status(401).json({ error: 'Неверные учетные данные' });
    
  } catch (error) {
    console.error('💥 Ошибка при входе:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  }
});

// Вход по ID студента - для просмотра информации о студенте
app.get('/api/student/login/:studentId', async (req, res) => {
  console.log('🔑 ========== ПОПЫТКА ВХОДА ПО ID СТУДЕНТА ==========');
  
  try {
    const studentId = req.params.studentId;
    console.log('🎯 Поиск студента с ID:', studentId);

    // Ищем студента по student_id
    const result = await pool.query(`
      SELECT s.*, p.full_name as parent_name,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id) as balance
      FROM students s 
      LEFT JOIN parents p ON s.parent_id = p.id 
      WHERE s.student_id = $1
    `, [studentId]);

    console.log(`📊 Найдено студентов: ${result.rows.length}`);

    if (result.rows.length > 0) {
      const student = result.rows[0];
      console.log('✅ Студент найден:', student.full_name);
      
      return res.json({
        message: 'Успешный вход',
        user: {
          id: student.id,
          full_name: student.full_name,
          student_id: student.student_id,
          balance: student.balance,
          parent_name: student.parent_name,
          role: 'user'  // ВСЕ пользователи имеют роль 'user'
        },
        token: 'user-token-' + student.id
      });
    } else {
      console.log('❌ Студент не найден');
      return res.status(404).json({ error: 'Студент с таким ID не найден' });
    }
    
  } catch (error) {
    console.error('💥 Ошибка при входе:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
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
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Ошибка загрузки студентов родителя:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить платежи студента
// Получить платежи студента - доступно всем с валидным токеном
app.get('/api/students/:id/payments', async (req, res) => {
  try {
    const studentId = req.params.id;
    const token = req.headers.authorization;
    
    console.log(`💰 Запрос платежей студента ID: ${studentId}`);

    // Базовая проверка токена
    if (!token) {
      return res.status(401).json({ error: 'Требуется авторизация' });
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

    // Извлекаем admin_id из токена (admin-token-1 → 1)
    const adminId = parseInt(token.split('-').pop());

    const result = await pool.query(
      `INSERT INTO payments (student_id, payment_date, amount, description, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [student_id, payment_date, amount, description, adminId]
    );

    console.log('✅ Платеж добавлен:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка добавления платежа:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить баланс студента
app.get('/api/students/:id/balance', async (req, res) => {
  try {
    const studentId = req.params.id;
    const token = req.headers.authorization;
    
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
      'SELECT public.get_student_balance($1, CURRENT_DATE) as balance',
      [studentId]
    );

    res.json({ balance: parseFloat(result.rows[0].balance) });
  } catch (error) {
    console.error('❌ Ошибка получения баланса:', error);
    res.status(500).json({ error: error.message });
  }
});

// Проверка данных в БД
// Диагностика подключения
app.get('/api/debug/connection', async (req, res) => {
  try {
    const client = await pool.connect();
    const dbInfo = await client.query('SELECT NOW() as time, version() as version');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    client.release();
    
    res.json({
      status: 'connected',
      database_time: dbInfo.rows[0].time,
      version: dbInfo.rows[0].version.split('\n')[0],
      tables: tables.rows.map(t => t.table_name),
      environment: {
        node_env: process.env.NODE_ENV,
        has_database_url: !!process.env.DATABASE_URL,
        db_host: process.env.DB_HOST,
        db_name: process.env.DB_NAME
      }
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'disconnected',
      error: error.message,
      environment: {
        node_env: process.env.NODE_ENV,
        has_database_url: !!process.env.DATABASE_URL,
        db_host: process.env.DB_HOST,
        db_name: process.env.DB_NAME
      }
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL ? 'есть' : 'нет'}`);
  console.log('='.repeat(50));
});
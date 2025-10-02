import express from 'express';
import pkg from 'pg';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const { Pool } = pkg;
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Подключение к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Проверка подключения к БД
const checkDatabaseConnection = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Успешное подключение к PostgreSQL');
    
    // Проверим что таблицы существуют
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📊 Таблицы в базе:', result.rows.map(row => row.table_name));
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error);
  }
};

// API маршруты
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'OK', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Error', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Получить всех учеников
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать ученика
app.post('/api/students', async (req, res) => {
  try {
    const { student_code, full_name, class: studentClass, phone } = req.body;
    
    const result = await pool.query(
      'INSERT INTO students (student_code, full_name, class, phone) VALUES ($1, $2, $3, $4) RETURNING *',
      [student_code, full_name, studentClass, phone]
    );
    
    res.json({ message: 'Ученик создан', student: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить всех родителей
app.get('/api/parents', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parents ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить связи родитель-ученик
app.get('/api/parent-student', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ps.*, p.full_name as parent_name, s.full_name as student_name
      FROM parent_student ps
      JOIN parents p ON ps.parent_id = p.id
      JOIN students s ON ps.student_id = s.id
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Аутентификация администратора
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const admin = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const token = jwt.sign(
      { userId: admin.id, userType: 'admin' }, 
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({ 
      message: 'Успешный вход', 
      token,
      user: { id: admin.id, username: admin.username, full_name: admin.full_name }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Просто проверяем подключение, не создаем таблицы
  await checkDatabaseConnection();
});
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// ==================== MIDDLEWARE ====================
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.use(cors({
  origin: [
    'https://site-food-accounting-frontend.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());

// ==================== БАЗА ДАННЫХ ====================

console.log('🔧 Проверка переменных окружения...');

let poolConfig;

if (process.env.DB_HOST) {
  poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
  };
  console.log('🎯 Используем внешнюю БД');
} else {
  poolConfig = {
    host: 'localhost',
    port: 3306,
    database: 'food_accounting_db',
    user: 'root',
    password: 'password',
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
  };
  console.log('🎯 Используем локальную БД');
}

const pool = mysql.createPool(poolConfig);

// Создаем таблицы если их нет
async function initializeDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Создаем таблицу admin
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        password VARCHAR(100) NOT NULL
      )
    `);

    // Создаем таблицу students
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        student_id INT UNIQUE,
        balance DECIMAL(10,2) DEFAULT 0.00
      )
    `);

    // Создаем таблицу payments
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        payment_date DATE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT NOT NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP NULL,
        deleted_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INT
      )
    `);

    console.log('✅ Таблицы созданы/проверены');
    
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error);
  } finally {
    if (connection) connection.release();
  }
}

// Запускаем инициализацию
setTimeout(async () => {
  try {
    await initializeDatabase();
    console.log('✅ Инициализация БД завершена');
  } catch (error) {
    console.error('❌ Ошибка при инициализации:', error.message);
  }
}, 1000);

// ==================== ROUTES ====================

// Удалить платеж
app.delete('/api/payments/:id', async (req, res) => {
  let connection;
  try {
    const paymentId = req.params.id;
    const token = req.headers.authorization;
    
    console.log('🗑️ Попытка удаления платежа:', paymentId);
    
    if (!token || !token.includes('admin-token')) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    connection = await pool.getConnection();
    
    // Проверяем существование платежа
    const [paymentRows] = await connection.execute(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );

    if (paymentRows.length === 0) {
      return res.status(404).json({ error: 'Платеж не найден' });
    }

    await connection.execute(
      `UPDATE payments SET is_deleted = TRUE WHERE id = ?`,
      [paymentId]
    );

    console.log('✅ Платеж помечен как удаленный:', paymentId);
    res.json({ 
      message: 'Платеж помечен как удаленный',
      success: true 
    });
  } catch (error) {
    console.error('❌ Ошибка удаления платежа:', error);
    res.status(500).json({ 
      error: 'Ошибка при удалении платежа',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Восстановить платеж
app.post('/api/payments/:id/restore', async (req, res) => {
  let connection;
  try {
    const paymentId = req.params.id;
    const token = req.headers.authorization;
    
    console.log('↩️ Попытка восстановления платежа:', paymentId);
    
    if (!token || !token.includes('admin-token')) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    connection = await pool.getConnection();
    
    // Проверяем существование платежа
    const [paymentRows] = await connection.execute(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );

    if (paymentRows.length === 0) {
      return res.status(404).json({ error: 'Платеж не найден' });
    }

    // Восстанавливаем запись
    await connection.execute(
      `UPDATE payments SET is_deleted = FALSE WHERE id = ?`,
      [paymentId]
    );

    console.log('✅ Платеж восстановлен:', paymentId);
    res.json({ 
      message: 'Платеж восстановлен',
      success: true 
    });
  } catch (error) {
    console.error('❌ Ошибка восстановления платежа:', error);
    res.status(500).json({ 
      error: 'Ошибка при восстановлении платежа',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Backend работает!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

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

// Аутентификация администратора
app.post('/api/admin/login', async (req, res) => {
  let connection;
  try {
    const { full_name, password } = req.body;
    
    if (!full_name || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM admin WHERE full_name = ?',
      [full_name]
    );

    if (rows.length > 0) {
      const admin = rows[0];
      
      if (password === admin.password) {
        return res.json({
          message: 'Успешный вход',
          token: 'admin-token-' + admin.id,
          user: {
            id: admin.id,
            full_name: admin.full_name,
            role: 'admin'
          }
        });
      }
    }

    res.status(401).json({ error: 'Неверные учетные данные' });
    
  } catch (error) {
    console.error('💥 Ошибка при входе:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Упрощенный вход по ID студента
app.get('/api/student/login/:studentId', async (req, res) => {
  let connection;
  try {
    const studentId = req.params.studentId;

    connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT s.*,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id AND is_deleted = FALSE) as balance
      FROM students s 
      WHERE s.student_id = ?
    `, [studentId]);

    if (rows.length > 0) {
      const student = rows[0];
      
      return res.json({
        message: 'Успешный вход',
        user: {
          id: student.id,
          full_name: student.full_name,
          student_id: student.student_id,
          balance: parseFloat(student.balance) || 0,
          role: 'user'
        },
        token: 'user-token-' + student.id
      });
    } else {
      return res.status(404).json({ error: 'Ученик с таким ID не найден' });
    }
    
  } catch (error) {
    console.error('💥 Ошибка при входе:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Получить всех студентов (для админа)
app.get('/api/students', async (req, res) => {
  let connection;
  try {
    const token = req.headers.authorization;
    
    if (!token || !token.includes('admin-token')) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT s.*,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id AND is_deleted = FALSE) as balance
      FROM students s 
      ORDER BY s.full_name
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('❌ Ошибка загрузки учеников:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Получить платежи студента
app.get('/api/students/:id/payments', async (req, res) => {
  let connection;
  try {
    const studentId = req.params.id;
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT *, 
       CASE WHEN is_deleted = TRUE THEN CONCAT(description, ' (УДАЛЕНО)') ELSE description END as display_description
       FROM payments WHERE student_id = ? 
       ORDER BY payment_date DESC, created_at DESC`,
      [studentId]
    );

    res.json(rows);
  } catch (error) {
    console.error('❌ Ошибка загрузки платежей:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Добавить платеж (только для администратора)
app.post('/api/payments', async (req, res) => {
  let connection;
  try {
    const token = req.headers.authorization;
    
    if (!token || !token.includes('admin-token')) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { student_id, payment_date, amount, description } = req.body;
    
    if (!student_id || !amount || !description) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    connection = await pool.getConnection();
    const [result] = await connection.execute(
      `INSERT INTO payments (student_id, payment_date, amount, description, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [student_id, payment_date, amount, description, 1]
    );

    // Получаем добавленную запись
    const [rows] = await connection.execute(
      'SELECT * FROM payments WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('❌ Ошибка добавления платежа:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Удалить платеж
app.delete('/api/payments/:id', async (req, res) => {
  let connection;
  try {
    const paymentId = req.params.id;
    const token = req.headers.authorization;
    
    console.log('🗑️ Попытка удаления платежа:', paymentId);
    
    if (!token || !token.includes('admin-token')) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    connection = await pool.getConnection();
    
    // Проверяем существование платежа
    const [paymentRows] = await connection.execute(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );

    if (paymentRows.length === 0) {
      return res.status(404).json({ error: 'Платеж не найден' });
    }

    // Помечаем запись как удаленную
    await connection.execute(
      `UPDATE payments 
       SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = 1 
       WHERE id = ?`,
      [paymentId]
    );

    console.log('✅ Платеж помечен как удаленный:', paymentId);
    res.json({ 
      message: 'Платеж помечен как удаленный',
      success: true 
    });
  } catch (error) {
    console.error('❌ Ошибка удаления платежа:', error);
    res.status(500).json({ 
      error: 'Ошибка при удалении платежа',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Восстановить платеж
app.post('/api/payments/:id/restore', async (req, res) => {
  let connection;
  try {
    const paymentId = req.params.id;
    const token = req.headers.authorization;
    
    console.log('↩️ Попытка восстановления платежа:', paymentId);
    
    if (!token || !token.includes('admin-token')) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    connection = await pool.getConnection();
    
    // Проверяем существование платежа
    const [paymentRows] = await connection.execute(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );

    if (paymentRows.length === 0) {
      return res.status(404).json({ error: 'Платеж не найден' });
    }

    // Восстанавливаем запись
    await connection.execute(
      `UPDATE payments 
       SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL 
       WHERE id = ?`,
      [paymentId]
    );

    console.log('✅ Платеж восстановлен:', paymentId);
    res.json({ 
      message: 'Платеж восстановлен',
      success: true 
    });
  } catch (error) {
    console.error('❌ Ошибка восстановления платежа:', error);
    res.status(500).json({ 
      error: 'Ошибка при восстановлении платежа',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Отладочный endpoint
app.get('/api/debug/connection', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [dbInfo] = await connection.execute('SELECT NOW() as time, VERSION() as version');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME as table_name
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [process.env.DB_NAME || 'u2765862_food_accounting']);
    
    connection.release();
    
    res.json({
      status: 'connected',
      database_time: dbInfo[0].time,
      version: dbInfo[0].version,
      tables: tables.map(t => t.table_name),
      environment: process.env.NODE_ENV
    });
    
  } catch (error) {
    if (connection) connection.release();
    res.status(500).json({
      status: 'disconnected',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});
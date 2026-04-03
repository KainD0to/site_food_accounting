import express from 'express'; // Фреймворк для создания сервера
import mysql from 'mysql2/promise'; // Драйвер для работы с MySQL (promise версия)
import cors from 'cors'; // Защита от CORS ошибок при запросах с разных доменов
import helmet from 'helmet'; // Набор middleware для безопасности HTTP заголовков
import rateLimit from 'express-rate-limit'; // Ограничивает количество запросов от одного IP
import dotenv from 'dotenv'; // Загружает переменные окружения из .env файла
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config(); // Активируем загрузку .env файла

const app = express(); // Создаем экземпляр приложения
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
};

// ==================== CORS ====================
// CORS настройки - разрешаем запросы только с указанных адресов
app.use(cors({
  origin: [
    'https://site-food-accounting-frontend.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true, // Разрешаем передачу куки и заголовков авторизации
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Явно обрабатываем OPTIONS для всех routes
app.options('*', cors());

app.use(helmet());
app.use(express.json({
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Временное окно - 15 минут (миллисекунды)
  max: 1000, // Максимум запросов за окно с одного IP
  message: { // Сообщение при превышении лимита
    error: 'Слишком много запросов, попробуйте позже'
  }
});
app.use(limiter); // Применяем ограничитель ко всем запросам

// ==================== БАЗА ДАННЫХ ====================

console.log('Проверка переменных окружения...');

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
  console.log('Используем внешнюю БД');
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
  console.log('Используем локальную БД');
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
        password_hash VARCHAR(255) NOT NULL
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

    console.log('Таблицы созданы/проверены');
    
  } catch (error) {
    console.error('Ошибка инициализации БД:', error);
  } finally {
    if (connection) connection.release();
  }
}

// Запускаем инициализацию
setTimeout(async () => {
  try {
    await initializeDatabase();
    console.log('Инициализация БД завершена');
  } catch (error) {
    console.error('Ошибка при инициализации:', error.message);
  }
}, 1000);

// ==================== ROUTES ====================

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend работает!',
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
      
      // Проверяем хэш пароля
      const isValidPassword = await bcrypt.compare(password, admin.password_hash);
      
      if (isValidPassword) {
        // Генерируем JWT токен (лучше) или случайный токен
        const token = jwt.sign(
          { id: admin.id, role: 'admin' },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );
        
        return res.json({
          message: 'Успешный вход',
          token: token,
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
    console.error('Ошибка при входе:', error);
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
    console.error('Ошибка при входе:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Получить всех студентов (для админа)
app.get('/api/students', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    // Убираем проверку token - middleware уже сделал
    connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT s.*,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id AND is_deleted = FALSE) as balance
      FROM students s 
      ORDER BY s.full_name
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Ошибка загрузки учеников:', error);
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
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    
    connection = await pool.getConnection();
    
    // Админ видит все
    if (decoded.role === 'admin') {
      const [rows] = await connection.execute(
        `SELECT * FROM payments WHERE student_id = ? AND is_deleted = FALSE`,
        [studentId]
      );
      return res.json(rows);
    }
    
    // Студент видит только свои
    if (decoded.role === 'user') {
      // Нужно получить student_id из токена или проверить соответствие
      const [student] = await connection.execute(
        'SELECT id FROM students WHERE student_id = ?',
        [decoded.student_id]
      );
      
      if (student[0]?.id != studentId) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }
      
      const [rows] = await connection.execute(
        `SELECT * FROM payments WHERE student_id = ? AND is_deleted = FALSE`,
        [studentId]
      );
      return res.json(rows);
    }
    
    res.status(403).json({ error: 'Недостаточно прав' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Добавить платеж (только для администратора)
app.post('/api/payments', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    const { student_id, payment_date, amount, description } = req.body;
    
    console.log('Данные для добавления платежа:', {
      student_id, payment_date, amount, description
    });
    
    // Валидация
    if (!student_id || amount === undefined || amount === null || !description) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    // Преобразуем amount в число (может быть отрицательным)
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber)) {
      return res.status(400).json({ error: 'Сумма должна быть числом' });
    }

    // Конвертируем дату из дд-мм-гггг в гггг-мм-дд для MySQL
    const convertDateToMySQL = (dateStr) => {
      // Если дата не указана, используем сегодняшнюю
      if (!dateStr) {
        return new Date().toISOString().split('T')[0]; // гггг-мм-дд
      }
      
      // Если дата уже в формате гггг-мм-дд, оставляем как есть
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      
      // Конвертируем из дд-мм-гггг в гггг-мм-дд
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      
      // Если формат непонятный, используем текущую дату
      console.warn('Неизвестный формат даты, используем текущую:', dateStr);
      return new Date().toISOString().split('T')[0];
    };

    const mysqlDate = convertDateToMySQL(payment_date);
    console.log('Конвертированная дата:', payment_date, '->', mysqlDate);

    connection = await pool.getConnection();
    
    // Проверяем существование студента
    const [studentRows] = await connection.execute(
      'SELECT id FROM students WHERE id = ?',
      [student_id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Студент не найден' });
    }

    // Добавляем платеж (разрешаем отрицательные значения)
    const [result] = await connection.execute(
      `INSERT INTO payments (student_id, payment_date, amount, description, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [student_id, mysqlDate, amountNumber, description, 1]
    );

    // Получаем добавленную запись
    const [rows] = await connection.execute(
      'SELECT * FROM payments WHERE id = ?',
      [result.insertId]
    );

    console.log('Платеж добавлен:', rows[0]);
    res.status(201).json(rows[0]);
    
  } catch (error) {
    console.error('Ошибка добавления платежа:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage
    });
    
    res.status(500).json({ 
      error: 'Ошибка при добавлении платежа',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Удалить платеж
app.delete('/api/payments/:id', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    const paymentId = req.params.id;
    
    console.log('Попытка удаления платежа:', paymentId);

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

    console.log('Платеж помечен как удаленный:', paymentId);
    res.json({ 
      message: 'Платеж помечен как удаленный',
      success: true 
    });
  } catch (error) {
    console.error('Ошибка удаления платежа:', error);
    res.status(500).json({ 
      error: 'Ошибка при удалении платежа',
      details: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Восстановить платеж
app.post('/api/payments/:id/restore', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    const paymentId = req.params.id;
    
    console.log('Попытка восстановления платежа:', paymentId);

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

    console.log('Платеж восстановлен:', paymentId);
    res.json({ 
      message: 'Платеж восстановлен',
      success: true 
    });
  } catch (error) {
    console.error('Ошибка восстановления платежа:', error);
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
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});

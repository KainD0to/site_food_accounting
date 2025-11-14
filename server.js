import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const app = express();

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
    'http://localhost:3000',
    'http://localhost:5173' // Vite dev server
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
console.log('🚪 DB_PORT:', process.env.DB_PORT || 'не указан');

let poolConfig;

if (process.env.DATABASE_URL) {
  // Используем DATABASE_URL для MySQL (продакшен)
  poolConfig = {
    uri: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  };
  console.log('🎯 Используем DATABASE_URL для MySQL (продакшен)');
} else if (process.env.DB_HOST && process.env.NODE_ENV === 'production') {
  // Используем отдельные параметры для MySQL (продакшен)
  poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    },
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  };
  console.log('🎯 Используем отдельные параметры БД (продакшен MySQL)');
} else {
  // Локальная разработка
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'food_accounting_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    // Без SSL для локальной разработки
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  };
  console.log('🎯 Используем локальную БД MySQL (разработка)');
  console.log('📋 Локальные настройки:', {
    host: poolConfig.host,
    port: poolConfig.port,
    database: poolConfig.database,
    user: poolConfig.user,
    hasPassword: !!poolConfig.password
  });
}

// Создаем пул соединений MySQL
const pool = mysql.createPool(poolConfig);

// Тестируем подключение при старте
async function testDatabaseConnection() {
  let connection;
  try {
    console.log('🔄 Тестируем подключение к БД MySQL...');
    connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT NOW() as current_time, VERSION() as db_version');
    console.log('✅ Подключение к БД MySQL УСПЕШНО');
    console.log('⏰ Время БД:', rows[0].current_time);
    console.log('📊 Версия:', rows[0].db_version);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к БД MySQL:', error.message);
    console.log('🔧 Конфиг подключения:', {
      host: poolConfig.host,
      database: poolConfig.database,
      user: poolConfig.user,
      port: poolConfig.port,
      hasPassword: !!poolConfig.password
    });
    return false;
  } finally {
    if (connection) connection.release();
  }
}

// Создаем таблицы если их нет
async function initializeDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Проверяем существование таблиц
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME IN ('admin', 'parents', 'students', 'payments')
    `, [process.env.DB_NAME || 'food_accounting_db']);
    
    console.log(`📊 Найдено таблиц: ${tables.length}`);
    
    if (tables.length === 0) {
      console.log('🗃️ Создаем таблицы MySQL...');
      
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS admin (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL,
          password VARCHAR(100) NOT NULL
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS parents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL,
          password VARCHAR(100) NOT NULL,
          parent__id INT,
          usertype VARCHAR(50)
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS students (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL,
          student_id INT,
          balance FLOAT,
          parent_id INT
        )
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS payments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          student_id INT,
          payment_date DATE NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          description TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INT
        )
      `);

      // Добавляем тестовые данные для локальной разработки
      if (process.env.NODE_ENV !== 'production') {
        console.log('🧪 Добавляем тестовые данные...');
        
        // Администратор
        await connection.execute(`
          INSERT IGNORE INTO admin (id, full_name, password) 
          VALUES (1, 'Тест админ', '1357911Dan')
        `);
        
        // Родитель
        await connection.execute(`
          INSERT IGNORE INTO parents (id, full_name, password, parent__id, usertype) 
          VALUES (1, 'Иванов Иван Иванович', '123', 1001, 'parent')
        `);
        
        // Студенты
        await connection.execute(`
          INSERT IGNORE INTO students (id, full_name, student_id, balance, parent_id) 
          VALUES 
          (1, 'Иванов Алексей', 1001, 1500.00, 1),
          (2, 'Петрова Мария', 1002, 800.50, 1),
          (3, 'Сидоров Дмитрий', 1003, 1200.00, 1)
        `);
        
        // Платежи
        await connection.execute(`
          INSERT IGNORE INTO payments (id, student_id, payment_date, amount, description, created_by) 
          VALUES 
          (1, 1, '2024-01-15', 500.00, 'Оплата питания за январь', 1),
          (2, 1, '2024-02-10', 1000.00, 'Оплата питания за февраль', 1),
          (3, 2, '2024-01-20', 800.50, 'Оплата питания', 1),
          (4, 3, '2024-02-01', 1200.00, 'Оплата питания за февраль', 1)
        `);
        
        console.log('✅ Тестовые данные добавлены');
      }

      console.log('✅ Таблицы MySQL созданы и инициализированы');
    } else {
      console.log('✅ Таблицы уже существуют');
    }
    
  } catch (error) {
    console.error('❌ Ошибка инициализации БД MySQL:', error);
  } finally {
    if (connection) connection.release();
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

// Health check
app.get('/api/health', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
    
    res.json({ 
      status: 'OK', 
      database: 'connected',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (connection) connection.release();
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
  
  let connection;
  try {
    console.log('📨 Тело запроса:', req.body);
    
    const { full_name, password } = req.body;
    
    if (!full_name || !password) {
      console.log('❌ Отсутствуют логин или пароль');
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    console.log(`🔐 Вход: ${full_name}, Пароль: ${password ? '***' : 'отсутствует'}`);

    // ТЕСТОВЫЙ РЕЖИМ - всегда возвращаем успех для тестовых данных
    if (full_name === 'Тест админ' && password === '1357911Dan') {
      console.log('✅ Успешный вход (тестовые данные)');
      return res.json({
        message: 'Успешный вход',
        token: 'admin-token-1',
        user: {
          id: 1,
          full_name: 'Тест админ',
          role: 'admin'
        }
      });
    }

    // Пробуем реальную БД если есть подключение
    console.log('🔍 Поиск в базе данных...');
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM admin WHERE full_name = ?',
      [full_name]
    );

    console.log(`📊 Найдено записей: ${rows.length}`);

    if (rows.length > 0) {
      const admin = rows[0];
      console.log('👤 Найден администратор:', admin);
      
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
        console.log('❌ Неверный пароль');
      }
    } else {
      console.log('❌ Администратор не найден');
    }

    console.log('❌ Неверные учетные данные');
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

// Аналогично для родителя
app.post('/api/parent/login', async (req, res) => {
  console.log('🔑 ========== ПОПЫТКА ВХОДА РОДИТЕЛЯ ==========');
  
  let connection;
  try {
    console.log('📨 Тело запроса:', req.body);
    
    const { full_name, password } = req.body;
    
    if (!full_name || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    console.log(`🔐 Вход: ${full_name}`);

    // ТЕСТОВЫЙ РЕЖИМ
    if (full_name === 'Иванов Иван Иванович' && password === '123') {
      console.log('✅ Успешный вход (тестовые данные)');
      return res.json({
        message: 'Успешный вход',
        token: 'parent-token-1',
        user: {
          id: 1,
          full_name: 'Иванов Иван Иванович',
          role: 'parent'
        }
      });
    }

    console.log('🔍 Поиск в базе данных...');
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM parents WHERE full_name = ?',
      [full_name]
    );

    console.log(`📊 Найдено записей: ${rows.length}`);

    if (rows.length > 0) {
      const parent = rows[0];
      
      if (password === parent.password) {
        return res.json({
          message: 'Успешный вход',
          token: 'parent-token-' + parent.id,
          user: {
            id: parent.id,
            full_name: parent.full_name,
            role: 'parent'
          }
        });
      }
    }

    console.log('❌ Неверные учетные данные');
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

// Получить всех студентов (только для админа)
app.get('/api/students', async (req, res) => {
  let connection;
  try {
    const token = req.headers.authorization;
    console.log('🔐 Token для студентов:', token);
    
    if (!token || !token.includes('admin-token')) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    console.log('📋 Запрос всех студентов...');
    
    connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT s.*, p.full_name as parent_name,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id) as balance
      FROM students s 
      LEFT JOIN parents p ON s.parent_id = p.id 
      ORDER BY s.full_name
    `);
    
    console.log(`✅ Найдено студентов: ${rows.length}`);
    res.json(rows);
  } catch (error) {
    console.error('❌ Ошибка загрузки студентов:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Получить студентов родителя
app.get('/api/parent/students', async (req, res) => {
  let connection;
  try {
    const token = req.headers.authorization;
    console.log('🔐 Token для родителя:', token);
    
    if (!token || !token.includes('parent-token')) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Извлекаем parent_id из токена (parent-token-1 → 1)
    const parentId = parseInt(token.split('-').pop());
    console.log(`👨‍👦 Запрос студентов для родителя ID: ${parentId}`);
    
    connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT s.*,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id) as balance
      FROM students s 
      WHERE s.parent_id = ?
      ORDER BY s.full_name
    `, [parentId]);
    
    console.log(`✅ Найдено студентов у родителя: ${rows.length}`);
    res.json(rows);
  } catch (error) {
    console.error('❌ Ошибка загрузки студентов родителя:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Упрощенный вход по ID студента (без пароля)
app.get('/api/student/login/:studentId', async (req, res) => {
  console.log('🔑 ========== ПОПЫТКА ВХОДА ПО ID СТУДЕНТА ==========');
  
  let connection;
  try {
    const studentId = req.params.studentId;
    console.log('🎯 Поиск студента с ID:', studentId);

    connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT s.*, p.full_name as parent_name,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id) as balance
      FROM students s 
      LEFT JOIN parents p ON s.parent_id = p.id 
      WHERE s.student_id = ?
    `, [studentId]);

    console.log(`📊 Найдено студентов: ${rows.length}`);

    if (rows.length > 0) {
      const student = rows[0];
      console.log('✅ Студент найден:', student.full_name);
      
      return res.json({
        message: 'Успешный вход',
        user: {
          id: student.id,
          full_name: student.full_name,
          student_id: student.student_id,
          balance: parseFloat(student.balance) || 0,
          parent_name: student.parent_name,
          role: 'user'
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
    
    console.log(`💰 Запрос платежей студента ID: ${studentId}`);
    
    connection = await pool.getConnection();
    
    // Проверка прав доступа для родителя
    if (token && token.includes('parent-token')) {
      const parentId = parseInt(token.split('-').pop());
      const [studentCheck] = await connection.execute(
        'SELECT * FROM students WHERE id = ? AND parent_id = ?',
        [studentId, parentId]
      );
      
      if (studentCheck.length === 0) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }
    }

    const [rows] = await connection.execute(
      'SELECT * FROM payments WHERE student_id = ? ORDER BY payment_date DESC, created_at DESC',
      [studentId]
    );

    console.log(`✅ Найдено платежей: ${rows.length}`);
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
    
    console.log('➕ Добавление платежа:', { student_id, amount, description });

    // Извлекаем admin_id из токена (admin-token-1 → 1)
    const adminId = parseInt(token.split('-').pop());

    connection = await pool.getConnection();
    const [result] = await connection.execute(
      `INSERT INTO payments (student_id, payment_date, amount, description, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [student_id, payment_date, amount, description, adminId]
    );

    console.log('✅ Платеж добавлен, ID:', result.insertId);
    
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

// Получить баланс студента
app.get('/api/students/:id/balance', async (req, res) => {
  let connection;
  try {
    const studentId = req.params.id;
    const token = req.headers.authorization;
    
    connection = await pool.getConnection();
    
    // Проверка прав доступа для родителя
    if (token && token.includes('parent-token')) {
      const parentId = parseInt(token.split('-').pop());
      const [studentCheck] = await connection.execute(
        'SELECT * FROM students WHERE id = ? AND parent_id = ?',
        [studentId, parentId]
      );
      
      if (studentCheck.length === 0) {
        return res.status(403).json({ error: 'Доступ запрещен' });
      }
    }

    const [rows] = await connection.execute(
      'SELECT COALESCE(SUM(amount), 0) as balance FROM payments WHERE student_id = ?',
      [studentId]
    );

    res.json({ balance: parseFloat(rows[0].balance) });
  } catch (error) {
    console.error('❌ Ошибка получения баланса:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Проверка данных в БД
app.get('/api/debug/connection', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [dbInfo] = await connection.execute('SELECT NOW() as time, VERSION() as version');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME as table_name
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [process.env.DB_NAME || 'u2765882_food_accounting']);
    
    connection.release();
    
    res.json({
      status: 'connected',
      database_time: dbInfo[0].time,
      version: dbInfo[0].version,
      tables: tables.map(t => t.table_name),
      environment: {
        node_env: process.env.NODE_ENV,
        has_database_url: !!process.env.DATABASE_URL,
        db_host: process.env.DB_HOST,
        db_name: process.env.DB_NAME,
        db_type: 'MySQL'
      }
    });
    
  } catch (error) {
    if (connection) connection.release();
    res.status(500).json({
      status: 'disconnected',
      error: error.message,
      environment: {
        node_env: process.env.NODE_ENV,
        has_database_url: !!process.env.DATABASE_URL,
        db_host: process.env.DB_HOST,
        db_name: process.env.DB_NAME,
        db_type: 'MySQL'
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
  console.log(`🗄️  DB Type: MySQL`);
  console.log('='.repeat(50));
  console.log('✅ Тестовые данные для входа:');
  console.log('   Админ: Тест админ / 1357911Dan');
  console.log('   Родитель: Иванов Иван Иванович / 123');
  console.log('='.repeat(50));
});
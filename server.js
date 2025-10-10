import express from 'express';
import pkg from 'pg';
import cors from 'cors';
//библиотеки защиты
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

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

// Проверяем переменные окружения
console.log('🔐 DB_HOST:', process.env.DB_HOST);
console.log('🌐 NODE_ENV:', process.env.NODE_ENV);
console.log('🔗 FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL ? 'есть' : 'нет');

// Подключение к PostgreSQL - УПРОЩЕННАЯ ВЕРСИЯ
let poolConfig;

if (process.env.DATABASE_URL) {
  // Для Render с DATABASE_URL
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };
  console.log('🔧 Используем DATABASE_URL от Render');
} else if (process.env.DB_HOST) {
  // Для Render с отдельными параметрами
  poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
  console.log('🔧 Используем отдельные параметры БД');
} else {
  // Для локальной разработки
  poolConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'food-accounting-db', 
    password: process.env.DB_PASSWORD,
    port: 5432,
  };
  console.log('🔧 Используем локальную БД');
}

const pool = new Pool(poolConfig);

// Проверка подключения при старте
pool.on('connect', () => {
  console.log('✅ Подключение к PostgreSQL установлено');
});

pool.on('error', (err) => {
  console.error('❌ Ошибка PostgreSQL:', err);
});

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

// Аутентификация администратора - УПРОЩЕННАЯ ВЕРСИЯ
// Аутентификация администратора - с улучшенной обработкой ошибок
app.post('/api/admin/login', async (req, res) => {
  console.log('🔑 ========== ПОПЫТКА ВХОДА АДМИНА ==========');
  
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
    if (pool) {
      console.log('🔍 Поиск в базе данных...');
      const result = await pool.query(
        'SELECT * FROM admin WHERE full_name = $1',
        [full_name]
      );

      console.log(`📊 Найдено записей: ${result.rows.length}`);

      if (result.rows.length > 0) {
        const admin = result.rows[0];
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
    } else {
      console.log('❌ База данных недоступна');
    }

    console.log('❌ Неверные учетные данные');
    res.status(401).json({ error: 'Неверные учетные данные' });
    
  } catch (error) {
    console.error('💥 Ошибка при входе:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  }
});

// Аналогично для родителя
app.post('/api/parent/login', async (req, res) => {
  console.log('🔑 ========== ПОПЫТКА ВХОДА РОДИТЕЛЯ ==========');
  
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

    if (pool) {
      console.log('🔍 Поиск в базе данных...');
      const result = await pool.query(
        'SELECT * FROM parents WHERE full_name = $1',
        [full_name]
      );

      console.log(`📊 Найдено записей: ${result.rows.length}`);

      if (result.rows.length > 0) {
        const parent = result.rows[0];
        
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
    }

    console.log('❌ Неверные учетные данные');
    res.status(401).json({ error: 'Неверные учетные данные' });
    
  } catch (error) {
    console.error('💥 Ошибка при входе:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: error.message 
    });
  }
});

// Остальные endpoints пока закомментируем для теста
/*
app.get('/api/students', async (req, res) => {
  // ... ваш код
});

app.get('/api/parent/students', async (req, res) => {
  // ... ваш код  
});
*/

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL ? 'есть' : 'нет'}`);
  console.log('='.repeat(50));
  console.log('✅ Тестовые данные для входа:');
  console.log('   Админ: Тест админ / 1357911Dan');
  console.log('   Родитель: Иванов Иван Иванович / 123');
  console.log('='.repeat(50));
});
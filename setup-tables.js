import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'dpg-d3jn9695pdvs73eiqfvg-a.oregon-postgres.render.com',
  port: 5432,
  database: 'food_accounting_db',
  user: 'food_accounting_db_user',
  password: 'N9KxL1Bmgy7jbPGDiksWNEf0rs3EhJpO',
  ssl: { rejectUnauthorized: false }
});

async function setupTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Подключаемся к БД...');
    
    // Проверяем подключение
    const result = await client.query('SELECT NOW() as time');
    console.log('✅ Подключение успешно. Время БД:', result.rows[0].time);
    
    // Создаем таблицы
    console.log('🗃️ Создаем таблицы...');
    
    const tables = [
      `CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        password VARCHAR(100) NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS parents (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        password VARCHAR(100) NOT NULL,
        parent__id INTEGER,
        usertype VARCHAR
      )`,
      
      `CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        student_id INTEGER,
        balance REAL,
        parent_id INTEGER
      )`,
      
      `CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER,
        payment_date DATE NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
      )`
    ];
    
    for (const tableSql of tables) {
      await client.query(tableSql);
    }
    console.log('✅ Все таблицы созданы');
    
    // Функция
    await client.query(`
      CREATE OR REPLACE FUNCTION get_student_balance(student_id integer, target_date date DEFAULT CURRENT_DATE)
      RETURNS numeric AS $$
      SELECT COALESCE(SUM(amount), 0)
      FROM payments 
      WHERE student_id = $1 AND payment_date <= $2;
      $$ LANGUAGE sql
    `);
    console.log('✅ Функция создана');
    
    // Данные
    console.log('📥 Добавляем данные...');
    await client.query(`
      INSERT INTO admin (id, full_name, password) VALUES 
      (1, 'Тест админ', '1357911Dan')
      ON CONFLICT (id) DO NOTHING
    `);
    
    await client.query(`
      INSERT INTO parents (id, full_name, password, parent__id, usertype) VALUES 
      (1, 'Иванов Иван Иванович', '123', 1, 'parent'),
      (2, 'Петров Пётр Петрович', '123', 2, 'parent'),
      (3, 'Данилов Данил Данилович', '123', 3, 'parent')
      ON CONFLICT (id) DO NOTHING
    `);
    
    await client.query(`
      INSERT INTO students (id, full_name, student_id, balance, parent_id) VALUES 
      (1, 'Иванов Илья Иванович', 1, 0, 1),
      (2, 'Петров Илья Петрович', 2, 0, 2),
      (3, 'Данилов Илья Данилович', 3, 0, 3)
      ON CONFLICT (id) DO NOTHING
    `);
    
    await client.query(`
      INSERT INTO payments (id, student_id, payment_date, amount, description, created_at, created_by) VALUES 
      (1, 1, '2025-10-08', 100.00, 'афа12040 _12!!!', '2025-10-09 00:59:51.236082', 1),
      (2, 2, '2025-10-09', -100.00, 'test 2 !$@#$', '2025-10-09 18:23:12.660898', 1)
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('🎉 База данных полностью настроена!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

setupTables();
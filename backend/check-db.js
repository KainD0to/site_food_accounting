import pkg from 'pg';
const { Pool } = pkg;

// Попробуем разные настройки подключения
const configs = [
  {
    name: 'Default PostgreSQL',
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '', // попробуем пустой пароль
    port: 5432,
  },
  {
    name: 'Food Accounting DB', 
    user: 'postgres',
    host: 'localhost',
    database: 'food-accounting-db',
    password: '',
    port: 5432,
  }
];

async function testConnection(config) {
  const pool = new Pool(config);
  
  try {
    console.log(`🔍 Проверяем: ${config.name}...`);
    const result = await pool.query('SELECT current_database(), version()');
    console.log(`✅ Успех! База: ${result.rows[0].current_database}`);
    
    // Проверим таблицы
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`📊 Таблицы: ${tables.rows.map(row => row.table_name).join(', ') || 'нет таблиц'}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Проверка подключения к PostgreSQL');
  console.log('='.repeat(50));
  
  for (const config of configs) {
    await testConnection(config);
    console.log('---');
  }
}

main();
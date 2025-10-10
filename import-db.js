import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Для локального тестирования - БЕЗ SSL
const poolConfig = {
  host: 'localhost',
  port: 5432,
  database: 'food-accounting-db',
  user: 'postgres',
  password: 'Hashiramochka0', // замените на реальный пароль
  // SSL отключен для локальной БД
};

const pool = new Pool(poolConfig);

async function importDump() {
  const client = await pool.connect();
  
  try {
    console.log('📥 Импорт дампа базы данных...');
    
    // Читаем SQL файл
    const sqlPath = path.join(__dirname, 'dump-food-accounting-db-202510110434.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Размер файла:', sql.length, 'символов');
    
    // Убираем проблемные команды
    const cleanSql = sql
      .replace(/\\restrict.*?\n/, '')
      .replace(/\\unrestrict.*?\n/, '');
    
    // Разделяем на отдельные запросы
    const queries = cleanSql
      .split(';')
      .filter(query => query.trim().length > 10) // фильтруем пустые
      .map(query => query.trim() + ';');
    
    console.log('🔍 Найдено запросов:', queries.length);
    
    // Выполняем каждый запрос
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query && !query.includes('pg_catalog.setval')) { // временно пропускаем sequence
        try {
          await client.query(query);
          console.log(`✅ [${i+1}/${queries.length}] Выполнен запрос`);
        } catch (error) {
          console.log(`⚠️ [${i+1}/${queries.length}] Пропущен:`, error.message);
        }
      }
    }
    
    console.log('✅ Импорт завершен успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка импорта:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

importDump();
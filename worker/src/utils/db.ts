import pgPromise from 'pg-promise';
import env from '@/config/env.js';

const dbURL = env.DB_URL || '';

const pgp = pgPromise();
const db = pgp({
  connectionString: dbURL,
});

async function testConnection() {
  try {
    await db.one('SELECT 1');
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

testConnection();

export default db;

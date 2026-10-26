import pgPromise from 'pg-promise';
import env from '@/config/env.js';

const dbURL = env.DB_URL || '';

const pgp = pgPromise();
const db = pgp({
  connectionString: dbURL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
});

db.$pool.on('error', (error: Error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

export const closeDatabase = async (): Promise<void> => {
  await db.$pool.end();
};

async function testConnection() {
  try {
    await db.one('SELECT 1');
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

if (process.env.NODE_ENV !== 'test') {
  testConnection();
}

export default db;

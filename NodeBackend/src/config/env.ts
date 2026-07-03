import dotenv from 'dotenv';
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: envFile });

// Construct DB_URL from individual env vars if not provided
const dbUrl = process.env.DB_URL;

const env = {
  PORT: process.env.PORT || 3000,
  DB_URL: dbUrl,
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  isProd: process.env.NODE_ENV === 'production',
};

export default env;

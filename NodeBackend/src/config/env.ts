import dotenv from 'dotenv';
import { resolve } from 'path';

const serviceDirectory = process.cwd();
const rootDirectory = resolve(serviceDirectory, '..');
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({
  path: [
    resolve(serviceDirectory, envFile),
    resolve(rootDirectory, envFile),
    resolve(rootDirectory, '.env'),
  ],
});

// Construct DB_URL from individual env vars if not provided
const dbUrl = process.env.DB_URL;
const rabbitMQUrl =
  process.env.RABBITMQ_URL ||
  (process.env.RABBITMQ_DEFAULT_USER && process.env.RABBITMQ_DEFAULT_PASS
    ? `amqp://${encodeURIComponent(process.env.RABBITMQ_DEFAULT_USER)}:${encodeURIComponent(process.env.RABBITMQ_DEFAULT_PASS)}@127.0.0.1:5672/${encodeURIComponent(process.env.RABBITMQ_DEFAULT_VHOST || 'dam')}`
    : '');

const env = {
  PORT: process.env.PORT || 3000,
  DB_URL: dbUrl,
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: Number(process.env.DB_PORT || 5432),
  DB_NAME: process.env.DB_NAME || process.env.POSTGRES_DB,
  DB_USER: process.env.DB_USER || process.env.POSTGRES_USER,
  DB_PASSWORD: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || '127.0.0.1',
  MINIO_PORT: Number(process.env.MINIO_PORT || 9000),
  MINIO_REGION: process.env.MINIO_REGION || 'us-east-1',
  MINIO_BUCKET: process.env.MINIO_BUCKET || 'dam-assets',
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER,
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD,
  MINIO_PUBLIC_URL: process.env.MINIO_PUBLIC_URL,
  RABBITMQ_URL: rabbitMQUrl,
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  isProd: process.env.NODE_ENV === 'production',
};

export default env;

import { CorsOptions } from 'cors';

const localOrigins = ['http://localhost:5173', 'http://localhost:4173', 'http://localhost'];
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const whitelist = new Set([...localOrigins, ...configuredOrigins]);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests without origin (Postman, mobile apps, server-to-server)
    if (!origin || whitelist.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

export default corsOptions;

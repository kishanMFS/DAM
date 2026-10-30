import { CorsOptions } from 'cors';

const configuredOrigins = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const isProduction = process.env.NODE_ENV === 'production';

const isLocalDevelopmentOrigin = (origin: string): boolean => {
  if (isProduction) return false;

  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
};

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Development allows HTTP loopback origins on any port. Production requires explicit origins.
    if (!origin || configuredOrigins.has(origin) || isLocalDevelopmentOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

export default corsOptions;

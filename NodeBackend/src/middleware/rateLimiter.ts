import rateLimit from 'express-rate-limit';
import env from '@/config/env.js';

const isProd = env.isProd;
let apiRateLimit = 100000;
let authRateLimit = 100000;
console.log(isProd);
if (isProd) {
  apiRateLimit = 100; // Max 100 requests per IP
  authRateLimit = 10; // Stricter limit for login endpoint
}

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: apiRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: authRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

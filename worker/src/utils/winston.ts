// const winston = require('winston');
import env from '@/config/env.js';
import { createLogger, format, transports } from 'winston';

const isProd = env.isProd;
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp, ...meta }) => {
  return `${timestamp} [${label}] ${level}: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta) : ''
  }`;
});

const logger = createLogger({
  format: combine(
    format.errors({ stack: true }),
    label({ label: 'Server Error!' }),
    timestamp(),
    myFormat,
  ),
  transports: [
    new transports.File({
      filename: 'error.log',
      level: 'error',
      format: format.json(),
    }),
    new transports.Http({
      level: 'warn',
      format: format.json(),
    }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (!isProd) {
  logger.add(
    new transports.Console({
      format: format.simple(),
    }),
  );
}

export default logger;

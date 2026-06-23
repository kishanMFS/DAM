import type { ErrorRequestHandler, RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';

// Middleware to handle unexpected requests
const unexpectedRequest: RequestHandler = (_req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({ message: 'Endpoint not found' });
};

// Middleware to log errors and add them to the request log
const addErrorToRequestLog: ErrorRequestHandler = (err, req, res, next) => {
  console.error(`Error occurred during request to ${req.method} ${req.url}:`, err);
  res.locals.err = err;
  next(err);
};

const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Global error handler caught an error:', err);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'An unexpected error occurred',
    error: err.message || 'No error message available',
  });
};

export default (): [RequestHandler, ErrorRequestHandler, ErrorRequestHandler] => [
  unexpectedRequest,
  addErrorToRequestLog,
  globalErrorHandler,
];

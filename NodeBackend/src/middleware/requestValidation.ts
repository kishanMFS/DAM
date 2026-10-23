import type { RequestHandler } from 'express';
import { validationResult } from 'express-validator';

export const validateRequest: RequestHandler = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    next();
    return;
  }

  res.status(400).json({
    success: false,
    message: 'Request validation failed',
    errors: errors.array({ onlyFirstError: true }).map((error) => {
      if (error.type === 'field') {
        return {
          location: error.location,
          field: error.path,
          message: error.msg,
        };
      }

      if (error.type === 'unknown_fields') {
        return {
          fields: error.fields.map(({ location, path }) => ({
            location,
            field: path,
          })),
          message: error.msg,
        };
      }

      return { message: error.msg };
    }),
  });
};

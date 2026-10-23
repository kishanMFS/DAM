import { body, param } from 'express-validator';

export const validateLogin = [
  body('email')
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .isEmail()
    .withMessage('A valid email is required'),
  body('password')
    .isString()
    .withMessage('Password must be a string')
    .bail()
    .notEmpty()
    .withMessage('Password is required'),
];

export const validatePresignedFiles = [
  body('files').isArray({ min: 1 }).withMessage('Files must be a non-empty array'),
  body('files.*').isObject({ strict: true }).withMessage('Each file must be an object'),
  body('files.*.fileName')
    .isString()
    .withMessage('File name must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('File name is required')
    .bail()
    .isLength({ max: 500 })
    .withMessage('File name must be 500 characters or fewer'),
  body('files.*.mimeType')
    .isString()
    .withMessage('MIME type must be a string')
    .bail()
    .isMimeType()
    .withMessage('A valid MIME type is required'),
];

export const validateAssetFiles = [
  body('files').isArray({ min: 1 }).withMessage('Files must be a non-empty array'),
  body('files.*').isObject({ strict: true }).withMessage('Each file must be an object'),
  body('files.*.objectName')
    .isString()
    .withMessage('Object name must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Object name is required')
    .bail()
    .isLength({ max: 1024 })
    .withMessage('Object name must be 1024 characters or fewer'),
  body('files.*.originalName')
    .isString()
    .withMessage('Original file name must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Original file name is required')
    .bail()
    .isLength({ max: 500 })
    .withMessage('Original file name must be 500 characters or fewer'),
  body('files.*.fileType')
    .isString()
    .withMessage('File type must be a string')
    .bail()
    .isMimeType()
    .withMessage('A valid MIME type is required'),
  body('files.*.size')
    .isFloat({ gt: 0 })
    .withMessage('File size must be a positive number')
    .bail()
    .toFloat(),
];

export const validateFileId = [
  param('fileId').isUUID().withMessage('File ID must be a valid UUID'),
];

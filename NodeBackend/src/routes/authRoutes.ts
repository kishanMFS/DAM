import express from 'express';
import type { Router } from 'express';
import { loginUser, logoutUser, verifyToken } from '@/controllers/authController.js';
import { validateRequest } from '@/middleware/requestValidation.js';
import { validateLogin } from '@/middleware/requestValidators.js';

const router: Router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and set the access-token cookie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Authenticated
 *       '401':
 *         description: Invalid credentials
 */
router.post('/login', validateLogin, validateRequest, loginUser);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out and clear the access-token cookie
 *     responses:
 *       '200':
 *         description: Logged out
 */
router.post('/logout', logoutUser);

/**
 * @swagger
 * /auth/verify:
 *   get:
 *     tags: [Auth]
 *     summary: Verify the access-token cookie
 *     responses:
 *       '200':
 *         description: Token is valid
 *       '401':
 *         description: Cookie is missing
 *       '403':
 *         description: Token is invalid
 */
router.get('/verify', verifyToken);

export default router;

import express from 'express';
import type { Router } from 'express';
import { loginUser, logoutUser, verifyToken } from '@/controllers/authController.js';
import { validateRequest } from '@/middleware/requestValidation.js';
import { validateLogin } from '@/middleware/requestValidators.js';

const router: Router = express.Router();

router.post('/login', validateLogin, validateRequest, loginUser);
router.post('/logout', logoutUser);
router.get('/verify', verifyToken);
// router.post('/refresh', refreshToken);
// router.get('/me', checkHealth);

export default router;

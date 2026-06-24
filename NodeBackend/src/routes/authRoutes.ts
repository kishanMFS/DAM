import express from 'express';
import type { Router } from 'express';
import { loginController, logoutUser, verifyToken } from '@/controllers/authController.js';

const router: Router = express.Router();

router.post('/login', loginController);
router.post('/logout', logoutUser);
router.post('/verify', verifyToken);
// router.post('/refresh', refreshToken);
// router.get('/me', checkHealth);

export default router;

import express from 'express';
import type { Router } from 'express';
import { loginUser, logoutUser, verifyToken } from '@/controllers/authController.js';

const router: Router = express.Router();

router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/verify', verifyToken);
// router.post('/refresh', refreshToken);
// router.get('/me', checkHealth);

export default router;

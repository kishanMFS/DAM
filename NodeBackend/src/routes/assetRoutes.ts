import express from 'express';
import type { Router } from 'express';
import { getAssets } from '@/controllers/assetController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router: Router = express.Router();

// router.post('/', authMiddleware, uploadAsset);
router.get('/', authMiddleware, getAssets);
// router.get('/:id', authMiddleware, getAsset);
// router.delete('/:id', authMiddleware, deleteUser);
// router.get('/search', authMiddleware, searchAsset);

export default router;

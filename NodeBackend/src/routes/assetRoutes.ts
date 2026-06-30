import express from 'express';
import type { Router } from 'express';
import {
  getAssets,
  getPresignedURL,
  uploadAssetDetails,
  getDashboardStats,
} from '@/controllers/assetController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router: Router = express.Router();

router.post('/', authMiddleware, uploadAssetDetails);
router.get('/', authMiddleware, getAssets);
// router.get('/:id', authMiddleware, getAsset);
// router.delete('/:id', authMiddleware, deleteUser);
// router.get('/search', authMiddleware, searchAsset);
router.post('/presigned-url', authMiddleware, getPresignedURL);
router.get('/dashboard', authMiddleware, getDashboardStats);

export default router;

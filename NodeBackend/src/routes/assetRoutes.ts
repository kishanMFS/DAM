import express from 'express';
import type { Router } from 'express';
import {
  getAssets,
  getPresignedURL,
  uploadAssetDetails,
  getDashboardStats,
  updateDownloadCount,
  deleteAsset,
} from '@/controllers/assetController.js';
import authMiddleware, { requireAdmin } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/requestValidation.js';
import {
  validateAssetFiles,
  validateFileId,
  validatePresignedFiles,
} from '../middleware/requestValidators.js';

const router: Router = express.Router();

router.post('/', authMiddleware, validateAssetFiles, validateRequest, uploadAssetDetails);
router.get('/', authMiddleware, getAssets);
// router.get('/:id', authMiddleware, getAsset);
// router.get('/search', authMiddleware, searchAsset);
router.post(
  '/presigned-url',
  authMiddleware,
  validatePresignedFiles,
  validateRequest,
  getPresignedURL,
);
router.get('/dashboard', authMiddleware, getDashboardStats);
router.patch(
  '/:fileId/download-count',
  authMiddleware,
  validateFileId,
  validateRequest,
  updateDownloadCount,
);
router.delete(
  '/:fileId',
  authMiddleware,
  requireAdmin,
  validateFileId,
  validateRequest,
  deleteAsset,
);

export default router;

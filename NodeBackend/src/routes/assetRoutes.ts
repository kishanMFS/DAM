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
  validateAssetList,
  validateFileId,
  validatePresignedFiles,
} from '../middleware/requestValidators.js';

const router: Router = express.Router();

/**
 * @swagger
 * /assets:
 *   post:
 *     tags: [Assets]
 *     summary: Store uploaded-file metadata and enqueue processing
 *     security:
 *       - accessToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/AssetUpload'
 *     responses:
 *       '200':
 *         description: Metadata stored and processing queued
 *       '400':
 *         description: Invalid file metadata
 *       '500':
 *         description: Metadata insert or queue publication failed
 */
router.post('/', authMiddleware, validateAssetFiles, validateRequest, uploadAssetDetails);

/**
 * @swagger
 * /assets:
 *   get:
 *     tags: [Assets]
 *     summary: List assets or fetch processing assets by source object names
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sourceObjectNames
 *         description: JSON-encoded array of source object keys for processing polling
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Assets and pagination data
 *       '401':
 *         description: Authentication required
 */
router.get('/', authMiddleware, validateAssetList, validateRequest, getAssets);

/**
 * @swagger
 * /assets/presigned-url:
 *   post:
 *     tags: [Assets]
 *     summary: Create MinIO presigned upload URLs
 *     security:
 *       - accessToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/PresignedFile'
 *     responses:
 *       '200':
 *         description: Presigned URLs created
 *       '400':
 *         description: Invalid request
 */
router.post(
  '/presigned-url',
  authMiddleware,
  validatePresignedFiles,
  validateRequest,
  getPresignedURL,
);

/**
 * @swagger
 * /assets/dashboard:
 *   get:
 *     tags: [Assets]
 *     summary: Get dashboard statistics
 *     security:
 *       - accessToken: []
 *     responses:
 *       '200':
 *         description: Asset and storage totals
 */
router.get('/dashboard', authMiddleware, getDashboardStats);

/**
 * @swagger
 * /assets/{fileId}/download-count:
 *   patch:
 *     tags: [Assets]
 *     summary: Increment an asset download count
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Download count updated
 *       '404':
 *         description: Asset not found
 */
router.patch(
  '/:fileId/download-count',
  authMiddleware,
  validateFileId,
  validateRequest,
  updateDownloadCount,
);

/**
 * @swagger
 * /assets/{fileId}:
 *   delete:
 *     tags: [Assets]
 *     summary: Delete an asset and its generated variants
 *     security:
 *       - accessToken: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Asset tree deleted
 *       '403':
 *         description: Administrator access required
 *       '404':
 *         description: Asset not found
 */
router.delete(
  '/:fileId',
  authMiddleware,
  requireAdmin,
  validateFileId,
  validateRequest,
  deleteAsset,
);

export default router;

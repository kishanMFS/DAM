import type { Request, Response } from 'express';
import * as assetService from '../services/assetService.js';

import logger from '../utils/winston.js';
import env from '../config/env.js';

const isProd = env.isProd;

export const getAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit === undefined ? 8 : Number(req.query.limit);
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const sourceObjectNames =
      typeof req.query.sourceObjectNames === 'string'
        ? (JSON.parse(req.query.sourceObjectNames) as string[])
        : undefined;
    let id: string = '';
    if (req.user && req.user.role != 'ADMIN') {
      id = String(req.user.id);
    }

    const getAssetsResponse = await assetService.getAssetsService(id, {
      limit,
      offset,
      search,
      sourceObjectNames,
    });
    if (!getAssetsResponse.success) {
      res.status(401).json(getAssetsResponse);
      return;
    }

    res.status(200).json(getAssetsResponse);
  } catch (error) {
    let errorMessage = 'Error fetching assets';
    logger.error(errorMessage, {
      message: error instanceof Error ? error.message : String(error),
      // stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });
    if (!isProd) {
      errorMessage = (error as Error).message;
    }
    res.status(500).json({ message: 'Error fetching Assets', errorMessage });
  }
};

export const getPresignedURL = async (req: Request, res: Response): Promise<void> => {
  try {
    // const { fileName, mimeType } = req.body;
    const files = req.body.files;

    const getPresignedURLResponse = await assetService.getPresignedURLService(files);
    if (!getPresignedURLResponse.success) {
      res.status(401).json(getPresignedURLResponse);
      return;
    }

    res.status(200).json(getPresignedURLResponse);
  } catch (error) {
    let errorMessage = 'Error getting pre signed url';
    logger.error(errorMessage, {
      message: error instanceof Error ? error.message : String(error),
      // stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });
    if (!isProd) {
      errorMessage = (error as Error).message;
    }
    res.status(500).json({ message: 'Error getting pre signed url', errorMessage });
  }
};

export const uploadAssetDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    // const { fileName, mimeType } = req.body;
    const files = req.body.files;
    const { id } = req.user!;

    const uploadAssetDetailsResponse = await assetService.uploadAssetDetailsService(files, id);
    if (!uploadAssetDetailsResponse.success) {
      res.status(401).json(uploadAssetDetailsResponse);
      return;
    }
    res.status(200).json(uploadAssetDetailsResponse);
  } catch (error) {
    let errorMessage = 'Error updating assets details';
    logger.error(errorMessage, {
      message: error instanceof Error ? error.message : String(error),
      // stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });
    if (!isProd) {
      errorMessage = (error as Error).message;
    }
    res.status(500).json({ message: 'Error updating assets details', errorMessage });
  }
};

export const updateDownloadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;

    if (typeof fileId !== 'string') {
      res.status(400).json({ message: 'Invalid fileId' });
      return;
    }

    const response = await assetService.updateDownloadCountService(fileId);

    if (!response.success) {
      res.status(404).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    let errorMessage = 'Unable to update download count';
    logger.error(errorMessage, {
      message: error instanceof Error ? error.message : String(error),
      // stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });
    if (!isProd) {
      errorMessage = (error as Error).message;
    }
    res.status(500).json({ message: 'Unable to update download count', errorMessage });
  }
};

export const deleteAsset = async (req: Request, res: Response): Promise<void> => {
  const fileId = req.params.fileId;
  if (typeof fileId !== 'string') {
    res.status(400).json({ success: false, message: 'Invalid fileId' });
    return;
  }

  try {
    const deletedCount = await assetService.deleteAssetService(fileId);

    if (deletedCount === 0) {
      res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Asset and generated variants deleted successfully',
      data: { deletedCount },
    });
  } catch (error) {
    logger.error('Error deleting asset', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fileId,
    });
    res.status(500).json({
      success: false,
      message: 'Unable to delete asset',
      ...(!isProd && {
        errorMessage: error instanceof Error ? error.message : String(error),
      }),
    });
  }
};

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await assetService.getDashboardStatsService();

    res.status(200).json(stats);
  } catch (error) {
    let errorMessage = 'Unable to fetch dashboard statistics';
    logger.error(errorMessage, {
      message: error instanceof Error ? error.message : String(error),
      // stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });
    if (!isProd) {
      errorMessage = (error as Error).message;
    }
    res.status(500).json({ message: 'Unable to fetch dashboard statistics', errorMessage });
  }
};

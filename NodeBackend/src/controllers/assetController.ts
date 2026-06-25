import type { Request, Response } from 'express';
import * as assetService from '@/services/assetService.js';

import logger from '@/utils/winston.js';
import env from '@/config/env.js';

const isProd = env.isProd;

export const getAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.user;
    const getAssetsResponse = await assetService.getAssetsService(id);
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
    const { id } = req.user;

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

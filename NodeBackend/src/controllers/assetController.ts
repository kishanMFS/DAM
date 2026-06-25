import type { Request, Response } from 'express';
import * as assetService from '@/services/assetService.js';

import logger from '@/utils/winston.js';
import env from '@/config/env.js';

const isProd = env.isProd;

export const getAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = Array.isArray(req.user);
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

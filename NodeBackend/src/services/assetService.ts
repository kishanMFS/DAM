import type { Asset, ApiResponse, AssetFile } from '@/types/assetTypes.js';
import sendTask from '../utils/producer.js';
import * as assetModel from '@/models/assetModel.js';
import { minio, bucketName } from '../utils/minio.js';
import crypto from 'crypto';
// import env from '@/config/env.js';

// const isProd = env.isProd;
const BUCKET_NAME = bucketName;

export const getAssetsService = async (userid: string): Promise<ApiResponse<Asset[]>> => {
  const result = await assetModel.getAssets(userid);
  if (result.success) {
    const filesWithUrls = await Promise.all(
      result.Assets.map(async (asset) => ({
        ...asset,
        downloadUrl: await minio.presignedGetObject(BUCKET_NAME, asset.storage_key, 60 * 60),
      })),
    );

    result.Assets = filesWithUrls;
  }

  return {
    success: result.success,
    message: result.message,
    data: result.Assets,
  };
};

export const getPresignedURLService = async (
  files: {
    fileName: string;
    mimeType: string;
  }[],
): Promise<ApiResponse> => {
  const result: ApiResponse = {
    success: false,
    message: '',
    data: [],
  };

  const presignedFiles = await Promise.all(
    files.map(async (file) => {
      const objectName = `${Date.now()}-${crypto.randomUUID()}-${file.fileName}`;

      const presignedUrl = await minio.presignedPutObject(BUCKET_NAME, objectName, 60 * 10);

      return {
        fileName: file.fileName,
        mimeType: file.mimeType,
        objectName,
        presignedUrl,
      };
    }),
  );

  result.success = true;
  result.message = 'Successfully created presigned URLs';
  result.data = presignedFiles;

  return result;
};

export const uploadAssetDetailsService = async (
  files: AssetFile[],
  userid: string,
): Promise<ApiResponse> => {
  const result = await assetModel.insertAssetDetails(files, userid);

  // Send each uploaded file to RabbitMQ
  files.forEach((file, index) => {
    const insertedFile = result.data[index];
    sendTask({
      fileid: insertedFile.id,
      original_name: insertedFile.original_name,
      objectName: file.objectName,
      bucket: BUCKET_NAME,
      fileType: file.fileType,
      userid,
    });
  });

  return result;
};

export const getDashboardStatsService = async (): Promise<ApiResponse> => {
  const result = {
    success: false,
    message: '',
    data: {},
  };
  const getDashboardStatsResult = await assetModel.getDashboardStats();
  result.success = true;
  result.message = 'Successfully fetched dashboard stats';
  result.data = {
    totalAssets: Number(getDashboardStatsResult.totalAssets),
    totalUsers: Number(getDashboardStatsResult.totalUsers),
    totalDownloads: Number(getDashboardStatsResult.totalDownloads),
    storageUsed: Number(getDashboardStatsResult.storageUsed),
  };

  return result;
};

export const updateDownloadCountService = async (fileId: string): Promise<ApiResponse> => {
  const result = await assetModel.updateDownloadCount(fileId);

  return {
    success: result.success,
    message: result.message,
    data: result.data,
  };
};

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as assetModel from '../src/models/assetModel.js';
import { minio } from '../src/utils/minio.js';
import { deleteAssetService } from '../src/services/assetService.js';
import type { AssetStorageObject } from '../src/models/assetModel.js';
import { requireAdmin } from '../src/middleware/authMiddleware.js';
import type { Request, Response } from 'express';

jest.mock('../src/models/assetModel.js', () => ({
  deleteAssetTree: jest.fn(),
}));
jest.mock('../src/utils/minio.js', () => ({
  minio: { removeObject: jest.fn() },
  bucketName: 'assets',
  replaceMinioUrl: (url: string) => url,
}));
jest.mock('../src/utils/producer.js', () => jest.fn());

const mockedDeleteAssetTree = jest.mocked(assetModel.deleteAssetTree);
const mockedRemoveObject = jest.mocked(minio.removeObject);

describe('deleteAssetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAdmin', () => {
    test('rejects non-admin users', () => {
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();

      requireAdmin({ user: { role: 'USER' } } as unknown as Request, response, next);

      expect(response.status).toHaveBeenCalledWith(403);
      expect(response.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin access required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('allows admin users', () => {
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();

      requireAdmin({ user: { role: 'ADMIN' } } as unknown as Request, response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(response.status).not.toHaveBeenCalled();
    });
  });

  test('removes every source, variant, and thumbnail object', async () => {
    const deletedAssets: AssetStorageObject[] = [
      {
        id: 'source-id',
        storage_key: 'uploads/source.mp4',
        thumbnail_key: 'thumbnails/source.jpg',
      },
      {
        id: 'variant-id',
        storage_key: 'videos/240/source.mp4',
        thumbnail_key: null,
      },
    ];
    mockedDeleteAssetTree.mockImplementation(async (_assetId, removeObjects) => {
      await removeObjects(['uploads/source.mp4', 'thumbnails/source.jpg', 'videos/240/source.mp4']);
      return deletedAssets;
    });

    await expect(deleteAssetService('source-id')).resolves.toBe(2);
    expect(mockedDeleteAssetTree).toHaveBeenCalledWith('source-id', expect.any(Function));
    expect(mockedRemoveObject).toHaveBeenCalledTimes(3);
    expect(mockedRemoveObject).toHaveBeenCalledWith('assets', 'uploads/source.mp4');
    expect(mockedRemoveObject).toHaveBeenCalledWith('assets', 'thumbnails/source.jpg');
    expect(mockedRemoveObject).toHaveBeenCalledWith('assets', 'videos/240/source.mp4');
  });

  test('returns zero when the requested asset does not exist', async () => {
    mockedDeleteAssetTree.mockResolvedValue(null);

    await expect(deleteAssetService('missing-id')).resolves.toBe(0);
    expect(mockedRemoveObject).not.toHaveBeenCalled();
  });

  test('surfaces storage deletion failures', async () => {
    mockedDeleteAssetTree.mockImplementation(async (_assetId, removeObjects) => {
      await removeObjects(['uploads/source.mp4']);
      return [];
    });
    mockedRemoveObject.mockRejectedValue(new Error('MinIO unavailable'));

    await expect(deleteAssetService('source-id')).rejects.toThrow('MinIO unavailable');
  });
});

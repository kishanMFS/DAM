import * as assetService from '../src/services/assetService';
import * as assetModel from '../src/models/assetModel';
import { minio } from '../src/utils/minio';
import sendTask from '../src/utils/producer';
import type { Asset } from '../src/types/assetTypes';

jest.mock('@/utils/db', () => ({
  default: {
    manyOrNone: jest.fn(),
    one: jest.fn(),
  },
}));
jest.mock('@/models/assetModel');
jest.mock('@/utils/minio', () => ({
  minio: {
    presignedGetObject: jest.fn(),
    presignedPutObject: jest.fn(),
  },
}));
jest.mock('@/utils/producer', () => jest.fn());

const mockedAssetModel = assetModel as unknown as {
  getAssets: jest.Mock;
  insertAssetDetails: jest.Mock;
  getDashboardStats: jest.Mock;
};

const mockedMinio = minio as unknown as {
  presignedGetObject: jest.Mock;
  presignedPutObject: jest.Mock;
};

const mockedSendTask = sendTask as unknown as jest.Mock;

describe('assetService test cases', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('getAssetsService returns assets with downloadUrl', async () => {
    const assets = [
      { id: '1', storage_key: 'key-1', original_name: 'one' },
      { id: '2', storage_key: 'key-2', original_name: 'two' },
    ];

    mockedAssetModel.getAssets.mockResolvedValue({ success: true, Assets: assets, message: 'ok' });
    mockedMinio.presignedGetObject.mockImplementation(
      async (_bucket: string, _key: string) => 'https://download/url',
    );

    const res = await assetService.getAssetsService('userid-1');

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    const data = res.data as Array<Asset & { downloadUrl?: string }>;
    expect(data).toHaveLength(2);
    expect(data[0]).toHaveProperty('downloadUrl', 'https://download/url');
    expect(mockedAssetModel.getAssets).toHaveBeenCalledWith('userid-1');
  });

  test('getPresignedURLService returns presigned URLs for files uploaded', async () => {
    mockedMinio.presignedPutObject.mockResolvedValue('https://put/url');

    const files = [{ fileName: 'a.png', mimeType: 'image/png' }];
    const res = await assetService.getPresignedURLService(files as any);

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    const presignedFiles = res.data as Array<Record<string, unknown>>;
    expect(presignedFiles).toHaveLength(1);
    expect(presignedFiles[0]).toHaveProperty('presignedUrl', 'https://put/url');
    expect(presignedFiles[0]).toHaveProperty('objectName');
  });

  test('uploadAssetDetailsService inserts details and call sendTask rabbitMQ provider for each file', async () => {
    const files = [
      { objectName: 'obj-1', originalName: 'one.png', fileType: 'image/png', size: 100 },
    ];

    const modelResult = {
      success: true,
      data: [{ id: '99', original_name: 'one.png' }],
      message: 'inserted',
    };
    mockedAssetModel.insertAssetDetails.mockResolvedValue(modelResult);

    mockedSendTask.mockImplementation(() => undefined);

    const res = await assetService.uploadAssetDetailsService(files as any, 'userid');

    expect(res).toEqual(modelResult);
    expect(mockedAssetModel.insertAssetDetails).toHaveBeenCalledWith(files, 'userid');
    expect(mockedSendTask).toHaveBeenCalledTimes(1);
    expect(mockedSendTask).toHaveBeenCalledWith(
      expect.objectContaining({
        fileid: '99',
        original_name: 'one.png',
        objectName: 'obj-1',
        bucket: expect.any(String),
        userid: 'userid',
      }),
    );
  });

  test('getDashboardStatsService returns admin dashboard stats', async () => {
    mockedAssetModel.getDashboardStats.mockResolvedValue({
      totalAssets: '2',
      totalUsers: '1',
      totalDownloads: '5',
      storageUsed: '1234',
    });

    const res = await assetService.getDashboardStatsService();

    expect(res.success).toBe(true);
    expect(res.data).toMatchObject({
      totalAssets: 2,
      totalUsers: 1,
      totalDownloads: 5,
      storageUsed: 1234,
    });
  });
});

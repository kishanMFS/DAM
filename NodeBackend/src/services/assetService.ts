import type { Asset, ApiResponse, AssetFile } from '@/types/assetTypes.js';
import sendTask from '../utils/producer.js';
import * as assetModel from '@/models/assetModel.js';
import { minio } from '../utils/minio.js';
import crypto from 'crypto';
// import env from '@/config/env.js';

// const isProd = env.isProd;
const BUCKET_NAME = 'dam-assets';

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

// import { Worker } from 'worker_threads';

// export const createZipService = async (
//   projectID: string,
//   fileID: number[],
// ): Promise<ApiResponse<{ jobid: number; status: string }>> => {
//   const result = {
//     success: false,
//     message: '',
//     status: '',
//     jobid: 0,
//     project_id: '',
//   };
//   const getProjectFilesByIdsResult = await getProjectFilesByIds(projectID, fileID);
//   let createJobresult = {
//     jobs: {
//       jobid: 0,
//       status: '',
//     },
//   };
//   try {
//     if (!getProjectFilesByIdsResult.success) {
//       result.success = getProjectFilesByIdsResult.success;
//       result.message = getProjectFilesByIdsResult.message;
//     }

//     const files = getProjectFilesByIdsResult.projectfile ?? [];

//     if (!files.length) {
//       return {
//         success: false,
//         message: 'No files found',
//       } as ProjectModelType;
//     }

//     const zipName = `project_${projectID}_${Date.now()}.zip`;
//     const zipPath = path.join(process.cwd(), 'files', zipName);

//     // create a jon record
//     createJobresult = await createJob(projectID, zipName);

//     const jobId = createJobresult.jobs.jobid;

//     const worker = new Worker(
//       path.resolve(
//         process.cwd(),
//         isProd ? 'dist/src/workers/zipWorker.ts' : 'src/workers/zipWorker.ts',
//       ),
//       {
//         workerData: {
//           projectID,
//           zipPath,
//           files,
//         },
//       },
//     );

//     let lastUpdatePromise: Promise<void> = Promise.resolve();

//     const cleanupListeners = () => {
//       worker.removeAllListeners();
//     };

//     worker.on('message', (message) => {
//       // console.log('message:', message.status)

//       lastUpdatePromise = lastUpdatePromise
//         .then(async () => {
//           await updateJobStatus(jobId, message.status, message.progress ?? 0);
//         })
//         .catch((err) => {
//           console.error('DB update failed:', err);
//         });
//     });

//     worker.on('error', async (error) => {
//       // console.log('Worker error:', error);

//       await updateJobStatus(jobId, 'ERROR', 0, (error as Error).message);
//       cleanupListeners();
//     });

//     worker.on('exit', async (code) => {
//       // console.log('Worker exit:', code);
//       if (code !== 0) {
//         await updateJobStatus(jobId, 'FAILED', 0, `Worker exited with code ${code}`);
//       }

//       cleanupListeners();
//     });
//   } catch (error) {
//     result.success = false;
//     result.message = (error as Error).message;
//   }
//   return {
//     success: true,
//     message: 'Zip created successfully',
//     data: {
//       jobid: createJobresult.jobs.jobid,
//       status: createJobresult.jobs.status,
//     },
//   };
// };

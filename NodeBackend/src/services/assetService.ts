import type {
  Asset,
  // ProjectModelType,
  ApiResponse,
  // ProjectJob,
  // UploadedFile,
} from '@/types/assetTypes.js';
// import fs from 'fs/promises';
// import * as fsSync from 'fs';
// import path from 'path';
// import * as archiver from 'archiver';
import * as assetModel from '@/models/assetModel.js';
import minioClient from '../utils/minioClient.js';
import crypto from 'crypto';
// import env from '@/config/env.js';

// const isProd = env.isProd;
const BUCKET_NAME = 'dam-assets';

// export const createProjectService = async (projectData: Project): Promise<ProjectModelType> => {
//   const result = await createProject(projectData);
//   return result;
// };

export const getAssetsService = async (userid: string): Promise<ApiResponse<Asset[]>> => {
  const result = await assetModel.getAssets(userid);
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

      const presignedURL = await minioClient.presignedPutObject(BUCKET_NAME, objectName, 60 * 10);

      return {
        fileName: file.fileName,
        mimeType: file.mimeType,
        objectName,
        presignedURL,
      };
    }),
  );

  result.success = true;
  result.message = 'Successfully created presigned URLs';
  result.data = presignedFiles;

  return result;
};

// export const getProjectByIdService = async (id: string): Promise<ApiResponse<Project>> => {
//   const result = await getProjectById(id);
//   return {
//     success: result.success,
//     message: result.message,
//     data: result.project ?? undefined,
//   };
// };

// export const updateProjectService = async (
//   id: string,
//   projectData: Project,
// ): Promise<ApiResponse<Project>> => {
//   const result = await updateProject(id, projectData);
//   return result;
// };

// export const deleteProjectService = async (projectID: string): Promise<ApiResponse<Project>> => {
//   const result = await deleteProject(projectID);
//   return result;
// };

// export const getProjectFilesService = async (projectID: string): Promise<ApiResponse> => {
//   const result = await getProjectFiles(projectID);
//   return {
//     success: result.success,
//     message: result.message,
//     data: result.files,
//   };
// };

// export const uploadFilesToProjectService = async (
//   projectID: string,
//   files: Express.Multer.File[],
// ): Promise<ApiResponse> => {
//   const uploadedFiles: UploadedFile[] = [];
//   const filesDir = path.join(process.cwd(), 'files');
//   const result: {
//     success: boolean;
//     message: string;
//     project_id: string;
//     data: {
//       project_id: string;
//       files: UploadedFile[];
//     };
//   } = {
//     success: false,
//     message: '',
//     project_id: projectID,
//     data: {
//       project_id: '',
//       files: [],
//     },
//   };

//   await fs.mkdir(filesDir, { recursive: true });

//   for (const file of files) {
//     const filekey = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

//     const extension = path.extname(file.originalname);

//     const filename = `${filekey}${extension}`;

//     const uploadPath = path.join(process.cwd(), 'files', filename);

//     await fs.writeFile(uploadPath, file.buffer);

//     const dbResult = await uploadFilesToProject(
//       projectID,
//       file.originalname,
//       filename,
//       file.mimetype,
//       file.size,
//     );

//     uploadedFiles.push({
//       fileId: dbResult.files!.projectfileid,
//       name: file.originalname,
//       size: file.size,
//       type: file.mimetype,
//       cdt: dbResult.files!.cdt,
//     });
//   }

//   result.success = true;
//   result.message = 'Files uploaded successfully';
//   result.data = {
//     project_id: projectID,
//     files: uploadedFiles,
//   };

//   return result;
// };

// export const deleteProjectFilesService = async (
//   projectID: string,
//   fileID: string,
// ): Promise<ApiResponse<Project>> => {
//   const result = await deleteProjectFiles(projectID, fileID);

//   if (result.success) {
//     const filePath = path.join(process.cwd(), 'files', result.projectfilekey);
//     try {
//       await fs.unlink(filePath);
//     } catch (error: unknown) {
//       result.message = (error as Error).message;
//     }
//   }

//   return result;
// };

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

// export const getJobsStatusService = async (
//   projectID: string,
// ): Promise<ApiResponse<ProjectJob[]>> => {
//   const result = await getJobsStatus(projectID);
//   return {
//     success: result.success,
//     message: result.message,
//     data: result.jobs,
//   };
// };

// export const downloadZipService = async (
//   projectId: string,
//   fileName: string,
// ): Promise<ProjectModelType> => {
//   try {
//     const filePath = path.join(process.cwd(), 'files', fileName);

//     if (!fsSync.existsSync(filePath)) {
//       return {
//         success: false,
//         message: 'Zip file not found',
//       };
//     }

//     return {
//       success: true,
//       message: 'File found',
//       filePath,
//       fileName,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       message: (error as Error).message,
//     };
//   }
// };

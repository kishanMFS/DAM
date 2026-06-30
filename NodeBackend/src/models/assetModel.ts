import db from '@/utils/db.js';
import type { Asset, AssetFile } from '@/types/assetTypes.js';
// import { randomUUID } from 'crypto';
// import { UUID } from 'crypto';

// import { User } from '@/types/authServiceTypes.js';

// const createProject = async (projectData: Project) => {
//   const result = {
//     success: false,
//     project: null as Project | null,
//     message: '',
//   };

//   const createdProject = await db.oneOrNone(
//     `   INSERT
//         INTO    tbl_projects
//                 (project_name, project_description)
//         VALUES  ($1, $2)
//                 RETURNING *
//     `,
//     [projectData.projectname, projectData.description],
//   );

//   if (createdProject) {
//     result.success = true;
//     result.project = {
//       project_id: createdProject.project_id,
//       projectname: createdProject.project_name,
//       description: createdProject.project_description,
//       createddate: createdProject.cdt,
//     };
//     result.message = 'Project created successfully';
//   }

//   return result;
// };

export const getAssets = async (userid: string) => {
  const result = {
    success: false,
    Assets: [] as Asset[],
    message: '',
  };
  const assets = await db.manyOrNone<Asset>(
    `
      SELECT *
      FROM assets
      WHERE ($1::text IS NULL OR uploaded_by = $1)
      ORDER BY id DESC
    `,
    [userid || null],
  );
  if (assets) {
    result.success = true;
    result.message = 'Assets fetched successfully';
    result.Assets = assets;
  }
  return result;
};

export const insertAssetDetails = async (files: AssetFile[], userid: string) => {
  const result = {
    success: false,
    data: {
      id: '',
      original_name: '',
    },
    message: '',
  };

  const values: string[] = [];
  const params: unknown[] = [];

  files.forEach((file, index) => {
    const i = index * 5;

    values.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`);

    params.push(file.objectName, file.originalName, file.fileType, file.size, userid);
  });

  const insertAssetDetailsResult = await db.oneOrNone(
    `
      INSERT INTO assets
      (
        storage_key,
        original_name,
        mime_type,
        file_size,
        uploaded_by
      )
      VALUES ${values.join(',')}
      RETURNING *
    `,
    params,
  );

  if (insertAssetDetailsResult) {
    result.data.id = insertAssetDetailsResult.id;
    result.data.original_name = insertAssetDetailsResult.original_name;
    result.success = true;
    result.message = 'assets details uploaded successfully';
  }

  return result;
};

// const deleteProject = async (projectID: string) => {
//   const result = {
//     success: false,
//     message: '',
//   };

//   db.oneOrNone(
//     `
//       UPDATE  tbl_projects
//       SET     is_deleted = true
//       WHERE   1=1
//               AND project_id = $1
//     `,
//     [projectID],
//   );

//   result.success = true;
//   result.message = 'Project deleted successfully';

//   return result;
// };

// const uploadFilesToProject = async (
//   projectID: string,
//   originalname: string,
//   filekey: string,
//   mimetype: string,
//   size: number,
// ): Promise<{
//   success: boolean;
//   message: string;
//   files?: {
//     projectfileid: number;
//     cdt: string;
//   };
// }> => {
//   const result: {
//     success: boolean;
//     message: string;
//     files?: {
//       projectfileid: number;
//       cdt: string;
//     };
//   } = {
//     success: false,
//     message: '',
//     files: {
//       projectfileid: 0,
//       cdt: '',
//     },
//   };

//   const insertFiles = await db.oneOrNone(
//     ` INSERT
//       INTO    tbl_projectsfiles
//               (projectfilename, projectfilekey, projectfilesize, project_id, mimetype)
//       VALUES  ($1, $2, $3, $4, $5)
//               RETURNING *
//     `,
//     [originalname, filekey, size, projectID, mimetype],
//   );

//   if (insertFiles) {
//     result.success = true;
//     result.files = {
//       projectfileid: insertFiles.projectfileid,
//       cdt: insertFiles.cdt,
//     };
//     result.message = 'Project created successfully';
//   }

//   return result;
// };

// const deleteProjectFiles = async (projectID: string, fileID: string) => {
//   const result = {
//     success: false,
//     message: '',
//     projectfilekey: '',
//   };

//   const deleteFile = await db.oneOrNone(
//     `
//       DELETE
//       FROM    tbl_projectsFiles
//       WHERE   1=1
//               AND project_id = $1
//               AND projectfileid = $2
//               RETURNING projectfilekey
//     `,
//     [projectID, fileID],
//   );

//   result.success = true;
//   result.message = 'Project deleted successfully';
//   result.projectfilekey = deleteFile.projectfilekey;

//   return result;
// };

// const getProjectFilesByIds = async (projectID: string, fileId: number[]) => {
//   const result = {
//     success: false,
//     message: 'no files found',
//     projectfile: [{}],
//   };

//   const getFiles = await db.manyOrNone(
//     `
//       SELECT  projectfileid,
//               projectfilename,
//               projectfilekey
//       FROM    tbl_projectsfiles
//       WHERE   project_id = $1
//               AND projectfileid = ANY($2::int[])
//     `,
//     [projectID, fileId],
//   );

//   if (getFiles.length) {
//     result.success = true;
//     result.message = 'Project files fetched successfully';
//     result.projectfile = getFiles.map((file) => ({
//       projectfilename: file.projectfilename,
//       projectfilekey: file.projectfilekey,
//     }));
//   }

//   return result;
// };

// const createJob = async (projectID: string, zipName: string) => {
//   const result = {
//     success: false,
//     message: 'create job error',
//     jobs: {
//       jobid: 0,
//       status: '',
//       cdt: '',
//     },
//   };

//   const createJob = await db.oneOrNone(
//     `
//       INSERT
//       INTO    tbl_projectjobs
//               (project_id, zipname)
//       VALUES  ($1, $2)
//               RETURNING *
//     `,
//     [projectID, zipName],
//   );

//   if (createJob) {
//     result.success = true;
//     result.jobs = {
//       jobid: createJob.jobid,
//       cdt: createJob.cdt,
//       status: createJob.status,
//     };
//     result.message = 'Project job created successfully';
//   }

//   return result;
// };

// const getJobsStatus = async (projectID: string) => {
//   const result: {
//     success: boolean;
//     jobs: ProjectJob[];
//     message: string;
//   } = {
//     success: false,
//     jobs: [],
//     message: '',
//   };
//   const projectJobs = await db.manyOrNone<ProjectJob>(
//     `   SELECT  jobid,
//                 zipname,
//                 status,
//                 progress,
//                 TO_CHAR(cdt, 'DD/MM/YYYY') as uploadedDate
//         FROM    tbl_projectjobs
//         WHERE   1=1
//                 AND project_id = $1
//                 ORDER BY jobid DESC
//     `,
//     [projectID],
//   );
//   if (projectJobs) {
//     result.success = true;
//     result.message = 'Project jobs fetched successfully';
//     result.jobs = projectJobs;
//   }
//   return result;
// };

// export interface UpdateJobStatusResult {
//   success: boolean;
//   message: string;
// }

// export const updateJobStatus = async (
//   jobId: number,
//   status: string,
//   progress = 0,
//   errorMessage?: string,
// ): Promise<UpdateJobStatusResult> => {
//   const result = {
//     success: false,
//     message: '',
//   };

//   const updateJobStatus = await db.oneOrNone(
//     `
//       UPDATE  tbl_projectjobs
//       SET     status = $1,
//               progress = $2,
//               error_message = $3,
//               completed_at = CASE
//                               WHEN $1 IN ('COMPLETED', 'FAILED')
//                               THEN NOW()
//                               ELSE completed_at
//                             END
//       WHERE jobid = $4
//     `,
//     [status, progress, errorMessage, jobId],
//   );

//   if (updateJobStatus) {
//     result.success = true;
//     result.message = 'Job updated successfully';
//   }
//   return result;
// };

// export {
//   createProject,
//   getProjects,
//   getProjectById,
//   updateProject,
//   deleteProject,
//   getProjectFiles,
//   uploadFilesToProject,
//   deleteProjectFiles,
//   getProjectFilesByIds,
//   createJob,
//   getJobsStatus,
// };

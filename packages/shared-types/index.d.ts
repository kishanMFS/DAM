export interface Asset {
  originalName?: string;
  objectName?: string;
  assetType?: string;
  mimeType?: string;
  fileSize?: string;
  bucketName?: string;
  createdBy?: Date;
  storage_key: string;
  project_id?: string;
  projectname?: string;
  description?: string;
  createddate?: Date;
  projectFiles?: number;
  projectJobs?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AssetFile {
  assetId?: number;
  storage_key?: string;
  mimeType: string;
  objectName: string;
  originalName: string;
  original_name?: string;
  fileType: string;
  size: string;
  downloadUrl?: string;
}

export interface MediaTask {
  fileid: string;
  original_name: string;
  objectName: string;
  bucket: string;
  fileType: string;
  userid: string;
  originalName?: string;
  fileSize?: string;
  bucketName?: string;
}

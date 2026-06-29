export interface Asset {
  storage_key: string;
  project_id: string;
  projectname: string;
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
  assetId: number;
  storage_key: string;
  mimeType: string;
  objectName: string;
  originalName: string;
  fileType: string;
  size: string;
  downloadUrl?: string;
}

export interface MediaTask {
    
    objectName: string;
    bucket: string;
    fileType: string;
    userid: string;
}
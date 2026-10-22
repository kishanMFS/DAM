export interface UploadFile {
  id: string;
  file: File;
  preview: string;
  size: number;
  type: string;
}

export interface ActiveUploadProgress {
  id: string;
  objectName: string;
  originalName: string;
  preview: string;
  mimeType: string;
  size: number;
  progress: number;
  uploaded: boolean;
}

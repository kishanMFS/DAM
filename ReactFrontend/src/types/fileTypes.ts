export interface UploadFile {
  id: string;
  file: File;
  preview: string;
  size: string;
  type: string;
  uploaded?: boolean;
  uploadProgress?: number;
}

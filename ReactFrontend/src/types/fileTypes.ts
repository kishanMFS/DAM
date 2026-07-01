export interface UploadFile {
  id: string;
  file: File;
  preview: string;
  size: number;
  type: string;
  uploaded?: boolean;
  uploadProgress?: number;
}

import { apiClient } from "./apiClient";

export interface UploadFileResponse {
  tags?: Record<string, unknown>;
  original_name: string;
  id: string;
  originalName?: string;
  fileType?: string;
  size?: string;
  downloadUrl: string;
  parentid?: string | null;
  parentId?: string | null;
  storage_key?: string;
  status?: "pending" | "processing" | "complete" | "error";
  progress?: number;
  file_size?: number | string;
  mime_type?: string;
  data?: Array<{ tags?: Record<string, unknown> }>;
}

export interface FileListResponse {
  files: UploadFileResponse[];
}

export interface UploadFilesResponse {
  success: boolean;
  message: string;
  data: UploadFileResponse[];
}

export interface PresignedUrlRequest {
  fileName: string;
  mimeType: string;
}

export interface PresignedUrlResponse {
  objectName: string;
  presignedUrl: string;
}

export interface PresignedUrlsResponse {
  data: PresignedUrlResponse[];
}

const fileService = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient<UploadFileResponse>({
      url: "/api/assets/upload",
      method: "POST",
      body: formData,
    });
  },

  getFilesFromWinio: () =>
    apiClient<FileListResponse>({
      url: "/api/assets",
      method: "GET",
    }),

  getPresignedUrls: async (files: PresignedUrlRequest[]) =>
    apiClient<PresignedUrlsResponse>({
      url: "/assets/presigned-url",
      method: "POST",
      body: { files },
    }),

  getAdminStats: async () =>
    apiClient({
      url: "/assets/dashboard",
      method: "GET",
    }),

  storeFilesMetadata: async (
    files: {
      objectName: string;
      originalName: string;
      fileType: string;
      size: number;
    }[],
  ) =>
    apiClient<UploadFileResponse[]>({
      url: "/assets",
      method: "POST",
      body: { files },
    }),

  uploadFileToPresignedUrl: async (
    presignedUrl: string,
    file: File,
    contentType: string,
    onProgress: (progress: number) => void,
  ): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("PUT", presignedUrl);
      request.setRequestHeader("Content-Type", contentType);

      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          onProgress(100);
          resolve();
          return;
        }

        reject(new Error("Presigned URL upload failed"));
      };

      request.onerror = () => {
        reject(new Error("Presigned URL upload failed"));
      };

      request.send(file);
    });
  },

  updateDownloadCount: async (fileId: string) =>
    apiClient({
      url: `/assets/${fileId}/download-count`,
      method: "PATCH",
    }),
};

export default fileService;

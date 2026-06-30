import { apiClient } from "./apiClient";

export interface UploadFileResponse {
  original_name: string;
  id: string;
  originalName: string;
  fileType: string;
  size: string;
  downloadUrl: string;
  parentId?: string;
  status?: "pending" | "processing" | "complete" | "error";
  progress?: number;
  data?: object;
}

export interface FileListResponse {
  files: UploadFileResponse[];
}

export interface PresignedUrlRequest {
  fileName: string;
  mimeType: string;
}

export interface PresignedUrlResponse {
  objectName: string;
  presignedUrl: string;
  data: object;
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
    apiClient<PresignedUrlResponse[]>({
      url: "/assets/presigned-url",
      method: "POST",
      body: { files },
    }),

  storeFilesMetadata: async (
    files: {
      objectName: string;
      originalName: string;
      fileType: string;
      size: string;
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
  ) => {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": contentType,
      },
    });

    if (!response.ok) {
      throw new Error("Presigned URL upload failed");
    }

    return response;
  },
};

export default fileService;

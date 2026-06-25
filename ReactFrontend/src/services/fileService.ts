import { apiClient } from "./apiClient";

export interface UploadFileResponse {
  id: string;
  originalName: string;
  fileType: string;
  size: string;
  url: string;
}

export interface FileListResponse {
  files: UploadFileResponse[];
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
};

export default fileService;

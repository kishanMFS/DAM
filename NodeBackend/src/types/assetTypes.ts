export interface Asset {
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

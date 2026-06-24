import { apiClient } from "./apiClient";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserInfo {
  id: string;
  email: string;
  role: "ADMIN" | "USER";
}

export interface LoginResponse {
  role: string;
  success: boolean;
  user: UserInfo;
}

const authService = {
  login: async (payload: LoginRequest) =>
    apiClient<LoginResponse>({
      url: "/auth/login",
      method: "POST",
      body: payload,
    }),

  verifyToken: () =>
    apiClient<UserInfo>({
      url: "/auth/verify-token",
    }),

  logout: () =>
    apiClient<void>({
      url: "/auth/logout",
      method: "POST",
    }),

  refreshToken: () =>
    apiClient<void>({
      url: "/auth/refresh",
      method: "POST",
    }),
};

export default authService;

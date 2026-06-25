import { apiClient, type ApiRequest } from "./apiClient";

export async function queryFn<TResponse = unknown, TBody = unknown>(
  request: ApiRequest<TBody>,
): Promise<TResponse> {
  return apiClient<TResponse, TBody>(request);
}

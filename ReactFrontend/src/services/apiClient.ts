const apiURL = import.meta.env.VITE_API;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequest<TBody = unknown> {
  url: string;
  method?: HttpMethod;
  body?: TBody;
  params?: Record<string, unknown>;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: unknown;
}

const buildQueryString = (params?: Record<string, unknown>) => {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

export async function apiClient<TResponse, TBody = unknown>(
  request: ApiRequest<TBody>,
): Promise<TResponse> {
  const { url, method = "GET", body, params, headers, signal } = request;

  const isFormData = body instanceof FormData;

  const response = await fetch(`${apiURL}${url}${buildQueryString(params)}`, {
    method,
    credentials: "include",
    signal,
    headers: {
      ...(isFormData
        ? {}
        : {
            "Content-Type": "application/json",
          }),

      ...headers,
    },

    body:
      method === "GET"
        ? undefined
        : isFormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw {
      status: response.status,
      message: data?.message || "Something went wrong",
      errors: data?.errors,
    } satisfies ApiError;
  }

  return data;
}

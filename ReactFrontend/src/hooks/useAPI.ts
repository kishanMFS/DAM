import { useMutation, useQuery } from "@tanstack/react-query";

import { queryFn } from "../services/queryFn";

export interface UseApiProps<
  TPayload = unknown,
  TParams extends Record<string, unknown> | undefined = undefined,
> {
  queryKey?: string[];
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  payload?: TPayload;
  params?: TParams;
  enabled?: boolean;
}

export function useApi<
  TResponse = unknown,
  TPayload = unknown,
  TParams extends Record<string, unknown> | undefined = undefined,
>({
  queryKey = ["default"],
  url,
  method = "GET",
  payload,
  params,
  enabled = true,
}: UseApiProps<TPayload, TParams>) {
  const query = useQuery<TResponse>({
    queryKey,
    queryFn: () =>
      queryFn<TResponse, TPayload>({
        url,
        method,
        body: payload,
        params,
      }),
    enabled: method === "GET" ? enabled : false,
  });

  const mutation = useMutation<TResponse, unknown, TPayload | undefined>({
    mutationFn: (data?: TPayload) =>
      queryFn<TResponse, TPayload>({
        url,
        method,
        body: data ?? payload,
        params,
      }),
  });

  return {
    data: query.data,
    error: query.error || mutation.error,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPending: mutation.isPending,
    isSuccess: query.isSuccess || mutation.isSuccess,
    isError: query.isError || mutation.isError,
    refetch: query.refetch,
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    reset: mutation.reset,
  };
}

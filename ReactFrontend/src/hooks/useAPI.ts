import { useMutation, useQuery } from "@tanstack/react-query";

import { queryFn } from "../services/queryFn";

export interface UseApiProps<TPayload = unknown, TParams = Record<string, []>> {
  queryKey?: string[];
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  payload?: TPayload;
  params?: TParams;
  enabled?: boolean;
}

export function useApi<TPayload = unknown, TParams = Record<string, []>>({
  queryKey = ["default"],
  url,
  method = "GET",
  payload,
  params,
  enabled = true,
}: UseApiProps<TPayload, TParams>) {
  const query = useQuery({
    queryKey,
    queryFn: () =>
      queryFn({
        url,
        method,
        payload,
        params,
      }),
    enabled: method === "GET" ? enabled : false,
  });

  const mutation = useMutation({
    mutationFn: (data?: T) =>
      queryFn({
        url,
        method,
        payload: data ?? payload,
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

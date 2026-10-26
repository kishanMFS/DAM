import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useApi } from "../hooks/useAPI";
import {
  type UploadFileResponse,
  type UploadFilesResponse,
} from "../services/fileService";
import fileService from "../services/fileService";
import type { ActiveUploadProgress } from "../types/fileTypes";
import useErrorContext from "../hooks/useError";
import GalleryPagination from "./GalleryPagination";

const PAGE_SIZE = 8;
const VideoPlayer = memo(
  ({ src }: { src: string }) => (
    <video src={src} controls className="h-full w-full object-cover" />
  ),
  (prev, next) => prev.src !== next.src,
);

type GalleryProps = {
  isAdmin?: boolean;
  shouldPoll?: boolean;
  onPollingStopped?: () => void;
  sourceObjectNames?: string[];
  activeUploads?: ActiveUploadProgress[];
  onUploadsSynced?: (objectNames: string[]) => void;
};

const isDerivedAsset = (file: UploadFileResponse) =>
  file.parentId != null || file.parentid != null;

const getResolution = (file: UploadFileResponse) => {
  const dimensions = file.tags?.dimensions;
  if (!dimensions || typeof dimensions !== "object") return null;

  const { width, height } = dimensions as {
    width?: unknown;
    height?: unknown;
  };
  if (typeof width !== "number" || typeof height !== "number") return null;

  return `${width} × ${height}`;
};

export default function Gallery({
  isAdmin = false,
  shouldPoll = false,
  onPollingStopped,
  sourceObjectNames = [],
  activeUploads = [],
  onUploadsSynced,
}: GalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [deletingAssetIds, setDeletingAssetIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { showErrorMessage } = useErrorContext();
  const sourceObjectNamesRef = useRef(sourceObjectNames);
  const galleryQueryKey = ["getfiles", offset, debouncedSearch];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    sourceObjectNamesRef.current = sourceObjectNames;
  }, [sourceObjectNames]);

  // Fetch uploaded files
  const { data: fileListData, refetch: refetchFiles } =
    useApi<UploadFilesResponse>({
      queryKey: galleryQueryKey,
      url: "/assets",
      method: "GET",
      enabled: true,
      params: {
        limit: PAGE_SIZE,
        offset,
        search: debouncedSearch || undefined,
      },
    });

  const uploadedFiles = useMemo(
    () =>
      Array.from(
        new Map(
          (fileListData?.data ?? []).map((file) => [file.id, file]),
        ).values(),
      ),
    [fileListData],
  );
  const totalAssets = fileListData?.pagination?.total ?? uploadedFiles.length;
  const syncedObjectNames = useMemo(
    () =>
      uploadedFiles
        .map((file) => file.storage_key)
        .filter((objectName): objectName is string => objectName !== undefined),
    [uploadedFiles],
  );

  useEffect(() => {
    if (activeUploads.length > 0 && syncedObjectNames.length > 0) {
      onUploadsSynced?.(syncedObjectNames);
    }
  }, [activeUploads.length, onUploadsSynced, syncedObjectNames]);

  const pendingUploads = activeUploads.filter(
    (upload) => !syncedObjectNames.includes(upload.objectName),
  );

  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRunIdRef = useRef(0);
  const pollingActiveRef = useRef(false);

  const stopPolling = useCallback(() => {
    pollingRunIdRef.current += 1;
    pollingActiveRef.current = false;
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    setIsPolling(false);
    onPollingStopped?.();
  }, [onPollingStopped]);

  // Keep polling until all derived assets have finished processing.
  const startPolling = useCallback(() => {
    if (pollingActiveRef.current || sourceObjectNamesRef.current.length === 0) {
      return;
    }

    pollingActiveRef.current = true;
    const runId = ++pollingRunIdRef.current;
    setIsPolling(true);

    const poll = async () => {
      if (pollingRunIdRef.current !== runId) return;
      pollingTimeoutRef.current = null;
      try {
        const [, processingResponse] = await Promise.all([
          refetchFiles(),
          fileService.getFilesFromWinio({
            sourceObjectNames: JSON.stringify(sourceObjectNamesRef.current),
          }),
        ]);
        if (pollingRunIdRef.current !== runId) return;
        const latestFiles = processingResponse.data ?? [];
        const sourceFiles = latestFiles.filter(
          (file) =>
            file.storage_key &&
            sourceObjectNamesRef.current.includes(file.storage_key),
        );
        const derivedFiles = latestFiles.filter(
          (file) => file.parentId != null || file.parentid != null,
        );
        const allComplete =
          sourceFiles.length === sourceObjectNamesRef.current.length &&
          sourceFiles.length > 0 &&
          sourceFiles.every((source) => {
            const variants = derivedFiles.filter(
              (file) => (file.parentId ?? file.parentid) === source.id,
            );
            const sourceDimensions = source.tags?.dimensions;
            const sourceHeight =
              sourceDimensions &&
              typeof sourceDimensions === "object" &&
              "height" in sourceDimensions &&
              typeof sourceDimensions.height === "number"
                ? sourceDimensions.height
                : 0;
            const expectedVariants = source.mime_type?.startsWith("video/")
              ? sourceHeight >= 1080
                ? 4
                : 3
              : 1;

            return (
              variants.length >= expectedVariants &&
              variants.every(
                (file) => file.status === "complete" || file.status === "error",
              )
            );
          });

        if (allComplete) {
          await queryClient.invalidateQueries({ queryKey: ["getfiles"] });
          stopPolling();
          return;
        }
      } catch (error) {
        if (pollingRunIdRef.current !== runId) return;
        showErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to refresh processing status",
        );
        stopPolling();
        return;
      }
      if (pollingRunIdRef.current === runId) {
        pollingTimeoutRef.current = window.setTimeout(() => {
          void poll();
        }, 800);
      }
    };

    pollingTimeoutRef.current = window.setTimeout(() => {
      void poll();
    }, 800);
  }, [queryClient, refetchFiles, showErrorMessage, stopPolling]);

  // Resume polling for variants that were already processing on page load.
  useEffect(() => {
    if (sourceObjectNames.length === 0) return;

    const hasPendingFiles = uploadedFiles.some(
      (file: UploadFileResponse) =>
        isDerivedAsset(file) &&
        file.status !== "complete" &&
        file.status !== "error",
    );

    if (hasPendingFiles) {
      startPolling();
    }
  }, [sourceObjectNames.length, startPolling, uploadedFiles]);

  useEffect(
    () => () => {
      pollingRunIdRef.current += 1;
      pollingActiveRef.current = false;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (shouldPoll) {
      startPolling();
    }
  }, [shouldPoll, startPolling]);

  const handleDownload = async (
    fileId: string,
    url: string,
    fileName: string,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    await fileService.updateDownloadCount(fileId);
  };

  const handleDelete = async (file: UploadFileResponse) => {
    if (
      !window.confirm(
        `Delete "${file.original_name}" and any generated variants? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingAssetIds((ids) => [...ids, file.id]);
    try {
      const response = await fileService.deleteAsset(file.id);
      const remainingAssets = Math.max(
        0,
        totalAssets - response.data.deletedCount,
      );
      if (offset > 0 && offset >= remainingAssets) {
        setOffset(
          Math.max(
            0,
            Math.floor((remainingAssets - 1) / PAGE_SIZE) * PAGE_SIZE,
          ),
        );
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["getfiles"] }),
        queryClient.invalidateQueries({ queryKey: ["adminStats"] }),
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : error &&
              typeof error === "object" &&
              "message" in error &&
              typeof error.message === "string"
            ? error.message
            : "Unable to delete asset";
      showErrorMessage(message);
    } finally {
      setDeletingAssetIds((ids) => ids.filter((id) => id !== file.id));
    }
  };

  return (
    <div>
      {/* Uploaded Files */}

      <div>
        <div className="flex items-center justify-between mt-4 mb-4">
          <h2 className="text-xl font-bold">Gallery</h2>
          {isPolling && (
            <span className="text-sm font-medium text-blue-600 animate-pulse">
              Processing files...
            </span>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search files by tags..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setOffset(0);
          }}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {uploadedFiles.length === 0 && pendingUploads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">
            {searchQuery
              ? "No files match your search"
              : "No uploaded files yet"}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {pendingUploads.map((upload) => (
            <div
              key={upload.id}
              className="group block overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-lg"
            >
              <div className="h-40 overflow-hidden rounded-t-xl bg-slate-100">
                {upload.mimeType.startsWith("image") ? (
                  <img
                    src={upload.preview}
                    alt={upload.originalName}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <VideoPlayer src={upload.preview} />
                )}
              </div>

              <div className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p
                    className="truncate text-xs font-semibold text-slate-900"
                    title={upload.originalName}
                  >
                    {upload.originalName}
                  </p>
                  <span className="shrink-0 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                    {upload.uploaded ? "Uploaded" : "Uploading"}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {upload.size.toFixed(2)} MB
                </p>
                <p className="text-sm text-slate-500">{upload.mimeType}</p>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-600">Upload progress</span>
                    <span className="font-medium text-slate-700">
                      {upload.progress}%
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
                    role="progressbar"
                    aria-label={`Uploading ${upload.originalName}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={upload.progress}
                  >
                    <div
                      className="h-full rounded-full bg-blue-600 transition-[width] duration-150"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {uploadedFiles.map((file: UploadFileResponse) => (
            <div
              key={file.id}
              className="group block bg-white border rounded-xl overflow-hidden shadow-sm transition hover:shadow-lg"
            >
              {file.mime_type?.startsWith("image") ? (
                <div className="relative">
                  <img
                    src={file.downloadUrl}
                    alt={file.original_name}
                    className="h-40 w-full object-cover rounded-t-xl transition duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="h-40 w-full bg-slate-100 rounded-t-xl overflow-hidden relative">
                  <VideoPlayer src={file.downloadUrl} />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p
                    className="font-semibold text-slate-900 truncate text-xs"
                    title={file.original_name}
                  >
                    {file.original_name}
                  </p>

                  {file.status === "complete" && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Done
                    </span>
                  )}
                  {file.status === "error" && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      Error
                    </span>
                  )}
                  {file.status === "processing" && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded animate-pulse">
                      Processing
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {Number(file.file_size).toFixed(2)} MB
                </p>

                <p className="text-sm text-slate-500">{file.mime_type}</p>

                {getResolution(file) && (
                  <p className="text-sm text-slate-500">
                    Resolution: {getResolution(file)}
                  </p>
                )}

                {isDerivedAsset(file) &&
                  file.status !== "complete" &&
                  file.progress !== undefined && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-slate-600">Processing</span>
                        <span className="font-medium text-slate-700">
                          {file.progress}%
                        </span>
                      </div>
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
                        role="progressbar"
                        aria-label={`Processing ${file.original_name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={file.progress}
                      >
                        <div
                          className="h-full rounded-full bg-blue-600 transition-[width]"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                <div className="mt-3 flex items-center justify-between gap-3">
                  {file.downloadUrl && (
                    <button
                      onClick={(e) =>
                        handleDownload(
                          file.id,
                          file.downloadUrl,
                          file.original_name,
                          e,
                        )
                      }
                      className="text-xs font-semibold uppercase cursor-pointer tracking-wide text-blue-600 hover:text-blue-800"
                    >
                      Download
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(file)}
                      disabled={deletingAssetIds.includes(file.id)}
                      aria-label={`Delete ${file.original_name}`}
                      title="Delete asset and generated variants"
                      className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingAssetIds.includes(file.id) ? (
                        <span className="text-xs">...</span>
                      ) : (
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 6h18m-2 0-.9 13.1a2 2 0 0 1-2 1.9H7.9a2 2 0 0 1-2-1.9L5 6m3 0V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m-6 4v7m4-7v7"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <GalleryPagination
        offset={offset}
        pageSize={PAGE_SIZE}
        total={totalAssets}
        onPageChange={setOffset}
      />
    </div>
  );
}

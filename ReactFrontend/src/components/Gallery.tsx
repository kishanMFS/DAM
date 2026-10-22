import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useApi } from "../hooks/useAPI";
import {
  type UploadFileResponse,
  type UploadFilesResponse,
} from "../services/fileService";
import fileService from "../services/fileService";
import type { ActiveUploadProgress } from "../types/fileTypes";

const VideoPlayer = memo(
  ({ src }: { src: string }) => (
    <video src={src} controls className="h-full w-full object-cover" />
  ),
  (prev, next) => prev.src !== next.src,
);

type GalleryProps = {
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
  shouldPoll = false,
  onPollingStopped,
  sourceObjectNames = [],
  activeUploads = [],
  onUploadsSynced,
}: GalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const sourceObjectNamesRef = useRef(sourceObjectNames);

  useEffect(() => {
    sourceObjectNamesRef.current = sourceObjectNames;
  }, [sourceObjectNames]);

  // Fetch uploaded files
  const { data: fileListData, refetch: refetchFiles } =
    useApi<UploadFilesResponse>({
      queryKey: ["getfiles"],
      url: "/assets",
      method: "GET",
      enabled: true,
    });

  const uploadedFiles = useMemo(() => fileListData?.data ?? [], [fileListData]);
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
  const searchLower = searchQuery.toLowerCase();

  const collectTagValues = (value: unknown, results: string[]) => {
    if (value === null || value === undefined) return;

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      results.push(String(value));
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => collectTagValues(item, results));
      return;
    }

    if (typeof value === "object") {
      Object.values(value).forEach((item) => collectTagValues(item, results));
    }
  };

  const filteredFiles = uploadedFiles.filter((file: UploadFileResponse) => {
    if (!searchLower) return true;

    const tags = file.tags;
    if (!tags || typeof tags !== "object") {
      return false;
    }

    const tagValues: string[] = [];
    collectTagValues(tags, tagValues);

    return tagValues.some((value) => value.toLowerCase().includes(searchLower));
  });

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setIsPolling(false);
    onPollingStopped?.();
  }, [onPollingStopped]);

  // Keep polling until all derived assets have finished processing.
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    setIsPolling(true);

    pollingIntervalRef.current = window.setInterval(async () => {
      const latestResponse = await refetchFiles();
      const latestFiles = latestResponse.data?.data ?? [];
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
          const expectedVariants = source.mime_type?.startsWith("video/")
            ? 3
            : 1;

          return (
            variants.length >= expectedVariants &&
            variants.every(
              (file) => file.status === "complete" || file.status === "error",
            )
          );
        });

      if (allComplete) stopPolling();
    }, 800);
  }, [refetchFiles, stopPolling]);

  // Resume polling for variants that were already processing on page load.
  useEffect(() => {
    const hasPendingFiles = uploadedFiles.some(
      (file: UploadFileResponse) =>
        isDerivedAsset(file) &&
        file.status !== "complete" &&
        file.status !== "error",
    );

    if (hasPendingFiles) {
      startPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFiles]);

  useEffect(
    () => () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
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
          placeholder="Search files by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredFiles.length === 0 && pendingUploads.length === 0 ? (
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
          {filteredFiles.map((file: UploadFileResponse) => (
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
                    className="text-xs font-semibold uppercase cursor-pointer tracking-wide text-blue-600 hover:text-blue-800 mt-3"
                  >
                    Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

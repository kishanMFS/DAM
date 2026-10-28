import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useApi } from "../hooks/useAPI";
import type {
  UploadFileResponse,
  UploadFilesResponse,
} from "../services/fileService";
import fileService from "../services/fileService";
import type { ActiveUploadProgress } from "../types/fileTypes";
import useErrorContext from "../hooks/useError";
import GalleryPagination from "./GalleryPagination";
import GallerySearch from "./GallerySearch";
import GalleryAssetList, { type GalleryPreviewMedia } from "./GalleryAssetList";
import Modal from "./Modal";

const PAGE_SIZE = 8;

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
  const [previewMedia, setPreviewMedia] = useState<GalleryPreviewMedia | null>(
    null,
  );
  const queryClient = useQueryClient();
  const { showErrorMessage } = useErrorContext();
  const sourceObjectNamesRef = useRef(sourceObjectNames);
  const galleryQueryKey = useMemo(
    () => ["getfiles", offset, debouncedSearch],
    [offset, debouncedSearch],
  );

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
  const { data: fileListData } = useApi<UploadFilesResponse>({
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
  const startPolling = useCallback(
    (objectNames: string[]) => {
      if (pollingActiveRef.current || objectNames.length === 0) {
        return;
      }

      sourceObjectNamesRef.current = objectNames;
      pollingActiveRef.current = true;
      const runId = ++pollingRunIdRef.current;
      setIsPolling(true);

      const poll = async () => {
        if (pollingRunIdRef.current !== runId) return;
        pollingTimeoutRef.current = null;
        try {
          const processingResponse = await fileService.getFilesFromWinio({
            sourceObjectNames: JSON.stringify(sourceObjectNamesRef.current),
          });
          if (pollingRunIdRef.current !== runId) return;
          const latestFiles = processingResponse.data ?? [];
          const latestFilesById = new Map(
            latestFiles.map((file) => [file.id, file]),
          );
          queryClient.setQueryData<UploadFilesResponse>(
            galleryQueryKey,
            (current) => {
              if (!current?.data) return current;

              let hasChanges = false;
              const data = current.data.map((file) => {
                const latestFile = latestFilesById.get(file.id);
                if (!latestFile) return file;

                const statusChanged =
                  latestFile.status !== undefined &&
                  latestFile.status !== file.status;
                const progressChanged =
                  latestFile.progress !== undefined &&
                  latestFile.progress !== file.progress;
                if (!statusChanged && !progressChanged) return file;

                hasChanges = true;
                return {
                  ...file,
                  ...(latestFile.status !== undefined
                    ? { status: latestFile.status }
                    : {}),
                  ...(latestFile.progress !== undefined
                    ? { progress: latestFile.progress }
                    : {}),
                };
              });

              return hasChanges ? { ...current, data } : current;
            },
          );
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
                  (file) =>
                    file.status === "complete" || file.status === "error",
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
    },
    [galleryQueryKey, queryClient, showErrorMessage, stopPolling],
  );

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
      startPolling(sourceObjectNames);
    }
  }, [sourceObjectNames, startPolling, uploadedFiles]);

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
      startPolling(sourceObjectNames);
    }
  }, [shouldPoll, sourceObjectNames, startPolling]);

  const handleDownload = async (
    fileId: string,
    url: string,
    fileName: string,
  ) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Unable to download this asset");

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
    } catch (error) {
      showErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to download this asset",
      );
    }
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
    <section aria-labelledby="gallery-heading">
      <div className="mt-3 mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <h2 id="gallery-heading" className="text-xl font-bold">
            Gallery
          </h2>
          {isPolling && (
            <span
              role="status"
              aria-live="polite"
              className="animate-pulse text-sm font-medium text-blue-700"
            >
              Processing files...
            </span>
          )}
        </div>
        <GallerySearch
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setOffset(0);
          }}
        />
      </div>

      {uploadedFiles.length === 0 && pendingUploads.length === 0 ? (
        <p className="py-12 text-center text-slate-600" role="status">
          {searchQuery ? "No files match your search" : "No uploaded files yet"}
        </p>
      ) : (
        <GalleryAssetList
          files={uploadedFiles}
          pendingUploads={pendingUploads}
          isAdmin={isAdmin}
          deletingAssetIds={deletingAssetIds}
          onPreview={setPreviewMedia}
          onDownload={(fileId, url, fileName) =>
            void handleDownload(fileId, url, fileName)
          }
          onDelete={(file) => void handleDelete(file)}
        />
      )}
      <GalleryPagination
        offset={offset}
        pageSize={PAGE_SIZE}
        total={totalAssets}
        onPageChange={setOffset}
      />

      <Modal
        open={previewMedia !== null}
        title={previewMedia?.title ?? "Asset preview"}
        onClose={() => setPreviewMedia(null)}
        footer={
          previewMedia?.fileId ? (
            <button
              type="button"
              onClick={() => {
                if (previewMedia.fileId) {
                  void handleDownload(
                    previewMedia.fileId,
                    previewMedia.src,
                    previewMedia.title,
                  );
                }
              }}
              aria-label={`Download ${previewMedia.title}`}
              className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
            >
              Download
            </button>
          ) : undefined
        }
      >
        {previewMedia &&
          (previewMedia.mimeType.startsWith("image/") ? (
            <img
              src={previewMedia.src}
              alt={previewMedia.title}
              className="mx-auto max-h-[70vh] max-w-full object-contain"
            />
          ) : (
            <video
              src={previewMedia.src}
              controls
              autoPlay
              aria-label={previewMedia.title}
              className="mx-auto max-h-[70vh] max-w-full"
            />
          ))}
      </Modal>
    </section>
  );
}

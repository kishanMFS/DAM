import { memo, useCallback, useEffect, useRef, useState } from "react";

import { useApi } from "../hooks/useAPI";
import { type UploadFileResponse } from "../services/fileService";

const VideoPlayer = memo(
  ({ src }: { src: string }) => (
    <video src={src} controls className="h-full w-full object-cover" />
  ),
  (prev, next) => prev.src !== next.src,
);

type GalleryProps = {
  shouldPoll?: boolean;
  onPollingStopped?: () => void;
};

export default function Gallery({
  shouldPoll = false,
  onPollingStopped,
}: GalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isPolling, setIsPolling] = useState(false);

  // Fetch uploaded files
  const { data: fileListData, refetch: refetchFiles } = useApi<{
    files: UploadFileResponse[];
  }>({
    queryKey: ["getfiles"],
    url: "/assets",
    method: "GET",
    enabled: true,
  });

  const uploadedFiles = fileListData?.data ?? [];
  const filteredFiles = uploadedFiles.filter((file: UploadFileResponse) =>
    file.original_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

  // Polling logic: keep fetching until all files have status complete/error
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    setIsPolling(true);

    pollingIntervalRef.current = window.setInterval(async () => {
      const latestResponse = await refetchFiles();
      const latestFiles = latestResponse.data?.files ?? [];

      const allComplete = latestFiles.every(
        (f) => f.parentId && (f.status === "complete" || f.status === "error"),
      );

      if (allComplete) {
        stopPolling();
      }
    }, 800);
  }, [refetchFiles, stopPolling]);

  // Start polling on mount when existing files are still pending
  useEffect(() => {
    const hasPendingFiles = uploadedFiles.some(
      (file: { parentId: string; status: string }) =>
        !file.parentId ||
        (file.status !== "complete" && file.status !== "error"),
    );

    if (hasPendingFiles) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFiles]);

  useEffect(() => {
    if (shouldPoll) {
      startPolling();
    }
  }, [shouldPoll, startPolling]);

  const handleDownload = async (
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

      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">
            {searchQuery
              ? "No files match your search"
              : "No uploaded files yet"}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {filteredFiles.map(
            (file: {
              parentid: string;
              file_size: number;
              mime_type: string;
              id: string;
              fileType: string;
              downloadUrl: string;
              originalName: string;
              progress: string;
              original_name: string;
              status: string;
              size: string;
            }) => (
              <div
                key={file.id}
                className="group block bg-white border rounded-xl overflow-hidden shadow-sm transition hover:shadow-lg"
              >
                {file.mime_type?.startsWith("image") ? (
                  <div className="relative">
                    <img
                      src={file.downloadUrl}
                      alt={file.originalName}
                      className="h-40 w-full object-cover rounded-t-xl transition duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="h-40 w-full bg-slate-100 rounded-t-xl overflow-hidden relative">
                    <VideoPlayer src={file.downloadUrl} />
                    {file.progress !== undefined && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
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

                  {file.downloadUrl /* && file.status === "complete" */ && (
                    <button
                      onClick={(e) =>
                        handleDownload(file.downloadUrl, file.original_name, e)
                      }
                      className="text-xs font-semibold uppercase cursor-pointer tracking-wide text-blue-600 hover:text-blue-800 mt-3"
                    >
                      Download
                    </button>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

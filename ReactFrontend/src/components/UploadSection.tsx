/* eslint-disable react-hooks/exhaustive-deps */
import { useRef, useState, useEffect, useCallback, memo } from "react";
import { useMutation } from "@tanstack/react-query";
import type { UploadFile } from "../types/fileTypes";
import { useApi } from "../hooks/useAPI";
import fileService, {
  //   type PresignedUrlRequest,
  //   type PresignedUrlResponse,
  type UploadFileResponse,
} from "../services/fileService";
import useErrorContext from "../hooks/useError";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

const VideoPlayer = memo(
  ({ src }: { src: string }) => (
    <video src={src} controls className="h-full w-full object-cover" />
  ),
  (prev, next) => prev.src !== next.src,
);

export default function UploadSection() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPolling, setIsPolling] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

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

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  // Polling logic: keep fetching until all files have status complete/error
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      return;
    }

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
  });

  // Start polling on mount when existing files are still pending
  useEffect(() => {
    const hasPendingFiles = uploadedFiles.some(
      (file) =>
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
  }, [uploadedFiles]);

  const uploadFileMutation = useMutation({
    mutationFn: async ({
      presignedUrl,
      file,
      contentType,
    }: {
      presignedUrl: string;
      file: File;
      contentType: string;
    }) => fileService.uploadFileToPresignedUrl(presignedUrl, file, contentType),
  });
  const isUploading = uploadFileMutation.isPending;

  const { showErrorMessage } = useErrorContext();

  const validateFile = (file: File) => {
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (!validTypes.includes(file.type)) {
      alert(`${file.name} is not supported`);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert(`${file.name} exceeds 500MB`);
      return false;
    }

    return true;
  };

  const processFiles = (incomingFiles: FileList | null) => {
    if (!incomingFiles) return;

    const newFiles: UploadFile[] = [];

    Array.from(incomingFiles).forEach((file) => {
      if (!validateFile(file)) return;

      newFiles.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        size: (file.size / 1024 / 1024).toFixed(2) + " MB",
        type: file.type,
      });
    });

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleUpload = async () => {
    try {
      const presignedUrls = await fileService.getPresignedUrls(
        files.map((item) => ({
          fileName: item.file.name,
          mimeType: item.file.type,
        })),
      );

      await Promise.all(
        files.map((item, index) => {
          const presigned = presignedUrls.data[index];

          return uploadFileMutation.mutateAsync({
            presignedUrl: presigned.presignedUrl,
            file: item.file,
            contentType: item.type,
          });
        }),
      );

      // build metadata to store in node
      const metadata = presignedUrls.data.map((p, idx) => ({
        objectName: p.objectName,
        originalName: files[idx].file.name,
        fileType: files[idx].file.type,
        size: (files[idx].file.size / 1024 / 1024).toFixed(2) + " MB",
      }));

      await fileService.storeFilesMetadata(metadata);
      startPolling();
    } catch (error) {
      const msg =
        error && typeof error === "object" && "message" in error
          ? (error as Error).message
          : "Upload failed";
      showErrorMessage(msg);
    } finally {
      setCurrentUploadId(null);
      setFiles([]);
      refetchFiles();
    }
  };

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
    <div className="space-y-8">
      {/* Drop Zone */}

      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer
          ${
            dragging
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-white"
          }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          processFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          hidden
          onChange={(e) => processFiles(e.target.files)}
        />

        <div className="space-y-2">
          <p className="text-xl font-semibold">Drag & Drop Files</p>

          <p className="text-slate-500">Images and Videos only</p>

          <button className="bg-blue-600 text-white px-5 py-2 rounded-lg">
            Browse Files
          </button>
        </div>
      </div>

      {/* Selected Files */}

      {files.length > 0 && (
        <>
          <div>
            <h2 className="font-bold text-xl mb-4">Selected Files</h2>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {files.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border rounded-xl p-4 shadow-sm"
                >
                  {item.type.startsWith("image") ? (
                    <img
                      src={item.preview}
                      className="h-48 w-full object-cover rounded-lg"
                    />
                  ) : (
                    <video
                      src={item.preview}
                      className="h-48 w-full rounded-lg"
                      controls
                    />
                  )}

                  <div className="mt-4">
                    <p className="font-medium truncate">{item.file.name}</p>

                    <p className="text-sm text-slate-500">{item.size}</p>

                    <p className="text-sm text-slate-500">{item.type}</p>

                    {currentUploadId === item.id && isUploading && (
                      <div className="mt-2">
                        <div className="w-full h-2 bg-slate-200 rounded">
                          <div className="bg-blue-500 h-2 rounded animate-pulse" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="bg-green-600 text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Upload Files"}
          </button>
        </>
      )}

      {/* Uploaded Files */}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Gallery</h2>
          {isPolling && (
            <span className="text-sm font-medium text-blue-600 animate-pulse">
              Processing files...
            </span>
          )}
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
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="group block bg-white border rounded-xl overflow-hidden shadow-sm transition hover:shadow-lg"
              >
                {file.fileType?.startsWith("image") ? (
                  <div className="relative">
                    <img
                      src={file.downloadUrl}
                      alt={file.originalName}
                      className="h-40 w-full object-cover rounded-t-xl transition duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="h-40 w-full bg-slate-100 rounded-t-xl overflow-hidden relative">
                    {/* <video
                      src={file.downloadUrl}
                      controls
                      className="h-full w-full object-cover"
                    /> */}
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
                    <p className="font-semibold text-slate-900 truncate text-xs">
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
                  <p className="text-sm text-slate-500">{file.size}</p>
                  <p className="text-sm text-slate-500">{file.fileType}</p>
                  {file.downloadUrl && file.status === "complete" && (
                    <button
                      onClick={(e) =>
                        handleDownload(file.downloadUrl, file.originalName, e)
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
    </div>
  );
}

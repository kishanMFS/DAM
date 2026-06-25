import { useRef, useState } from "react";
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

export default function UploadSection() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch uploaded files
  const { data: fileListData, refetch: refetchFiles } = useApi<{
    files: UploadFileResponse[];
  }>({
    queryKey: ["getfiles"],
    url: "/assets",
    method: "GET",
    enabled: true,
  });

  const uploadedFiles = fileListData?.files ?? fileListData?.data ?? [];

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

  const handleDownload = async (url: string, fileName: string, e) => {
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
        <h2 className="text-xl font-bold mb-4">Uploaded Files</h2>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {uploadedFiles.map((file) => (
            <a
              key={file.id}
              //   href={file.downloadUrl}
              target="_blank"
              rel="noreferrer noopener"
              download
              className="group block bg-white border rounded-xl overflow-hidden shadow-sm transition hover:shadow-lg"
            >
              {file.mime_type.startsWith("image") ? (
                <img
                  src={file.downloadUrl}
                  alt={file.original_name}
                  className="h-40 w-full object-cover rounded-t-xl transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="h-40 w-full bg-slate-100 rounded-t-xl overflow-hidden">
                  <video
                    src={file.downloadUrl}
                    controls
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900 truncate">
                    {file.original_name}
                  </p>
                  <span
                    className="text-xs font-semibold uppercase cursor-pointer tracking-wide text-blue-600"
                    onClick={(e) =>
                      handleDownload(file.downloadUrl, file.original_name, e)
                    }
                  >
                    Download
                  </span>
                </div>
                <p className="text-sm text-slate-500">{file.file_size}</p>
                <p className="text-sm text-slate-500">{file.mime_type}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

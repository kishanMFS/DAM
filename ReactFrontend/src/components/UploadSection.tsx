import { useState } from "react";
import type { ActiveUploadProgress, UploadFile } from "../types/fileTypes";
import fileService from "../services/fileService";
import useErrorContext from "../hooks/useError";
import UploadDropZone from "./UploadDropZone";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
type UploadSectionProps = {
  onUploadComplete: (objectNames: string[]) => void;
  onProgress: (upload: ActiveUploadProgress) => void;
};

export default function UploadSection({
  onUploadComplete,
  onProgress,
}: UploadSectionProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { showErrorMessage } = useErrorContext();

  const validateFile = (file: File): string | null => {
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/matroska",
    ];

    if (!validTypes.includes(file.type)) {
      return `${file.name} is not a supported file type`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} exceeds the 500 MB size limit`;
    }

    return null;
  };

  const processFiles = (incomingFiles: FileList | null) => {
    if (!incomingFiles) return;

    const newFiles: UploadFile[] = [];
    const errors: string[] = [];

    Array.from(incomingFiles).forEach((file) => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(validationError);
        return;
      }

      newFiles.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        size: file.size / 1024 / 1024,
        type: file.type,
      });
    });

    setFiles((prev) => [...prev, ...newFiles]);
    if (errors.length > 0) showErrorMessage(errors.join(". "));
  };

  const handleUpload = async () => {
    if (isUploading || files.length === 0) return;

    setIsUploading(true);

    try {
      const presignedUrls = await fileService.getPresignedUrls(
        files.map((item) => ({
          fileName: item.file.name,
          mimeType: item.file.type,
        })),
      );

      if (presignedUrls.data.length !== files.length) {
        throw new Error("Could not create an upload URL for every file");
      }

      await Promise.all(
        files.map((item, index) => {
          const presigned = presignedUrls.data[index];

          return fileService
            .uploadFileToPresignedUrl(
              presigned.presignedUrl,
              item.file,
              item.type,
              (uploadProgress) => {
                onProgress({
                  id: item.id,
                  objectName: presigned.objectName,
                  originalName: item.file.name,
                  preview: item.preview,
                  mimeType: item.type,
                  size: item.size,
                  progress: uploadProgress,
                  uploaded: false,
                });
              },
            )
            .then(() => {
              onProgress({
                id: item.id,
                objectName: presigned.objectName,
                originalName: item.file.name,
                preview: item.preview,
                mimeType: item.type,
                size: item.size,
                progress: 100,
                uploaded: true,
              });
            });
        }),
      );

      // build metadata to store in node
      const metadata = files.map((item, index) => ({
        objectName: presignedUrls.data[index].objectName,
        originalName: item.file.name,
        fileType: item.file.type,
        size: item.file.size / 1024 / 1024,
      }));
      await fileService.storeFilesMetadata(metadata);
      files.forEach((item) => URL.revokeObjectURL(item.preview));
      setFiles([]);
      onUploadComplete(metadata.map((file) => file.objectName));
    } catch (error) {
      const msg =
        error && typeof error === "object" && "message" in error
          ? (error as Error).message
          : "Upload failed";
      showErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <UploadDropZone
        disabled={isUploading}
        dragging={dragging}
        onFilesSelected={processFiles}
        onDragStateChange={setDragging}
        onDropFiles={(incomingFiles) => processFiles(incomingFiles)}
      />

      {/* Selected Files */}

      {files.length > 0 && (
        <>
          <div>
            <h2 className="font-bold text-xl mb-4">Selected Files</h2>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {files.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border bg-white p-3 shadow-sm"
                >
                  <div className="h-28 overflow-hidden rounded-lg bg-slate-100">
                    {item.type.startsWith("image") ? (
                      <img
                        src={item.preview}
                        alt={`Preview of ${item.file.name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <video
                        src={item.preview}
                        aria-label={`Preview of ${item.file.name}`}
                        className="h-full w-full object-cover"
                        controls
                      />
                    )}
                  </div>

                  <div className="mt-3">
                    <p
                      className="truncate text-xs font-semibold"
                      title={item.file.name}
                    >
                      {item.file.name}
                    </p>

                    <p className="text-xs text-slate-500">
                      {Number(item.size).toFixed(2)} MB
                    </p>

                    <p
                      className="truncate text-xs text-slate-500"
                      title={item.type}
                    >
                      {item.type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="rounded-lg bg-green-700 px-6 py-3 text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload Files"}
          </button>
        </>
      )}
    </div>
  );
}

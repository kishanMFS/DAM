import { useRef, useState } from "react";
import type { ActiveUploadProgress, UploadFile } from "../types/fileTypes";
import fileService from "../services/fileService";

import useErrorContext from "../hooks/useError";

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

  const inputRef = useRef<HTMLInputElement>(null);

  const { showErrorMessage } = useErrorContext();

  const validateFile = (file: File) => {
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
        size: file.size / 1024 / 1024,
        type: file.type,
      });
    });

    setFiles((prev) => [...prev, ...newFiles]);
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
          if (!isUploading) processFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          if (!isUploading) inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          hidden
          disabled={isUploading}
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

                    <p className="text-sm text-slate-500">
                      {Number(item.size).toFixed(2)} MB
                    </p>

                    <p className="text-sm text-slate-500">{item.type}</p>
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
    </div>
  );
}

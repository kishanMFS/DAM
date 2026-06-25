import { useRef, useState } from "react";
import type { UploadFile } from "../types/fileTypes";
import { useApi } from "../hooks/useAPI";
import type { UploadFileResponse } from "../services/fileService";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

export default function UploadSection() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch uploaded files from WinIO
  const { data: fileListData, refetch: refetchFiles } = useApi<{
    files: UploadFileResponse[];
  }>({
    queryKey: ["files"],
    url: "/api/assets",
    method: "GET",
    enabled: true,
  });

  const uploadedFiles = fileListData?.files ?? [];

  // Handle file upload mutation
  const { mutateAsync: uploadFileMutation, isPending: isUploading } = useApi({
    url: "/api/assets/upload",
    method: "POST",
  });

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
    for (const item of files) {
      try {
        setCurrentUploadId(item.id);
        const formData = new FormData();
        formData.append("file", item.file);

        await uploadFileMutation(formData);
      } catch (error) {
        console.error("Upload failed:", error);
      } finally {
        setCurrentUploadId(null);
      }
    }

    setFiles([]);
    refetchFiles();
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
            <div key={file.id} className="bg-white border rounded-xl p-4">
              {file.fileType.startsWith("image") ? (
                <img
                  src={file.url}
                  className="h-40 w-full object-cover rounded"
                />
              ) : (
                <video
                  src={file.url}
                  controls
                  className="h-40 w-full rounded"
                />
              )}

              <div className="mt-3">
                <p>{file.originalName}</p>
                <p className="text-sm text-slate-500">{file.size}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

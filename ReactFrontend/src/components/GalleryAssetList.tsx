import type { UploadFileResponse } from "../services/fileService";
import type { ActiveUploadProgress } from "../types/fileTypes";

export type GalleryPreviewMedia = {
  src: string;
  title: string;
  mimeType: string;
  fileId?: string;
};

type GalleryAssetListProps = {
  files: UploadFileResponse[];
  pendingUploads: ActiveUploadProgress[];
  isAdmin: boolean;
  deletingAssetIds: string[];
  onPreview: (media: GalleryPreviewMedia) => void;
  onDownload: (fileId: string, url: string, fileName: string) => void;
  onDelete: (file: UploadFileResponse) => void;
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

const VideoPlayer = ({ src, title }: { src: string; title: string }) => (
  <video
    src={src}
    controls
    aria-label={title}
    className="h-full w-full object-cover"
  />
);

export default function GalleryAssetList({
  files,
  pendingUploads,
  isAdmin,
  deletingAssetIds,
  onPreview,
  onDownload,
  onDelete,
}: GalleryAssetListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {pendingUploads.map((upload) => (
        <article
          key={upload.id}
          className="group overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-lg"
        >
          <div className="h-28 overflow-hidden rounded-t-xl bg-slate-100">
            {upload.mimeType.startsWith("image") ? (
              <button
                type="button"
                onClick={() =>
                  onPreview({
                    src: upload.preview,
                    title: upload.originalName,
                    mimeType: upload.mimeType,
                  })
                }
                aria-label={`Preview ${upload.originalName}`}
                className="h-full w-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600"
              >
                <img
                  src={upload.preview}
                  alt={upload.originalName}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </button>
            ) : (
              <VideoPlayer src={upload.preview} title={upload.originalName} />
            )}
          </div>

          <div className="p-3">
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
            <p className="text-xs text-slate-500">
              {upload.size.toFixed(2)} MB
            </p>
            <p
              className="truncate text-xs text-slate-500"
              title={upload.mimeType}
            >
              {upload.mimeType}
            </p>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs">
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
            {!upload.mimeType.startsWith("image") && (
              <button
                type="button"
                onClick={() =>
                  onPreview({
                    src: upload.preview,
                    title: upload.originalName,
                    mimeType: upload.mimeType,
                  })
                }
                className="mt-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                Preview {upload.originalName}
              </button>
            )}
          </div>
        </article>
      ))}

      {files.map((file) => {
        const isImage = file.mime_type?.startsWith("image") ?? false;
        const mediaType = file.mime_type ?? "application/octet-stream";

        return (
          <article
            key={file.id}
            className="group overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-lg"
          >
            <div className="relative h-28 overflow-hidden rounded-t-xl bg-slate-100">
              {isImage ? (
                <button
                  type="button"
                  onClick={() =>
                    onPreview({
                      src: file.downloadUrl,
                      title: file.original_name,
                      mimeType: mediaType,
                      fileId: file.id,
                    })
                  }
                  aria-label={`Preview ${file.original_name}`}
                  className="h-full w-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600"
                >
                  <img
                    src={file.downloadUrl}
                    alt={file.original_name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </button>
              ) : (
                <VideoPlayer
                  src={file.downloadUrl}
                  title={file.original_name}
                />
              )}
            </div>

            <div className="p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p
                  className="truncate text-xs font-semibold text-slate-900"
                  title={file.original_name}
                >
                  {file.original_name}
                </p>
                {file.status === "complete" && (
                  <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                    Done
                  </span>
                )}
                {file.status === "error" && (
                  <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                    Error
                  </span>
                )}
                {file.status === "processing" && (
                  <span
                    role="status"
                    aria-live="polite"
                    className="animate-pulse rounded bg-blue-100 px-2 py-1 text-xs text-blue-700"
                  >
                    Processing
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {Number(file.file_size).toFixed(2)} MB
              </p>
              <p
                className="truncate text-xs text-slate-500"
                title={file.mime_type}
              >
                {file.mime_type}
              </p>
              {getResolution(file) && (
                <p className="text-xs text-slate-500">
                  Resolution: {getResolution(file)}
                </p>
              )}

              {isDerivedAsset(file) &&
                file.status !== "complete" &&
                file.progress !== undefined && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
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

              <div className="mt-2 flex items-center justify-between gap-2">
                {file.downloadUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      onDownload(file.id, file.downloadUrl, file.original_name)
                    }
                    aria-label={`Download ${file.original_name}`}
                    className="cursor-pointer rounded px-2 py-2 text-xs font-semibold uppercase tracking-wide text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    Download
                  </button>
                )}
                {!isImage && (
                  <button
                    type="button"
                    onClick={() =>
                      onPreview({
                        src: file.downloadUrl,
                        title: file.original_name,
                        mimeType: mediaType,
                        fileId: file.id,
                      })
                    }
                    aria-label={`Preview ${file.original_name}`}
                    className="rounded px-2 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    Preview
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onDelete(file)}
                    disabled={deletingAssetIds.includes(file.id)}
                    aria-label={`Delete ${file.original_name}`}
                    title="Delete asset and generated variants"
                    className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingAssetIds.includes(file.id) ? (
                      <span aria-hidden="true" className="text-xs">
                        ...
                      </span>
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
          </article>
        );
      })}
    </div>
  );
}

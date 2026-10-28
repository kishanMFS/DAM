import { useRef } from "react";

type UploadDropZoneProps = {
  disabled: boolean;
  dragging: boolean;
  onFilesSelected: (files: FileList | null) => void;
  onDragStateChange: (dragging: boolean) => void;
  onDropFiles: (files: FileList) => void;
};

export default function UploadDropZone({
  disabled,
  dragging,
  onFilesSelected,
  onDragStateChange,
  onDropFiles,
}: UploadDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        disabled={disabled}
        tabIndex={-1}
        aria-label="Choose image or video files"
        className="sr-only"
        onChange={(event) => {
          onFilesSelected(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label="Choose or drop image and video files"
        onDragOver={(event) => {
          event.preventDefault();
          onDragStateChange(true);
        }}
        onDragLeave={() => onDragStateChange(false)}
        onDrop={(event) => {
          event.preventDefault();
          onDragStateChange(false);
          if (!disabled) onDropFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`w-full rounded-2xl border-2 border-dashed p-4 text-center transition focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 sm:p-5 disabled:cursor-not-allowed disabled:opacity-60 ${
          dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"
        }`}
      >
        <span className="block space-y-2">
          <span className="block text-lg font-semibold">
            Drag &amp; Drop Files
          </span>
          <span className="block text-sm text-slate-600">
            Images and videos only. Choose files or drop them here.
          </span>
          <span className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
            Browse Files
          </span>
        </span>
      </button>
    </div>
  );
}

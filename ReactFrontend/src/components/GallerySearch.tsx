type GallerySearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function GallerySearch({ value, onChange }: GallerySearchProps) {
  return (
    <div className="flex w-full flex-col gap-1 sm:max-w-sm sm:flex-row sm:items-center sm:gap-3">
      <label
        htmlFor="gallery-search"
        className="text-sm font-medium text-slate-700 sm:whitespace-nowrap"
      >
        Search files by tags
      </label>
      <input
        id="gallery-search"
        type="search"
        placeholder="Search files by tags..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

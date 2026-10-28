type GalleryPaginationProps = {
  offset: number;
  pageSize: number;
  total: number;
  onPageChange: (offset: number) => void;
};

export default function GalleryPagination({
  offset,
  pageSize,
  total,
  onPageChange,
}: GalleryPaginationProps) {
  if (total <= pageSize) return null;

  const firstItem = offset + 1;
  const lastItem = Math.min(offset + pageSize, total);

  return (
    <nav
      aria-label="Gallery pagination"
      className="mt-6 flex items-center justify-between gap-4"
    >
      <p className="text-sm text-slate-600">
        Showing {firstItem}-{lastItem} of {total}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, offset - pageSize))}
          disabled={offset === 0}
          aria-label="Previous gallery page"
          className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(offset + pageSize)}
          disabled={offset + pageSize >= total}
          aria-label="Next gallery page"
          className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

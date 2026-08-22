"use client";

import { cn } from "@/lib/cn";

interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const BTN_BASE = "focus-ring px-3 py-2 text-sm font-medium rounded-card-inline border transition-colors";
const BTN_INACTIVE =
  "text-[var(--ink-body)] border-[var(--rule-soft)] hover:bg-[var(--accent-fill)] hover:text-[var(--accent)]";
const BTN_ACTIVE = "bg-[var(--accent)] text-white border-[var(--accent)]";
const BTN_DISABLED = "text-[var(--ink-muted)] opacity-50 border-[var(--rule-soft)] cursor-not-allowed";

export function SearchPagination({
  currentPage,
  totalPages,
  onPageChange,
}: SearchPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // 全ページを表示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 現在のページを中心に表示
      let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const end = Math.min(totalPages, start + maxVisiblePages - 1);

      // 調整
      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center space-x-2 py-8">
      {/* 前のページ */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(BTN_BASE, currentPage === 1 ? BTN_DISABLED : BTN_INACTIVE)}
      >
        前へ
      </button>

      {/* 最初のページ */}
      {pageNumbers[0] && pageNumbers[0] > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className={cn(BTN_BASE, BTN_INACTIVE)}>
            1
          </button>
          {pageNumbers[0] && pageNumbers[0] > 2 && (
            <span className="px-2 py-2 text-[var(--ink-muted)]">...</span>
          )}
        </>
      )}

      {/* ページ番号 */}
      {pageNumbers.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={cn(BTN_BASE, page === currentPage ? BTN_ACTIVE : BTN_INACTIVE)}
        >
          {page}
        </button>
      ))}

      {/* 最後のページ */}
      {(() => {
        const lastPage = pageNumbers.length > 0 ? pageNumbers[pageNumbers.length - 1] : undefined;
        return lastPage && lastPage < totalPages ? (
          <>
            {lastPage < totalPages - 1 && (
              <span className="px-2 py-2 text-[var(--ink-muted)]">...</span>
            )}
            <button onClick={() => onPageChange(totalPages)} className={cn(BTN_BASE, BTN_INACTIVE)}>
              {totalPages}
            </button>
          </>
        ) : null;
      })()}

      {/* 次のページ */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(BTN_BASE, currentPage === totalPages ? BTN_DISABLED : BTN_INACTIVE)}
      >
        次へ
      </button>
    </div>
  );
}

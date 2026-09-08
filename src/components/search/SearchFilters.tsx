"use client";

import { cn } from "@/lib/cn";
import { getAllCategories } from "@/lib/categories";

interface SearchFiltersProps {
  category: string;
  onCategoryChange: (category: string) => void;
  onReset: () => void;
  hasQuery: boolean;
}

const CATEGORIES = getAllCategories().filter(c => c.visible !== false).map(c => ({ value: c.slug, label: c.label }));

export function SearchFilters({
  category,
  onCategoryChange,
  onReset,
  hasQuery,
}: SearchFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onCategoryChange("")}
        aria-pressed={!category}
        className={cn(
          "min-h-11 px-3 py-2 text-sm rounded-full border transition-colors",
          "focus-ring",
          !category
            ? "bg-[var(--accent)] text-white dark:text-[var(--bg)] border-[var(--accent)]"
            : "bg-[var(--paper)] text-[var(--ink-body)] border-[var(--rule-soft)] hover:bg-[var(--accent-fill)] hover:text-[var(--accent)]"
        )}
      >
        すべて
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onCategoryChange(cat.value)}
          aria-pressed={category === cat.value}
          className={cn(
            "min-h-11 px-3 py-2 text-sm rounded-full border transition-colors",
            "focus-ring",
            category === cat.value
              ? "bg-[var(--accent)] text-white dark:text-[var(--bg)] border-[var(--accent)]"
              : "bg-[var(--paper)] text-[var(--ink-body)] border-[var(--rule-soft)] hover:bg-[var(--accent-fill)] hover:text-[var(--accent)]"
          )}
        >
          {cat.label}
        </button>
      ))}
      {category && <button onClick={() => onCategoryChange("")} className="focus-ring min-h-11 px-3 py-2 text-sm text-[var(--accent)] underline">資格のみ解除</button>}
      {(category || hasQuery) && (
        <button
          onClick={onReset}
          className="focus-ring min-h-11 rounded-card-inline px-3 py-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
        >
          検索をリセット
        </button>
      )}
    </div>
  );
}

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
            ? "bg-(--accent) text-white dark:text-(--bg) border-(--accent)"
            : "bg-(--paper) text-(--ink-body) border-(--rule-soft) hover:bg-(--accent-fill) hover:text-(--accent)"
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
              ? "bg-(--accent) text-white dark:text-(--bg) border-(--accent)"
              : "bg-(--paper) text-(--ink-body) border-(--rule-soft) hover:bg-(--accent-fill) hover:text-(--accent)"
          )}
        >
          {cat.label}
        </button>
      ))}
      {category && <button onClick={() => onCategoryChange("")} className="focus-ring min-h-11 px-3 py-2 text-sm text-(--accent) underline">資格のみ解除</button>}
      {(category || hasQuery) && (
        <button
          onClick={onReset}
          className="focus-ring min-h-11 rounded-card-inline px-3 py-2 text-sm text-(--ink-muted) hover:text-(--ink) transition-colors"
        >
          検索をリセット
        </button>
      )}
    </div>
  );
}

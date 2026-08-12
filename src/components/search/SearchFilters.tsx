"use client";

import { cn } from "@/lib/cn";

interface SearchFiltersProps {
  category: string;
  onCategoryChange: (category: string) => void;
  onReset: () => void;
}

const CATEGORIES = [
  { value: "civil-construction-1", label: "1級土木施工管理技士" },
  { value: "civil-construction-2", label: "2級土木施工管理技士" },
  { value: "pe-comprehensive-management", label: "技術士（総合技術監理部門）" },
  { value: "concrete-chief-engineer", label: "コンクリート主任技士" },
  { value: "concrete-diagnostician", label: "コンクリート診断士" },
];

export function SearchFilters({
  category,
  onCategoryChange,
  onReset,
}: SearchFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onCategoryChange("")}
        className={cn(
          "px-3 py-1.5 text-sm rounded-full border transition-colors",
          "focus-ring",
          !category
            ? "bg-[var(--accent)] text-white border-[var(--accent)]"
            : "bg-[var(--paper)] text-[var(--ink-body)] border-[var(--rule-soft)] hover:bg-[var(--accent-fill)] hover:text-[var(--accent)]"
        )}
      >
        すべて
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onCategoryChange(cat.value)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full border transition-colors",
            "focus-ring",
            category === cat.value
              ? "bg-[var(--accent)] text-white border-[var(--accent)]"
              : "bg-[var(--paper)] text-[var(--ink-body)] border-[var(--rule-soft)] hover:bg-[var(--accent-fill)] hover:text-[var(--accent)]"
          )}
        >
          {cat.label}
        </button>
      ))}
      {category && (
        <button
          onClick={onReset}
          className="focus-ring rounded-card-inline px-3 py-1.5 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
        >
          リセット
        </button>
      )}
    </div>
  );
}

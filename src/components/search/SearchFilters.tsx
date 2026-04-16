"use client";

import { cn } from "@/lib/cn";

interface SearchFiltersProps {
  category: string;
  tags: string[];
  sortBy: "relevance";
  onFilterChange: (filterType: string, value: string | string[]) => void;
  onReset: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

const CATEGORIES = [
  { value: "civil-construction-1", label: "1級土木施工管理技士" },
  { value: "pe-comprehensive-management", label: "技術士（総合技術監理部門）" },
];

export function SearchFilters({
  category,
  tags,
  onFilterChange,
  onReset,
}: SearchFiltersProps) {
  const handleCategoryChange = (newCategory: string) => {
    onFilterChange("category", newCategory);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => handleCategoryChange("")}
        className={cn(
          "px-3 py-1.5 text-sm rounded-full border transition-colors",
          !category
            ? "bg-primary-500 text-white border-primary-500"
            : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
        )}
      >
        すべて
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => handleCategoryChange(cat.value)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full border transition-colors",
            category === cat.value
              ? "bg-primary-500 text-white border-primary-500"
              : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
          )}
        >
          {cat.label}
        </button>
      ))}
      {category && (
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          リセット
        </button>
      )}
    </div>
  );
}

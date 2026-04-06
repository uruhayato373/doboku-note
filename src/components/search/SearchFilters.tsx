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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        フィルター
      </h3>

      {/* カテゴリ */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          カテゴリ
        </label>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleCategoryChange("")}
            className={cn(
              "px-3 py-1.5 text-sm rounded border transition-colors text-left",
              !category
                ? "bg-blue-500 text-white border-blue-500"
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
                "px-3 py-1.5 text-sm rounded border transition-colors text-left",
                category === cat.value
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* リセットボタン */}
      <div className="flex justify-end">
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          リセット
        </button>
      </div>
    </div>
  );
}

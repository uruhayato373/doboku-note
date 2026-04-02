"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface SearchFiltersProps {
  category: string;
  subCategory: string;
  tags: string[];
  sortBy: "relevance" | "date" | "readTime";
  onFilterChange: (filterType: string, value: string | string[]) => void;
  onReset: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export function SearchFilters({
  category,
  subCategory,
  tags,
  sortBy,
  onFilterChange,
  onReset,
  showFilters,
  onToggleFilters,
}: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCategoryChange = (newCategory: string) => {
    onFilterChange('category', newCategory);
  };

  const handleSubCategoryChange = (newSubCategory: string) => {
    onFilterChange('subCategory', newSubCategory);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];

    onFilterChange('tags', newTags);
  };

  const handleSortChange = (newSortBy: "relevance" | "date" | "readTime") => {
    onFilterChange('sortBy', newSortBy);
  };

  const resetFilters = () => {
    onReset();
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          検索フィルター
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 text-sm"
        >
          {isExpanded ? "閉じる" : "詳細"}
        </button>
      </div>

      {/* カテゴリ */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          カテゴリ
        </label>
        <div className="flex space-x-2">
          <button
            onClick={() => handleCategoryChange("")}
            className={cn(
              "px-3 py-1 text-sm rounded border transition-colors",
              !category
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            )}
          >
            すべて
          </button>
          <button
            onClick={() => handleCategoryChange("イケオジ")}
            className={cn(
              "px-3 py-1 text-sm rounded border transition-colors",
              category === "イケオジ"
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            )}
          >
            イケオジ
          </button>
          <button
            onClick={() => handleCategoryChange("シゴデキ")}
            className={cn(
              "px-3 py-1 text-sm rounded border transition-colors",
              category === "シゴデキ"
                ? "bg-primary-500 text-white border-primary-500"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            )}
          >
            シゴデキ
          </button>
        </div>
      </div>

      {/* サブカテゴリ */}
      {category && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            サブカテゴリ
          </label>
          <div className="flex flex-wrap gap-2">
            {category === "イケオジ" ? (
              <>
                <button
                  onClick={() => handleSubCategoryChange("美容・服装")}
                  className={cn(
                    "px-3 py-1 text-sm rounded border transition-colors",
                    subCategory === "美容・服装"
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  )}
                >
                  美容・服装
                </button>
                <button
                  onClick={() => handleSubCategoryChange("健康管理")}
                  className={cn(
                    "px-3 py-1 text-sm rounded border transition-colors",
                    subCategory === "健康管理"
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  )}
                >
                  健康管理
                </button>
                <button
                  onClick={() => handleSubCategoryChange("ライフスタイル")}
                  className={cn(
                    "px-3 py-1 text-sm rounded border transition-colors",
                    subCategory === "ライフスタイル"
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  )}
                >
                  ライフスタイル
                </button>
              </>
            ) : category === "シゴデキ" ? (
              <>
                <button
                  onClick={() => handleSubCategoryChange("仕事効率化")}
                  className={cn(
                    "px-3 py-1 text-sm rounded border transition-colors",
                    subCategory === "仕事効率化"
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  )}
                >
                  仕事効率化
                </button>
                <button
                  onClick={() => handleSubCategoryChange("投資・副業")}
                  className={cn(
                    "px-3 py-1 text-sm rounded border transition-colors",
                    subCategory === "投資・副業"
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  )}
                >
                  投資・副業
                </button>
                <button
                  onClick={() => handleSubCategoryChange("キャリア戦略")}
                  className={cn(
                    "px-3 py-1 text-sm rounded border transition-colors",
                    subCategory === "キャリア戦略"
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  )}
                >
                  キャリア戦略
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* 並び順 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          並び順
        </label>
        <select
          value={sortBy}
          onChange={(e) =>
            handleSortChange(
              e.target.value as "relevance" | "date" | "readTime"
            )
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="relevance">関連度順</option>
          <option value="date">日付順</option>
          <option value="readTime">読了時間順</option>
        </select>
      </div>

      {/* リセットボタン */}
      <div className="flex justify-end">
        <button
          onClick={resetFilters}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          フィルターをリセット
        </button>
      </div>
    </div>
  );
}

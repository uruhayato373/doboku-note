"use client";

import { useState, useRef, useEffect } from "react";
import { useSearch } from "@/hooks/useSearch";
import { cn } from "@/lib/cn";

interface SearchBoxProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  compact?: boolean;
}

export function SearchBox({
  className,
  placeholder = "記事を検索...",
  onSearch,
  onFocus,
  onBlur,
  compact = false,
}: SearchBoxProps) {
  const { query, setQuery, suggestions, fetchSuggestions, isLoading } =
    useSearch();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 入力値の変更処理
  const handleInputChange = (value: string) => {
    setInputValue(value);

    if (value.trim()) {
      fetchSuggestions(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // 検索実行
  const handleSearch = (searchQuery: string = inputValue) => {
    if (searchQuery.trim()) {
      setQuery(searchQuery);
      onSearch?.(searchQuery);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Enterキーでの検索
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // 検索候補の選択
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSearch(suggestion);
  };

  // 検索クリア
  const handleClear = () => {
    setInputValue("");
    setQuery("");
    setShowSuggestions(false);
    onSearch?.("");
  };

  // 外部クリックで候補を閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // クエリが外部から変更された場合の同期
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center pointer-events-none",
            compact ? "pl-2" : "pl-3"
          )}
        >
          <svg
            className={cn("text-gray-400", compact ? "h-4 w-4" : "h-5 w-5")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            onFocus?.();
            if (inputValue.trim()) setShowSuggestions(true);
          }}
          onBlur={onBlur}
          placeholder={placeholder}
          className={cn(
            "block w-full border border-gray-300 rounded-lg",
            "focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            "dark:bg-gray-700 dark:border-gray-600 dark:text-white",
            "dark:focus:ring-primary-400 dark:focus:border-primary-400",
            "transition-colors duration-200",
            compact ? "pl-8 pr-8 py-2 text-sm" : "pl-10 pr-10 py-2"
          )}
        />

        {inputValue && (
          <button
            onClick={handleClear}
            className={cn(
              "absolute inset-y-0 right-0 flex items-center",
              compact ? "pr-2" : "pr-3"
            )}
          >
            <svg
              className={cn(
                "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors",
                compact ? "h-4 w-4" : "h-5 w-5"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 検索候補 */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg"
        >
          <ul className="py-1">
            {suggestions.map((suggestion, index) => (
              <li key={index}>
                <button
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300",
                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                    "focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none",
                    "transition-colors duration-150"
                  )}
                >
                  <div className="flex items-center">
                    <svg
                      className="h-4 w-4 text-gray-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span>{suggestion}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ローディングインジケーター */}
      {isLoading && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center",
            compact ? "pr-2" : "pr-3"
          )}
        >
          <div className="animate-spin rounded h-4 w-4 border-b-2 border-primary-500"></div>
        </div>
      )}
    </div>
  );
}

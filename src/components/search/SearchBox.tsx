"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/cn";

interface SearchBoxProps {
  className?: string;
  placeholder?: string;
  value?: string;
  onChange?: (query: string) => void;
  onSearch?: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  compact?: boolean;
}

export function SearchBox({
  className,
  placeholder = "記事を検索...",
  value,
  onChange,
  onSearch,
  onFocus,
  onBlur,
  compact = false,
}: SearchBoxProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputValue = value ?? uncontrolledValue;
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const { getSuggestions } = await import("@/lib/search/search-client");
      setSuggestions(await getSuggestions(input, 5));
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleInputChange = (value: string) => {
    onChange?.(value);
    if (onChange === undefined) {
      setUncontrolledValue(value);
    }
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
      onSearch?.(searchQuery);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Enterキーでの検索（IME 変換中の Enter は無視）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      handleSearch();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // 検索候補の選択
  const handleSuggestionClick = (suggestion: string) => {
    handleInputChange(suggestion);
    handleSearch(suggestion);
  };

  // 検索クリア
  const handleClear = () => {
    onChange?.("");
    if (onChange === undefined) {
      setUncontrolledValue("");
    }
    setSuggestions([]);
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
            className={cn("text-[var(--ink-muted)]", compact ? "h-4 w-4" : "h-5 w-5")}
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
            "block w-full bg-[var(--paper)] text-[var(--ink)] border border-[var(--rule-soft)] rounded-card-content",
            "focus-ring focus:border-[var(--accent)]",
            "placeholder:text-[var(--ink-muted)]",
            "transition-colors duration-200",
            compact ? "pl-8 pr-8 py-2 text-sm" : "pl-10 pr-10 py-2"
          )}
        />

        {inputValue && (
          <button
            onClick={handleClear}
            className={cn(
              "focus-ring absolute inset-y-0 right-0 flex items-center rounded-card-inline",
              compact ? "pr-2" : "pr-3"
            )}
          >
            <svg
              className={cn(
                "text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors",
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
          className="card-surface-content absolute z-50 mt-1 w-full shadow-lift"
        >
          <ul className="py-1">
            {suggestions.map((suggestion, index) => (
              <li key={index}>
                <button
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm text-[var(--ink-body)]",
                    "hover:bg-[var(--accent-fill)] hover:text-[var(--accent)]",
                    "focus-ring focus:bg-[var(--accent-fill)]",
                    "transition-colors duration-150"
                  )}
                >
                  <div className="flex items-center">
                    <svg
                      className="h-4 w-4 text-[var(--ink-muted)] mr-2"
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
    </div>
  );
}

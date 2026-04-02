"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchBox } from "./SearchBox";
import { cn } from "@/lib/cn";

interface SidebarSearchProps {
  className?: string;
}

export function SidebarSearch({ className }: SidebarSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  const handleSearch = (query: string) => {
    if (query.trim()) {
      // 検索ページに遷移
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleBlur = () => {
    // 少し遅延させてから閉じる（候補クリックのため）
    setTimeout(() => setIsExpanded(false), 200);
  };

  return (
    <div className={cn("mb-6", className)}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          記事検索
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          キーワードで記事を探す
        </p>
      </div>

      <div
        className={cn(
          "transition-all duration-200 ease-in-out",
          isExpanded ? "scale-105" : "scale-100"
        )}
      >
        <SearchBox
          placeholder="検索..."
          onSearch={handleSearch}
          onFocus={handleFocus}
          onBlur={handleBlur}
          compact={true}
          className="w-full"
        />
      </div>

    </div>
  );
}

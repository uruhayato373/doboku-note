"use client";

import { useScrollSpy } from "@/hooks/useScrollSpy";
import { scrollToHeading } from "@/utils/scrollUtils";
import type { HeadingItem } from "@/types/blog";

interface TableOfContentsProps {
  headings: readonly HeadingItem[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const activeHeading = useScrollSpy(headings);

  if (headings.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          目次
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          目次がありません
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        目次
      </h3>
      <nav className="relative" data-toc-container>
        {/* 縦線（点と点を結ぶ線） */}
        <div
          className="absolute left-[11px] top-[16px] w-[1px] bg-gray-200 dark:bg-gray-700"
          style={{
            height:
              headings.length > 1
                ? `${(headings.length - 1) * 40 + 8}px`
                : "0px",
          }}
        />

        {headings.map((heading, index) => (
          <div key={heading.id} className="relative flex items-start">
            {/* 見出し点 */}
            <div className="flex items-center justify-center w-6 h-10 flex-shrink-0">
              <span
                className={`rounded border-2 border-white dark:border-gray-800 ${
                  heading.level === 2 ? "w-[8px] h-[8px]" : "w-[6px] h-[6px]"
                } ${
                  activeHeading === heading.id
                    ? "bg-primary-600 dark:bg-primary-400"
                    : heading.level === 2
                    ? "bg-primary-400 dark:bg-primary-500"
                    : "bg-primary-300 dark:bg-primary-600"
                }`}
              />
            </div>

            {/* 見出しボタン */}
            <button
              data-heading-id={heading.id}
              onClick={() =>
                heading.id ? scrollToHeading(heading.id) : undefined
              }
              className={`flex-1 text-left py-2 pr-3 transition-all duration-200 ${
                activeHeading === heading.id
                  ? "text-primary-800 dark:text-primary-200 font-medium"
                  : heading.level === 2
                  ? "text-gray-700 dark:text-gray-300 hover:text-primary-700 dark:hover:text-primary-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
              }`}
              style={{
                paddingLeft: heading.level === 3 ? "12px" : "0px",
              }}
            >
              <span
                className={`text-sm leading-relaxed block ${
                  heading.level === 2 ? "font-medium" : "font-normal"
                }`}
              >
                {heading.text}
              </span>
            </button>
          </div>
        ))}
      </nav>
    </div>
  );
}

"use client";

import Link from "next/link";

interface KeywordItem {
  label: string;
  slug?: string;
}

interface RelatedKeywordsProps {
  items: KeywordItem[];
}

export default function RelatedKeywords({ items }: RelatedKeywordsProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="my-5 mx-auto">
      <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
        関連キーワード
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) =>
          item.slug ? (
            <Link
              key={index}
              href={`/docs/pe-comprehensive-management-${item.slug}`}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            >
              {item.label}
            </span>
          )
        )}
      </div>
    </div>
  );
}

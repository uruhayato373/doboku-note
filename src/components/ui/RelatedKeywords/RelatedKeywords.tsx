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

  // Single item: render as inline link tag (for use within sentences)
  if (items.length === 1) {
    const item = items[0]!;
    return item.slug ? (
      <Link
        href={`/docs/pe-comprehensive-management-${item.slug}`}
        className="text-blue-700 dark:text-blue-400 hover:underline font-medium"
      >
        {item.label}
      </Link>
    ) : (
      <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
    );
  }

  // Multiple items: render as inline keyword list
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-1">
      {items.map((item, index) =>
        item.slug ? (
          <Link
            key={index}
            href={`/docs/pe-comprehensive-management-${item.slug}`}
            className="text-sm text-blue-700 dark:text-blue-400 hover:underline"
          >
            {item.label}
            {index < items.length - 1 && <span className="text-gray-400 dark:text-gray-500 ml-1">|</span>}
          </Link>
        ) : (
          <span
            key={index}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {item.label}
            {index < items.length - 1 && <span className="text-gray-300 dark:text-gray-600 ml-1">|</span>}
          </span>
        )
      )}
    </span>
  );
}

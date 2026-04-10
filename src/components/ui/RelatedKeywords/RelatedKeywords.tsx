"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
    <div className="my-5 mx-5 pl-4 py-3 border-l-4 border-[#4c9ac0] dark:border-blue-500">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        <span className="inline-flex items-center text-lg font-bold text-[#4c9ac0] dark:text-blue-400 mr-1">
          関連キーワード
          <ChevronRight className="w-5 h-5 ml-0.5" />
        </span>
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
      </div>
    </div>
  );
}

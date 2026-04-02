'use client';

import Link from 'next/link';
import { getSidebarItemPath } from '@/lib/sidebar';
import type { SidebarItem } from '@/lib/sidebar';

interface GeneratedIndexPageProps {
  title: string;
  items: SidebarItem[];
  docTitleMap: Record<string, string>;
}

export default function GeneratedIndexPage({
  title,
  items,
  docTitleMap,
}: GeneratedIndexPageProps) {
  return (
    <div className="markdown">
      <h1>{title}</h1>
      <div className="grid gap-4 mt-8 grid-cols-1 md:grid-cols-2">
        {items.map((item, i) => {
          if (typeof item === 'string') {
            const parts = item.split('/');
            const label = docTitleMap[item] || parts.pop() || item;
            const href =
              parts[parts.length - 1] === 'index'
                ? '/docs/' + parts.slice(0, -1).join('/')
                : '/docs/' + item;
            return (
              <Link
                key={i}
                href={href}
                className="group block p-5 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:bg-blue-50 transition-all no-underline"
              >
                <h3 className="text-sm font-semibold text-gray-800 group-hover:text-primary transition-colors">
                  {label}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  記事を読む →
                </p>
              </Link>
            );
          }
          if (item.type === 'category') {
            const linkPath = getSidebarItemPath(item);
            return (
              <Link
                key={i}
                href={linkPath || '#'}
                className="group block p-5 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:bg-blue-50 transition-all no-underline"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-primary group-hover:text-primary-dark transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2">
                      {item.items.length} 個のトピック
                    </p>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold ml-2">
                    {item.items.length}
                  </span>
                </div>
              </Link>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

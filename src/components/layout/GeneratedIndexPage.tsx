'use client';

import Link from 'next/link';
import { getSidebarItemPath } from '@/lib/sidebar';
import type { SidebarItem } from '@/lib/sidebar';
import { getDocTitle } from '@/lib/content';

interface GeneratedIndexPageProps {
  title: string;
  items: SidebarItem[];
}

export default function GeneratedIndexPage({
  title,
  items,
}: GeneratedIndexPageProps) {
  return (
    <div className="markdown">
      <h1>{title}</h1>
      <div className="grid gap-3 mt-6">
        {items.map((item, i) => {
          if (typeof item === 'string') {
            const parts = item.split('/');
            const label = getDocTitle(item);
            const href =
              parts[parts.length - 1] === 'index'
                ? '/docs/' + parts.slice(0, -1).join('/')
                : '/docs/' + item;
            return (
              <Link
                key={i}
                href={href}
                className="block p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-sm transition-all no-underline text-gray-700 hover:text-primary"
              >
                {label}
              </Link>
            );
          }
          if (item.type === 'category') {
            const linkPath = getSidebarItemPath(item);
            return (
              <Link
                key={i}
                href={linkPath || '#'}
                className="block p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-sm transition-all no-underline text-gray-700 hover:text-primary"
              >
                <span className="font-semibold">{item.label}</span>
                <span className="text-sm text-gray-400 ml-2">
                  ({item.items.length} items)
                </span>
              </Link>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

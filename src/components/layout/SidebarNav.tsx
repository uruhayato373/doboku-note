'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SidebarTreeItem, SidebarGroupItem } from '@/lib/sidebar';
import { ChevronRight } from 'lucide-react';

interface SidebarNavProps {
  title: string;
  items: SidebarTreeItem[];
  currentSlug: string;
}

function isSlugInGroup(group: SidebarGroupItem, slug: string): boolean {
  return group.items.some(
    (item) => item.type === 'doc' && item.slug === slug
  );
}

function SidebarGroup({
  group,
  currentSlug,
}: {
  group: SidebarGroupItem;
  currentSlug: string;
}) {
  const containsCurrent = isSlugInGroup(group, currentSlug);
  const [open, setOpen] = useState(containsCurrent);

  return (
    <li>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 w-full text-left py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />
        <span className="truncate">{group.label}</span>
      </button>
      {open && (
        <ul className="ml-2 space-y-0.5">
          {group.items.map((item) => {
            if (item.type !== 'doc') return null;
            const isActive = item.slug === currentSlug;
            return (
              <li key={item.slug}>
                <Link
                  href={`/docs/${item.slug}`}
                  className={`block py-1 pl-3 text-sm leading-snug border-l-2 transition-colors duration-150 truncate ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/20'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export default function SidebarNav({ title, items, currentSlug }: SidebarNavProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="サイドバーナビゲーション">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
        {title}
      </h2>
      <ul className="space-y-1 max-h-[calc(100vh-10rem)] overflow-y-auto text-sm">
        {items.map((item, i) => {
          if (item.type === 'group') {
            return <SidebarGroup key={i} group={item} currentSlug={currentSlug} />;
          }
          // doc item at top level (flat list case)
          const isActive = item.slug === currentSlug;
          return (
            <li key={item.slug}>
              <Link
                href={`/docs/${item.slug}`}
                className={`block py-1 pl-3 text-sm leading-snug border-l-2 transition-colors duration-150 truncate ${
                  isActive
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

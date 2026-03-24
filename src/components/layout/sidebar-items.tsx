'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  SidebarItem,
  SidebarItemCategory,
  getSidebarItemPath,
} from '@/lib/sidebar';

type TitleMap = Record<string, string>;

export function SidebarDocItem({
  docId,
  currentPath,
  titleMap,
  onNavigate,
}: {
  docId: string;
  currentPath: string;
  titleMap: TitleMap;
  onNavigate?: () => void;
}) {
  const parts = docId.split('/');
  const label = titleMap[docId] || parts[parts.length - 1];
  const href =
    parts[parts.length - 1] === 'index'
      ? '/docs/' + parts.slice(0, -1).join('/')
      : '/docs/' + docId;
  const isActive = currentPath === href;

  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={`block py-1 px-2 text-xs rounded no-underline transition-colors ${
          isActive
            ? 'bg-gray-200 text-primary font-semibold'
            : 'text-gray-600 hover:bg-gray-100 hover:text-primary'
        }`}
      >
        {label}
      </Link>
    </li>
  );
}

export function SidebarCategoryItem({
  item,
  currentPath,
  depth = 0,
  titleMap,
  onNavigate,
}: {
  item: SidebarItemCategory;
  currentPath: string;
  depth?: number;
  titleMap: TitleMap;
  onNavigate?: () => void;
}) {
  const linkPath = getSidebarItemPath(item);
  const isActive = linkPath === currentPath;
  const containsActive = isChildActive(item.items, currentPath) || isActive;
  const [isOpen, setIsOpen] = useState(containsActive);

  return (
    <li>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-0.5 py-1 px-1 text-xs rounded transition-colors text-left ${
          isActive
            ? 'text-primary font-bold'
            : 'text-gray-700 hover:text-primary font-semibold'
        }`}
      >
        <svg
          className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
        <span>{item.label}</span>
      </button>
      {isOpen && (
        <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
          {item.items.map((child, i) => (
            <SidebarItemRenderer key={i} item={child} currentPath={currentPath} depth={depth + 1} titleMap={titleMap} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function SidebarItemRenderer({
  item,
  currentPath,
  depth = 0,
  titleMap,
  onNavigate,
}: {
  item: SidebarItem;
  currentPath: string;
  depth?: number;
  titleMap: TitleMap;
  onNavigate?: () => void;
}) {
  if (typeof item === 'string') {
    return <SidebarDocItem docId={item} currentPath={currentPath} titleMap={titleMap} onNavigate={onNavigate} />;
  }
  if (item.type === 'category') {
    return <SidebarCategoryItem item={item} currentPath={currentPath} depth={depth} titleMap={titleMap} onNavigate={onNavigate} />;
  }
  return null;
}

export function isChildActive(items: SidebarItem[], currentPath: string): boolean {
  for (const item of items) {
    if (typeof item === 'string') {
      const parts = item.split('/');
      const href =
        parts[parts.length - 1] === 'index'
          ? '/docs/' + parts.slice(0, -1).join('/')
          : '/docs/' + item;
      if (href === currentPath) return true;
    } else if (item.type === 'category') {
      const linkPath = getSidebarItemPath(item);
      if (linkPath === currentPath) return true;
      if (isChildActive(item.items, currentPath)) return true;
    }
  }
  return false;
}

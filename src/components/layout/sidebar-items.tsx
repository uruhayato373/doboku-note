'use client';

import { useState, useEffect } from 'react';
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
        aria-current={isActive ? 'page' : undefined}
        className={`block py-1 px-2 text-xs rounded no-underline transition-colors ${
          isActive
            ? 'bg-primary/10 text-primary font-semibold'
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

  const storageKey = `sidebar-${depth}-${item.label}`;
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore state after hydration
  useEffect(() => {
    setIsHydrated(true);
    if (containsActive) {
      setIsOpen(true);
    } else {
      const saved = sessionStorage.getItem(storageKey);
      if (saved !== null) setIsOpen(saved === 'true');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist open/close state
  useEffect(() => {
    if (isHydrated) {
      sessionStorage.setItem(storageKey, String(isOpen));
    }
  }, [isOpen, storageKey, isHydrated]);

  // Auto-expand when navigating into this category
  useEffect(() => {
    if (isHydrated && containsActive && !isOpen) setIsOpen(true);
  }, [containsActive, isHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // depth === 0: セクション見出し（常に展開、折りたたまない）
  if (depth === 0) {
    return (
      <li className="mt-6 first:mt-0">
        {linkPath ? (
          <Link
            href={linkPath}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`block text-xs font-bold py-1.5 px-2 no-underline border-b border-gray-200 mb-1 transition-colors ${
              isActive
                ? 'text-primary border-primary'
                : 'text-gray-800 hover:text-primary'
            }`}
          >
            {item.label}
          </Link>
        ) : (
          <span className="block text-xs font-bold text-gray-800 py-1.5 px-2 border-b border-gray-200 mb-1">
            {item.label}
          </span>
        )}
        <ul className="mt-1 space-y-0.5">
          {item.items.map((child, i) => (
            <SidebarItemRenderer
              key={i}
              item={child}
              currentPath={currentPath}
              depth={1}
              titleMap={titleMap}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </li>
    );
  }

  // depth >= 1: 折りたたみカテゴリ（chevronとラベルを分離）
  return (
    <li>
      <div className="flex items-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-expanded={isOpen}
          aria-label={`${item.label}を${isOpen ? '閉じる' : '開く'}`}
        >
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {linkPath ? (
          <Link
            href={linkPath}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`flex-1 py-1 px-1 text-xs rounded no-underline transition-colors ${
              isActive
                ? 'text-primary font-bold'
                : containsActive
                  ? 'text-gray-800 font-semibold hover:text-primary'
                  : 'text-gray-700 font-semibold hover:text-primary'
            }`}
          >
            {item.label}
          </Link>
        ) : (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex-1 text-left py-1 px-1 text-xs rounded transition-colors ${
              containsActive
                ? 'text-gray-800 font-semibold'
                : 'text-gray-700 font-semibold hover:text-primary'
            }`}
          >
            {item.label}
          </button>
        )}
      </div>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
          {item.items.map((child, i) => (
            <SidebarItemRenderer
              key={i}
              item={child}
              currentPath={currentPath}
              depth={depth + 1}
              titleMap={titleMap}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </div>
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

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarItem } from '@/lib/sidebar';
import { SidebarItemRenderer } from './sidebar-items';

type TitleMap = Record<string, string>;

export default function MobileSidebarDrawer({
  items,
  titleMap = {},
}: {
  items: SidebarItem[];
  titleMap?: TitleMap;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Floating trigger button - visible only below lg */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-4 left-4 z-40 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary-dark transition-colors"
        aria-label="メニューを開く"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-[300px] bg-white shadow-xl transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <span className="font-semibold text-sm">ナビゲーション</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="メニューを閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav aria-label="サイドバーナビゲーション" className="overflow-y-auto h-[calc(100%-56px)] py-4 px-3">
          <ul className="space-y-1">
            {items.map((item, i) => (
              <SidebarItemRenderer
                key={i}
                item={item}
                currentPath={pathname}
                titleMap={titleMap}
                onNavigate={() => setIsOpen(false)}
                maxDepth={1}
              />
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

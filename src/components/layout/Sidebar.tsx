'use client';

import { useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarItem } from '@/lib/sidebar';
import { SidebarItemRenderer } from './sidebar-items';

type TitleMap = Record<string, string>;

export default function Sidebar({ items, titleMap = {} }: { items: SidebarItem[]; titleMap?: TitleMap }) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);

  // Auto-scroll to active item
  useEffect(() => {
    const timer = setTimeout(() => {
      const active = sidebarRef.current?.querySelector('[aria-current="page"]');
      if (active) {
        active.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <aside
      ref={sidebarRef}
      className="w-[220px] flex-shrink-0 hidden lg:block overflow-y-auto h-[calc(100vh-3.5rem)] sticky top-14 border-r border-gray-200 py-4 px-3"
    >
      <nav aria-label="サイドバーナビゲーション">
        <ul className="space-y-1">
          {items.map((item, i) => (
            <SidebarItemRenderer key={i} item={item} currentPath={pathname} titleMap={titleMap} maxDepth={1} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}

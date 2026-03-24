'use client';

import { usePathname } from 'next/navigation';
import { SidebarItem } from '@/lib/sidebar';
import { SidebarItemRenderer } from './sidebar-items';

type TitleMap = Record<string, string>;

export default function Sidebar({ items, titleMap = {} }: { items: SidebarItem[]; titleMap?: TitleMap }) {
  const pathname = usePathname();

  return (
    <aside className="w-[250px] flex-shrink-0 hidden lg:block overflow-y-auto h-[calc(100vh-3.5rem)] sticky top-14 border-r border-gray-200 py-4 px-3">
      <nav aria-label="サイドバーナビゲーション">
        <ul className="space-y-1">
          {items.map((item, i) => (
            <SidebarItemRenderer key={i} item={item} currentPath={pathname} titleMap={titleMap} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}

/**
 * Sidebar configuration and utilities for documentation pages.
 * Provides both static (hardcoded) and dynamic (auto-generated from frontmatter) sidebars.
 *
 * 使い分け：
 * - getSidebar(id): 静的なサイドバー（手動管理）
 * - generateDynamicSidebar(category): frontmatter から自動生成
 */

import { generateDynamicSidebar as genDynamicSidebar } from './dynamic-sidebar';

export type SidebarItem =
  | string
  | { type: 'category'; label: string; items: SidebarItem[] };

/** Tree navigation types for SidebarNav component */
export type SidebarDocItem = {
  type: 'doc';
  slug: string;
  label: string;
};

export type SidebarGroupItem = {
  type: 'group';
  label: string;
  items: SidebarTreeItem[];
};

export type SidebarTreeItem = SidebarDocItem | SidebarGroupItem;

/**
 * Extracts the first path from a sidebar item tree.
 * Used by GeneratedIndexPage to generate category links.
 * @param item - A sidebar item (string or category)
 * @returns The path like `/docs/civil-construction-1-guide-strategy` or null
 */
export function getSidebarItemPath(item: SidebarItem): string | null {
  if (typeof item === 'string') {
    return `/docs/${item}`;
  }
  // Recursively find the first string item in the category
  for (const child of item.items) {
    const p = getSidebarItemPath(child);
    if (p) return p;
  }
  return null;
}

/**
 * Returns the sidebar configuration for a given sidebarId.
 * Currently only 'examSidebar' is implemented (1級土木施工管理技士 + 技術士).
 * Uses flat slug structure: slugs are joined with hyphens (e.g., 'civil-construction-1-guide-strategy').
 * @param sidebarId - The sidebar identifier (e.g., 'examSidebar')
 * @returns Array of SidebarItems defining the navigation structure
 */
export function getSidebar(sidebarId: string): SidebarItem[] {
  const sidebars: Record<string, SidebarItem[]> = {
    examSidebar: [
      {
        type: 'category',
        label: '1級土木施工管理技士',
        items: [
          {
            type: 'category',
            label: '試験ガイド',
            items: [
              'civil-construction-1-guide-strategy',
              'civil-construction-1-guide-four-management',
              'civil-construction-1-guide-concrete-key-points',
              'civil-construction-1-guide-earthwork-key-points',
              'civil-construction-1-guide-law-key-points',
              'civil-construction-1-guide-concrete-maintenance',
            ],
          },
          {
            type: 'category',
            label: '第1次検定 過去問',
            items: [
              'civil-construction-1-primary-r02-a',
              'civil-construction-1-primary-r02-b',
              'civil-construction-1-primary-r01-a',
              'civil-construction-1-primary-r01-b',
              'civil-construction-1-primary-h30-a',
              'civil-construction-1-primary-h30-b',
              'civil-construction-1-primary-h29-a',
              'civil-construction-1-primary-h29-b',
              'civil-construction-1-primary-h28-a',
              'civil-construction-1-primary-h28-b',
              'civil-construction-1-primary-h27-a',
              'civil-construction-1-primary-h27-b',
              'civil-construction-1-primary-h26-a',
              'civil-construction-1-primary-h26-b',
            ],
          },
        ],
      },
    ],
    generalSidebar: [],
  };
  return sidebars[sidebarId] ?? [];
}

/**
 * Category から動的に Sidebar ツリーを生成
 * frontmatter の tags[0] でグループ化（重複排除）
 * @param category - 'civil-construction-1' | 'pe-comprehensive-management'
 * @returns SidebarTreeItem[] for SidebarNav component
 */
export async function generateDynamicSidebar(
  category?: string
): Promise<SidebarTreeItem[]> {
  return genDynamicSidebar(category);
}

/**
 * Sidebar configuration and utilities for documentation pages.
 * Defines sidebar structure (examSidebar) and provides helper functions
 * for GeneratedIndexPage and page routing.
 */

export type SidebarItem =
  | string
  | { type: 'category'; label: string; items: SidebarItem[] };

/**
 * Extracts the first path from a sidebar item tree.
 * Used by GeneratedIndexPage to generate category links.
 * @param item - A sidebar item (string or category)
 * @returns The path like `/docs/exam/civil-construction-1/guide/strategy` or null
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
 * Currently only 'examSidebar' is implemented (1級土木施工管理技士).
 * @param sidebarId - The sidebar identifier (e.g., 'examSidebar')
 * @returns Array of SidebarItems defining the navigation structure
 */
export function getSidebar(sidebarId: string): SidebarItem[] {
  const sidebars: Record<string, SidebarItem[]> = {
    examSidebar: [
      {
        type: 'category',
        label: '試験ガイド',
        items: [
          'exam/civil-construction-1/guide/strategy',
          'exam/civil-construction-1/guide/four-management',
          'exam/civil-construction-1/guide/concrete-key-points',
          'exam/civil-construction-1/guide/earthwork-key-points',
          'exam/civil-construction-1/guide/law-key-points',
          'exam/civil-construction-1/guide/concrete-maintenance',
        ],
      },
      {
        type: 'category',
        label: '第1次検定 過去問',
        items: [
          'exam/civil-construction-1/primary/r02-a',
          'exam/civil-construction-1/primary/r02-b',
          'exam/civil-construction-1/primary/r01-a',
          'exam/civil-construction-1/primary/r01-b',
          'exam/civil-construction-1/primary/h30-a',
          'exam/civil-construction-1/primary/h30-b',
          'exam/civil-construction-1/primary/h29-a',
          'exam/civil-construction-1/primary/h29-b',
          'exam/civil-construction-1/primary/h28-a',
          'exam/civil-construction-1/primary/h28-b',
          'exam/civil-construction-1/primary/h27-a',
          'exam/civil-construction-1/primary/h27-b',
          'exam/civil-construction-1/primary/h26-a',
          'exam/civil-construction-1/primary/h26-b',
        ],
      },
      {
        type: 'category',
        label: '第2次検定',
        items: [
          {
            type: 'category',
            label: 'コンクリート工',
            items: [
              'exam/civil-construction-1/secondary/concrete/basics',
              'exam/civil-construction-1/secondary/concrete/past-problems',
            ],
          },
          {
            type: 'category',
            label: '土工',
            items: [
              'exam/civil-construction-1/secondary/earthwork/basics',
              'exam/civil-construction-1/secondary/earthwork/past-problems',
            ],
          },
          {
            type: 'category',
            label: '施工計画',
            items: [
              'exam/civil-construction-1/secondary/construction-plan/basics',
              'exam/civil-construction-1/secondary/construction-plan/past-problems',
            ],
          },
          {
            type: 'category',
            label: '品質管理',
            items: [
              'exam/civil-construction-1/secondary/quality-management/basics',
              'exam/civil-construction-1/secondary/quality-management/past-problems',
            ],
          },
          {
            type: 'category',
            label: '経験記述',
            items: [
              'exam/civil-construction-1/secondary/experience-writing/guide',
              'exam/civil-construction-1/secondary/experience-writing/examples',
            ],
          },
        ],
      },
    ],
  };
  return sidebars[sidebarId] ?? [];
}

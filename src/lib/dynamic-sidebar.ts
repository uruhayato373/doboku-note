/**
 * 動的 Sidebar 生成システム
 * frontmatter の category/tags から自動的にサイドバー構造を生成
 */

import { getAllDocSlugs, getDoc } from './docs';
import { getCategoryLabel, getTagLabel } from './categories';

export type SidebarItem =
  | string
  | { type: 'category'; label: string; items: SidebarItem[] };

/**
 * 全ドキュメントから動的に Sidebar を生成
 * category 別に グループ化し、tags で細分化
 */
export async function generateDynamicSidebar(
  filterCategory?: string
): Promise<SidebarItem[]> {
  const slugs = await getAllDocSlugs();
  const docsMap = new Map<string, any>();

  // 全ドキュメントのメタデータを取得
  for (const slug of slugs) {
    const doc = await getDoc(slug);
    if (doc && doc.meta.published !== false) {
      docsMap.set(slug, doc.meta);
    }
  }

  // category 別に分類
  const byCategory = new Map<string, Map<string, string[]>>();

  for (const [slug, meta] of docsMap.entries()) {
    const category = meta.category || 'uncategorized';

    if (filterCategory && category !== filterCategory) {
      continue;
    }

    if (!byCategory.has(category)) {
      byCategory.set(category, new Map());
    }

    const categoryMap = byCategory.get(category)!;
    const tags = meta.tags || [];

    // タグベースでグループ化
    for (const tag of tags) {
      if (!categoryMap.has(tag)) {
        categoryMap.set(tag, []);
      }
      categoryMap.get(tag)!.push(slug);
    }

    // タグがない場合は 'general' に
    if (tags.length === 0) {
      if (!categoryMap.has('general')) {
        categoryMap.set('general', []);
      }
      categoryMap.get('general')!.push(slug);
    }
  }

  // sidebar item 生成
  const items: SidebarItem[] = [];

  for (const [category, tagMap] of byCategory.entries()) {
    const categoryLabel = getCategoryLabel(category);

    // タグが複数ある場合はカテゴリ > タグで階層化
    if (tagMap.size > 1) {
      const categoryItems: SidebarItem[] = [];

      for (const [tag, slugs] of tagMap.entries()) {
        const tagLabel = getTagLabel(tag);
        const tagItems = slugs.sort().map((slug) => slug);

        categoryItems.push({
          type: 'category',
          label: tagLabel,
          items: tagItems,
        });
      }

      items.push({
        type: 'category',
        label: categoryLabel,
        items: categoryItems,
      });
    } else {
      // タグが1つ以下の場合は直接アイテムを追加
      const slugs = Array.from(tagMap.values()).flat().sort();
      items.push({
        type: 'category',
        label: categoryLabel,
        items: slugs,
      });
    }
  }

  return items;
}

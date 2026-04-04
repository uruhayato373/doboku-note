/**
 * 動的 Sidebar 生成システム
 * frontmatter の category/tags から自動的にサイドバー構造を生成
 *
 * タグの第1要素でグループ化（重複排除）。
 * 各ドキュメントは1グループにのみ所属する。
 */

import { getAllDocSlugs, getDoc } from './docs';
import { getTagLabel } from './categories';
import type { SidebarTreeItem } from './sidebar';

/**
 * 全ドキュメントから動的に Sidebar ツリーを生成
 * category でフィルタし、tags[0] でグループ化
 */
export async function generateDynamicSidebar(
  filterCategory?: string
): Promise<SidebarTreeItem[]> {
  const slugs = await getAllDocSlugs();

  // 全ドキュメントのメタデータを取得
  const docs: { slug: string; label: string; tag: string }[] = [];
  for (const slug of slugs) {
    const doc = await getDoc(slug);
    if (!doc || doc.meta.published === false) continue;
    if (filterCategory && doc.meta.category !== filterCategory) continue;

    const tags = doc.meta.tags || [];
    docs.push({
      slug,
      label: doc.meta.sidebar_label || doc.meta.title || slug,
      tag: tags[0] || 'general',
    });
  }

  // tags[0] でグループ化（各ドキュメントは1グループのみ）
  const groups = new Map<string, { slug: string; label: string }[]>();
  for (const doc of docs) {
    if (!groups.has(doc.tag)) {
      groups.set(doc.tag, []);
    }
    groups.get(doc.tag)!.push({ slug: doc.slug, label: doc.label });
  }

  // グループが1つしかない場合はフラットリスト
  if (groups.size <= 1) {
    const allDocs = Array.from(groups.values()).flat();
    allDocs.sort((a, b) => a.slug.localeCompare(b.slug));
    return allDocs.map((d) => ({ type: 'doc', slug: d.slug, label: d.label }));
  }

  // 複数グループ → グループ化して返す
  const items: SidebarTreeItem[] = [];
  for (const [tag, tagDocs] of groups.entries()) {
    tagDocs.sort((a, b) => a.slug.localeCompare(b.slug));
    items.push({
      type: 'group',
      label: getTagLabel(tag),
      items: tagDocs.map((d) => ({ type: 'doc', slug: d.slug, label: d.label })),
    });
  }

  return items;
}

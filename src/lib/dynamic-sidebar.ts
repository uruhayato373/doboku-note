/**
 * 動的 Sidebar 生成システム
 * doc-classifier の共通分類ロジックでグループ化。
 * カテゴリページと同じ分類結果をサイドバーに反映。
 */

import { getAllDocSlugs, getDoc } from './docs';
import { classifyDoc, getGroupOrder, getGroupLabel, type DocGroupKey } from './doc-classifier';
import type { SidebarTreeItem } from './sidebar';

/**
 * 全ドキュメントから動的に Sidebar ツリーを生成
 * category でフィルタし、classifyDoc() でグループ化
 */
export async function generateDynamicSidebar(
  filterCategory?: string
): Promise<SidebarTreeItem[]> {
  const slugs = await getAllDocSlugs();

  const docs: { slug: string; label: string; group: DocGroupKey }[] = [];
  for (const slug of slugs) {
    const doc = await getDoc(slug);
    if (!doc || doc.meta.published === false) continue;
    if (filterCategory && doc.meta.category !== filterCategory) continue;

    docs.push({
      slug,
      label: doc.meta.sidebar_label || doc.meta.title || slug,
      group: classifyDoc(doc.meta),
    });
  }

  // グループ化
  const groups = new Map<DocGroupKey, { slug: string; label: string }[]>();
  for (const doc of docs) {
    if (!groups.has(doc.group)) {
      groups.set(doc.group, []);
    }
    groups.get(doc.group)!.push({ slug: doc.slug, label: doc.label });
  }

  // グループが1つしかない場合はフラットリスト
  if (groups.size <= 1) {
    const allDocs = Array.from(groups.values()).flat();
    allDocs.sort((a, b) => a.slug.localeCompare(b.slug));
    return allDocs.map((d) => ({ type: 'doc', slug: d.slug, label: d.label }));
  }

  // 定義順でグループを並べる
  const order = filterCategory ? getGroupOrder(filterCategory) : Array.from(groups.keys());
  const items: SidebarTreeItem[] = [];

  for (const groupKey of order) {
    const groupDocs = groups.get(groupKey);
    if (!groupDocs || groupDocs.length === 0) continue;

    groupDocs.sort((a, b) => a.slug.localeCompare(b.slug));
    const label = filterCategory ? getGroupLabel(filterCategory, groupKey) : groupKey;

    items.push({
      type: 'group',
      label,
      items: groupDocs.map((d) => ({ type: 'doc', slug: d.slug, label: d.label })),
    });
  }

  return items;
}

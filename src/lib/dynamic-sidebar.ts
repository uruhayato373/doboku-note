/**
 * 動的 Sidebar 生成システム
 * doc-classifier の共通分類ロジックでグループ化。
 * カテゴリページと同じ分類結果をサイドバーに反映。
 */

import { getAllDocSlugs, getDocMeta } from './docs';
import { classifyDoc, getGroupOrder, getGroupLabel, type DocGroupKey } from './doc-classifier';
import type { SidebarTreeItem } from './sidebar';

/**
 * In-memory sidebar cache (survives across requests in dev server).
 * Keyed by category string; invalidated on server restart.
 */
const sidebarCache = new Map<string, SidebarTreeItem[]>();

/**
 * 全ドキュメントから動的に Sidebar ツリーを生成
 * category でフィルタし、classifyDoc() でグループ化
 */
export async function generateDynamicSidebar(
  filterCategory?: string
): Promise<SidebarTreeItem[]> {
  const cacheKey = filterCategory ?? '__all__';
  const cached = sidebarCache.get(cacheKey);
  if (cached) return cached;
  const allSlugs = await getAllDocSlugs();

  // カテゴリ前置詞でスラッグを事前フィルタ（I/O削減）
  // 例: filterCategory='civil-construction-1' → slug が 'civil-construction-1-' で始まるもののみ
  const slugs = filterCategory
    ? allSlugs.filter((s) => s.startsWith(filterCategory + '-'))
    : allSlugs;

  const docs: { slug: string; label: string; group: DocGroupKey; textbook_order: number }[] = [];
  const metas = await Promise.all(slugs.map((slug) => getDocMeta(slug)));
  for (let i = 0; i < slugs.length; i++) {
    const meta = metas[i];
    if (!meta || meta.published === false) continue;
    docs.push({
      slug: slugs[i]!,
      label: meta.sidebar_label || meta.shortTitle || meta.title || slugs[i]!,
      group: classifyDoc(meta),
      textbook_order: Number(meta.textbook_order) || 999,
    });
  }

  // グループ化
  const groups = new Map<DocGroupKey, { slug: string; label: string; textbook_order: number }[]>();
  for (const doc of docs) {
    if (!groups.has(doc.group)) {
      groups.set(doc.group, []);
    }
    groups.get(doc.group)!.push({ slug: doc.slug, label: doc.label, textbook_order: doc.textbook_order });
  }

  // グループが1つしかない場合はフラットリスト
  if (groups.size <= 1) {
    const allDocs = Array.from(groups.values()).flat();
    allDocs.sort((a, b) => a.slug.localeCompare(b.slug));
    const result = allDocs.map((d) => ({ type: 'doc' as const, slug: d.slug, label: d.label }));
    sidebarCache.set(cacheKey, result);
    return result;
  }

  // 定義順でグループを並べる
  const order = filterCategory ? getGroupOrder(filterCategory) : Array.from(groups.keys());
  const items: SidebarTreeItem[] = [];

  for (const groupKey of order) {
    const groupDocs = groups.get(groupKey);
    if (!groupDocs || groupDocs.length === 0) continue;

    if (groupKey === 'textbook') {
      groupDocs.sort((a, b) => a.textbook_order - b.textbook_order);
    } else {
      groupDocs.sort((a, b) => a.slug.localeCompare(b.slug));
    }
    const label = filterCategory ? getGroupLabel(filterCategory, groupKey) : groupKey;

    items.push({
      type: 'group',
      label,
      items: groupDocs.map((d) => ({ type: 'doc', slug: d.slug, label: d.label })),
    });
  }

  sidebarCache.set(cacheKey, items);
  return items;
}

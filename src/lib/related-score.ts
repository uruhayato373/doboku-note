/**
 * related-score — 同カテゴリ近傍ページを「トピックタグの共通数」でランクする純関数。
 *
 * RelatedArticles（記事末カード）と MidArticleCta（本文中間の関連記事モード）で共有する。
 * 構造タグ（記事種別）は関連度判定から除外し、共通トピックタグ数でスコアリング、
 * 同スコアは新しい記事を優先する。
 */
import type { DocMeta } from '@/lib/docs';

/** 構造タグ（記事種別）はトピック関連度の判定から除外する。 */
export const STRUCTURAL_TAGS = new Set([
  'guide',
  'primary',
  'secondary',
  'textbook',
  'keyword',
  'pillar',
  'essay',
  'past-questions',
  'pastExam',
]);

/** meta.tags から構造タグを除いたトピックタグ配列を返す。 */
export function topicalTags(meta: DocMeta): string[] {
  return (meta.tags || []).filter((t) => !STRUCTURAL_TAGS.has(t));
}

/**
 * currentMeta に対する同カテゴリ近傍ページを共通トピックタグ数で降順ソートして返す。
 * - 自分自身・非公開は除外
 * - 共通タグ 0 件は除外
 * - 同スコアは date 降順（新しい記事優先）
 *
 * @param limit 返す最大件数（既定 6）
 */
export function rankRelated(
  currentMeta: DocMeta,
  categoryArticles: DocMeta[],
  limit = 6,
): DocMeta[] {
  const currentTags = new Set(topicalTags(currentMeta));
  if (currentTags.size === 0) return [];

  return categoryArticles
    .filter((m) => m.slug !== currentMeta.slug && m.published !== false)
    .map((m) => ({
      doc: m,
      score: topicalTags(m).filter((t) => currentTags.has(t)).length,
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const da = String(a.doc.date ?? '');
      const db = String(b.doc.date ?? '');
      return db.localeCompare(da);
    })
    .slice(0, limit)
    .map((s) => s.doc);
}

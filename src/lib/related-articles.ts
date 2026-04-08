/**
 * 関連記事選択アルゴリズム
 * 3段階フォールバック: 同セクション → 同グループ → 同カテゴリ
 * 決定的シャッフルでSSGキャッシュと両立
 */
import type { DocMeta } from './docs';
import { classifyDoc } from './doc-classifier';

/**
 * スラグから決定的ハッシュ値を生成（シャッフル用シード）
 */
function hashSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * 決定的シャッフル: シード値に基づいて配列を並び替える
 */
function deterministicShuffle<T extends { slug: string }>(items: T[], seed: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (seed + hashSlug(copy[i].slug) + i) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 関連記事を選択する
 * @param current - 現在表示中の記事メタデータ
 * @param categoryArticles - 同カテゴリの全記事メタデータ
 * @param maxCount - 最大表示数（デフォルト 4）
 */
export function selectRelatedArticles(
  current: DocMeta,
  categoryArticles: DocMeta[],
  maxCount = 4,
): DocMeta[] {
  // 自分自身を除外
  const candidates = categoryArticles.filter((a) => a.slug !== current.slug);
  if (candidates.length === 0) return [];

  const currentGroup = classifyDoc(current);
  const seed = hashSlug(current.slug);
  const selected: DocMeta[] = [];
  const selectedSlugs = new Set<string>();

  const addFromPool = (pool: DocMeta[]) => {
    const shuffled = deterministicShuffle(pool, seed);
    for (const article of shuffled) {
      if (selected.length >= maxCount) break;
      if (selectedSlugs.has(article.slug)) continue;
      selected.push(article);
      selectedSlugs.add(article.slug);
    }
  };

  // Tier 1: 同セクション（section フィールドが存在する場合のみ）
  if (current.section) {
    const tier1 = candidates.filter(
      (a) => a.section === current.section && a.slug !== current.slug,
    );
    addFromPool(tier1);
  }

  // Tier 2: 同ドキュメントグループ（Tier 1 で未選出の記事）
  if (selected.length < maxCount) {
    const tier2 = candidates.filter(
      (a) => classifyDoc(a) === currentGroup && !selectedSlugs.has(a.slug),
    );
    addFromPool(tier2);
  }

  // Tier 3: 同カテゴリ内の残り
  if (selected.length < maxCount) {
    const tier3 = candidates.filter((a) => !selectedSlugs.has(a.slug));
    addFromPool(tier3);
  }

  return selected;
}

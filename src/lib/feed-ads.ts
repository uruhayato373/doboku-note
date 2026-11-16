/**
 * 記事の一覧にインフィード広告を 1 項目として挟む位置（判定はここだけ・2026-11-16 運営者判断）。
 * 既定: 10 項目ごとに 1 枠・1 つの一覧で最大 2 枠・一覧の先頭と末尾には置かない（項目が 10 未満の一覧は 0 枠）。
 * 先頭に置かないので、資格トップの上部の note の教材・ココナラの導線と広告が隣り合わない。
 * 1 ページの合計は FEED_ADS_PAGE_MAX まで（呼び出し側が budget で数える。検査は check-cta-density と cta-stack-inspect）。
 */
const FEED_ADS_EVERY = 10;
const FEED_ADS_LIST_MAX = 2;
export const FEED_ADS_PAGE_MAX = 3;

export type FeedEntry<T> = { kind: 'item'; item: T; index: number } | { kind: 'ad'; key: string };

/** 広告を置く位置（その番号の項目の直後）。first は最初の広告を置く項目の数（検索結果は 5） */
function feedAdPositions(count: number, { every = FEED_ADS_EVERY, first = every, max = FEED_ADS_LIST_MAX }: { every?: number; first?: number; max?: number } = {}): number[] {
  const positions: number[] = [];
  for (let after = first; after < count && positions.length < max; after += every) positions.push(after - 1);
  return positions;
}

/** 項目の並びに広告を挟んだ並びを返す。budget を渡すと、ページ全体の残り枠数を減らしながら使う */
export function withFeedAds<T>(items: readonly T[], options: { every?: number; first?: number; max?: number; key: string; budget?: { left: number } }): FeedEntry<T>[] {
  const { key, budget, ...rule } = options;
  const positions = new Set(feedAdPositions(items.length, rule));
  const out: FeedEntry<T>[] = [];
  items.forEach((item, index) => {
    out.push({ kind: 'item', item, index });
    if (!positions.has(index)) return;
    if (budget) {
      if (budget.left <= 0) return;
      budget.left -= 1;
    }
    out.push({ kind: 'ad', key: `${key}-ad-${index}` });
  });
  return out;
}

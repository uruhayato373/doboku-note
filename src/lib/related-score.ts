/**
 * related-score — 全領域の記事を「どれだけ同じ主題を扱うか」でランクする。
 *
 * RelatedArticles（記事末カード）と MidArticleCta（本文中間の関連記事モード）・記事末のテーマ／法令のカード
 * （src/lib/article-end-wiring.ts）で共有する。算法の本体は src/lib/related-core.mjs（テスト・週次の報告と同じ関数）で、
 * ここはサイトのタグの class（tags.json）とテーマの所属（topics.json）を渡すだけ（content-taxonomy.md §6-3）。
 */
import type { DocMeta } from '@/lib/docs';
import { getTagClass } from '@/lib/content-taxonomy';
import { getDocTopics } from '@/lib/topics';
import { rankRelated as rankRelatedCore, relatedScore as relatedScoreCore } from '@/lib/related-core.mjs';

const deps = {
  tagClass: (tag: string) => getTagClass(tag),
  // core へ渡すのはここで受けた DocMeta だけなので、戻ってくる doc も DocMeta
  topicsOf: (doc: { slug: string }) => getDocTopics(doc as DocMeta).map((topic) => topic.slug),
};

/** current から見た candidate の関連度。0 は無関係（技術テーマを 1 つも共有しない）。 */
export function relatedScore(current: DocMeta, candidate: DocMeta): number {
  return relatedScoreCore(current, candidate, deps);
}

/**
 * currentMeta に対する近傍ページを関連度の降順で返す（規則は related-core.mjs の rankRelated）。
 * @param limit 返す最大件数（既定 6）
 * @param exclude 記事末の先のカードで出した記事（同じ記事を 2 度並べない）
 */
export function rankRelated(
  currentMeta: DocMeta,
  categoryArticles: DocMeta[],
  limit = 6,
  exclude: ReadonlySet<string> = new Set(),
): DocMeta[] {
  return rankRelatedCore(currentMeta, categoryArticles, limit, exclude, deps) as DocMeta[];
}

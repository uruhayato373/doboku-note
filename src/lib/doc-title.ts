import type { DocMeta } from '@/lib/docs';

/**
 * ナビ一覧（サイドバー・モバイル記事末）で使う「主題 + サブタイトル」を解決する。
 *
 * なぜ frontmatter のフィールドをそのまま使い、`title` を分割しないか（2026-07-28 の実測）:
 *  - 区切り方言が 2 系統ある（civil 系は ` — ` 54 件 / pe・concrete 系は `｜` 46 件）
 *  - 2 段区切り（`：`…`｜`…）が 6 件あり、どちらで割るかが一意に決まらない
 *  - 資格名プレフィックスの機械的除去は 21 件が壊れる
 *    （「2級土木施工管理技士**とは**」→「とは」、「1級と2級の**違い**」系は比較が成立しなくなる）
 * 実データは既に `shortTitle` 111/112・`subtitle` 109/112（guide）と揃っているので、
 * 推測で割るより宣言された値を読むほうが正確。将来分割を足すならこの 1 箇所に閉じる。
 */
export function resolveNavTitle(meta: Pick<DocMeta, 'title' | 'shortTitle' | 'subtitle'>): {
  main: string;
  sub: string | null;
} {
  return {
    main: meta.shortTitle || meta.title,
    sub: meta.subtitle || null,
  };
}

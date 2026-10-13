/**
 * content-series.mjs — サイト記事のシリーズ企画の台帳（config/content-series.json）を読み、検査し、状態を出す唯一の実装。
 *
 * 台帳が持つのは企画（シリーズ → 節 → 項目の目次・計画・記事のパス・根拠の参考文献 id・関連記事・第何波か）だけで、
 * 状態（公開・下書き・未着手）は書かない。記事ファイルの有無と frontmatter の published から毎回出す
 * （手で書いた状態は記事を書くたびに古くなるため。2026-10-13）。実行の記録はバックログのカードが持ち、
 * カードの本文にシリーズの id を書くと管理画面がつなぐ（台帳からカード番号を指さない＝閉じたカードで切れない）。
 *
 * 読み手: scripts/check-content-series.mjs（CI）・管理画面 /content/series。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readDataset } from './dataset-io.mjs';

export const SERIES_PLANS = ['new', 'strengthen', 'existing', 'excluded'];
export const PLAN_LABELS = { new: '新規', strengthen: '補強', existing: '既存', excluded: '対象外' };
export const STATE_LABELS = {
  published: '公開', draft: '下書き', planned: '未着手', strengthen: '補強待ち', existing: '既存', excluded: '対象外', missing: '記事が無い',
};
const ARTICLE_PATH = /^content\/site\/[a-z0-9-]+\/(?:[a-z0-9-]+\/article\.mdx|[a-z0-9-]+\.mdx)$/;

export function loadSeriesConfig(root) {
  return readDataset(root, 'config.content-series');
}

/** 記事ファイルの有無と frontmatter の published。 */
export function articleStateFromFile(root, path) {
  const file = join(root, ...path.split('/'));
  if (!existsSync(file)) return { exists: false, published: false };
  const head = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return { exists: true, published: /^published:\s*true\s*$/m.test(head?.[1] ?? '') };
}

/** 1 項目の状態。計画と記事の実体から決める。 */
export function itemState(item, stateOf) {
  if (item.plan === 'excluded') return 'excluded';
  const paths = item.paths ?? [];
  const states = paths.map(stateOf);
  if (item.plan === 'existing' || item.plan === 'strengthen') {
    if (paths.length === 0 || states.some((s) => !s.exists)) return 'missing';
    return item.plan === 'strengthen' ? 'strengthen' : 'existing';
  }
  if (states.length === 0 || states.every((s) => !s.exists)) return 'planned';
  return states.every((s) => s.exists && s.published) ? 'published' : 'draft';
}

/**
 * 台帳の中身の検査（形は check-datasets の zod が見る）。
 * @param {{ sourceIds: Set<string>, stateOf: (path: string) => { exists: boolean, published: boolean }, curriculumCategories: Set<string> }} ctx
 * @returns {string[]} 違反
 */
export function validateSeries(config, ctx) {
  const issues = [];
  const seriesIds = new Set();
  for (const series of config.series ?? []) {
    const at = series.id;
    if (seriesIds.has(series.id)) issues.push(`${at}: シリーズの id が重複`);
    seriesIds.add(series.id);
    const itemIds = new Set();
    for (const section of series.sections ?? []) {
      for (const item of section.items ?? []) {
        const label = `${at}/${item.id}`;
        if (itemIds.has(item.id)) issues.push(`${label}: 項目の id が重複`);
        itemIds.add(item.id);
        for (const p of [...(item.paths ?? []), ...(item.links ?? [])]) {
          if (!ARTICLE_PATH.test(p)) issues.push(`${label}: 記事のパスの形が違う（content/site/<資格>/<dir>/article.mdx か <資格>/<name>.mdx）: ${p}`);
        }
        if ((item.plan === 'existing' || item.plan === 'strengthen') && (item.paths ?? []).length === 0) {
          issues.push(`${label}: 計画が「${PLAN_LABELS[item.plan]}」なのに記事のパスが無い`);
        }
        if (item.plan === 'existing' || item.plan === 'strengthen') {
          for (const p of item.paths ?? []) if (!ctx.stateOf(p).exists) issues.push(`${label}: 既存の記事が無い: ${p}`);
        }
        for (const p of item.links ?? []) if (!ctx.stateOf(p).exists) issues.push(`${label}: 関連記事が無い: ${p}`);
        // 条番号・規格番号は id の後ろに # で付けてよい（reference-sources-policy §1。例 jis#A5308）
        for (const id of item.sources ?? []) if (!ctx.sourceIds.has(id.split('#')[0])) issues.push(`${label}: 根拠の id が参考文献の台帳に無い: ${id}`);
        if (item.plan === 'excluded' && !item.reason?.trim()) issues.push(`${label}: 対象外にした理由が無い`);
      }
    }
    if (itemIds.size === 0) issues.push(`${at}: 項目が 1 つも無い`);
    const entry = series.entry ?? {};
    if (entry.hubItem && !itemIds.has(entry.hubItem)) issues.push(`${at}: 入口のハブ ${entry.hubItem} が項目に無い`);
    if (entry.curriculum && !ctx.curriculumCategories.has(entry.curriculum.split(':')[0])) {
      issues.push(`${at}: 入口の工種別ノート ${entry.curriculum} の資格が category-curriculum.json に無い`);
    }
  }
  return issues;
}

/** シリーズごとに項目の状態を付け、件数を数える（管理画面と検査の出力が使う）。 */
export function seriesView(config, stateOf) {
  return (config.series ?? []).map((series) => {
    const sections = (series.sections ?? []).map((section) => ({
      ...section,
      items: (section.items ?? []).map((item) => ({
        ...item,
        state: itemState(item, stateOf),
        articles: (item.paths ?? []).map((path) => ({ path, ...stateOf(path) })),
      })),
    }));
    const items = sections.flatMap((s) => s.items);
    const count = (f) => items.filter(f).length;
    const summary = {
      items: items.length,
      newTotal: count((i) => i.plan === 'new'),
      published: count((i) => i.plan === 'new' && i.state === 'published'),
      draft: count((i) => i.state === 'draft'),
      planned: count((i) => i.state === 'planned'),
      strengthen: count((i) => i.state === 'strengthen'),
      existing: count((i) => i.state === 'existing'),
      excluded: count((i) => i.state === 'excluded'),
      missing: count((i) => i.state === 'missing'),
    };
    return { ...series, sections, summary };
  });
}

/** 検査と管理画面が使う文脈（参考文献の id・記事の実体・工種別ノートの資格）。 */
export function seriesContext(root) {
  const sourceIds = new Set(readDataset(root, 'config.reference-sources').sources.map((s) => s.id));
  const curriculum = JSON.parse(readFileSync(join(root, 'src', 'config', 'category-curriculum.json'), 'utf8'));
  const curriculumCategories = new Set(Object.keys(curriculum).filter((k) => !k.startsWith('$')));
  const cache = new Map();
  const stateOf = (path) => {
    if (!cache.has(path)) cache.set(path, articleStateFromFile(root, path));
    return cache.get(path);
  };
  return { sourceIds, curriculumCategories, stateOf };
}

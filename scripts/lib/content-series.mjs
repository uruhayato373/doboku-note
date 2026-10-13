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
import { readDataset, readDatasetIf } from './dataset-io.mjs';
import { AI_LEDGER_FILE, aiPhotoStatus } from './image-origin.mjs';
import { fileSha } from './figure-review.mjs';

export const SERIES_PLANS = ['new', 'strengthen', 'existing', 'excluded'];
export const PLAN_LABELS = { new: '新規', strengthen: '補強', existing: '既存', excluded: '対象外' };
export const VISUAL_LABELS = {
  planned: '未作成', spec: '仕様あり・未生成', placed: '配置済み',
  'not-generated': '仕様と画像が違う', unreviewed: '未監査', failed: '不合格', ok: '合格',
};
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
  const referenceSources = readDataset(root, 'config.reference-sources').sources;
  const sourceIds = new Set(referenceSources.map((s) => s.id));
  const referenceClasses = new Map(referenceSources.map((s) => [s.id, s.class]));
  const bookSummary = readDatasetIf(root, 'state.book-coverage')?.books ?? {};
  const provenance = readDataset(root, 'config.figure-sources').provenance ?? {};
  const aiFile = join(root, ...AI_LEDGER_FILE.split('/'));
  const aiLedger = existsSync(aiFile) ? JSON.parse(readFileSync(aiFile, 'utf8')) : null;
  const curriculum = JSON.parse(readFileSync(join(root, 'src', 'config', 'category-curriculum.json'), 'utf8'));
  const curriculumCategories = new Set(Object.keys(curriculum).filter((k) => !k.startsWith('$')));
  const cache = new Map();
  const stateOf = (path) => {
    if (!cache.has(path)) cache.set(path, articleStateFromFile(root, path));
    return cache.get(path);
  };
  return { root, referenceSources, sourceIds, referenceClasses, bookSummary, provenance, aiLedger, curriculumCategories, stateOf };
}

/**
 * 図・写真 1 枚の状態（計画と、画像の実体・出所の台帳・AI 画像の台帳から出す。台帳に「済」を書かない）。
 * 図: 置き場（figKey）の SVG があれば placed。写真: 画像があれば image-origin の aiPhotoStatus、無ければ仕様（prompt）の有無。
 * 作るのは既存の流れ（図は自作の SVG、写真は npm run gen-article-photo＝codex exec の画像生成）。
 */
export function visualState(visual, ctx) {
  if (!visual.figKey) return 'planned';
  const base = join(ctx.root, 'content', 'site', ...visual.figKey.split('/'));
  if (visual.kind === 'figure') return ['.svg', '.webp', '.png'].some((ext) => existsSync(base + ext)) ? 'placed' : 'planned';
  const entry = ctx.provenance?.[visual.figKey];
  const file = ['.webp', '.png', '.jpg'].map((ext) => base + ext).find((f) => existsSync(f));
  if (!file) return entry?.prompt ? 'spec' : 'planned';
  return aiPhotoStatus({ entry, rec: ctx.aiLedger?.figures?.[visual.figKey], sha: fileSha(file) });
}

/** Codex などに渡す図・写真の作業一覧（合格・配置済み以外）。写真は gen-article-photo のコマンドを付ける。 */
export function visualJobs(view, ctx) {
  const jobs = [];
  for (const s of view) for (const sec of s.sections) for (const it of sec.items) for (const v of it.visuals ?? []) {
    const state = visualState(v, ctx);
    if (state === 'ok' || state === 'placed') continue;
    const next = !v.figKey ? '記事の場所が決まったら figKey を台帳に書く'
      : v.kind === 'photo' ? `npm run gen-article-photo -- --fig ${v.figKey}${state === 'planned' ? ' --prompt "<被写体の指示>"' : ''}`
      : `自作の SVG を content/site/${v.figKey}.svg に置く（create-svg）`;
    jobs.push({ series: s.id, item: it.id, kind: v.kind, subject: v.subject, figKey: v.figKey ?? null, state, next });
  }
  return jobs;
}

export function loadBasis(root) {
  return readDataset(root, 'config.content-series-basis');
}

/**
 * 書籍の全項目の割り当ての検査。項目数は書籍の網羅の要約（book-coverage.json の candidates.textUnits）と一致させる
 * （Drive が無くても件数で照合できる。id そのものの照合は basisDriveIssues）。
 */
export function validateBasis(basis, config, ctx) {
  const issues = [];
  const items = new Set((config.series ?? []).flatMap((s) => (s.sections ?? []).flatMap((sec) => sec.items.map((i) => `${s.id}/${i.id}`))));
  for (const [bookId, book] of Object.entries(basis.books ?? {})) {
    const cls = ctx.referenceClasses.get(bookId);
    if (!cls) { issues.push(`${bookId}: 参考文献の台帳に無い`); continue; }
    if (!['commercial-book', 'operator-owned'].includes(cls)) issues.push(`${bookId}: 書籍（commercial-book・operator-owned）でない（${cls}）`);
    const expected = ctx.bookSummary?.[bookId]?.candidates?.textUnits;
    const n = Object.keys(book.units ?? {}).length;
    if (typeof expected !== 'number') issues.push(`${bookId}: 書籍の網羅の要約に項目数が無い（audit-reference-book-coverage --summary）`);
    else if (n !== expected) issues.push(`${bookId}: 割り当て ${n} 項目 ≠ 書籍の項目 ${expected}（割り当てもれ・古い割り当て）`);
    for (const [unit, v] of Object.entries(book.units ?? {})) {
      if (typeof v === 'string') { if (!items.has(v)) issues.push(`${bookId}/${unit}: 割り当て先 ${v} がシリーズの台帳に無い`); }
      else if (v.article && !ctx.stateOf(v.article).exists) issues.push(`${bookId}/${unit}: 記事が無い: ${v.article}`);
    }
  }
  return issues;
}

/** Drive の候補表（見出しを含む）と、割り当ての項目 id がちょうど一致するか。Drive が無ければ null（照合しない）。 */
export function basisDriveIssues(basis, vaultRoot, referenceSources) {
  if (!vaultRoot) return null;
  const issues = [];
  for (const [bookId, book] of Object.entries(basis.books ?? {})) {
    const src = referenceSources.find((s) => s.id === bookId);
    const file = src?.origin?.vaultDir ? join(vaultRoot, ...src.origin.vaultDir.split('/'), 'coverage', 'candidates.json') : null;
    if (!file || !existsSync(file)) { issues.push(`${bookId}: Drive に候補表が無い`); continue; }
    const ids = new Set(JSON.parse(readFileSync(file, 'utf8')).units.map((u) => u.id));
    const assigned = new Set(Object.keys(book.units ?? {}));
    const missing = [...ids].filter((id) => !assigned.has(id));
    const extra = [...assigned].filter((id) => !ids.has(id));
    if (missing.length) issues.push(`${bookId}: 割り当てていない項目 ${missing.length}（${missing.slice(0, 5).join('・')}…）`);
    if (extra.length) issues.push(`${bookId}: 候補表に無い項目 ${extra.length}（${extra.slice(0, 5).join('・')}…）`);
  }
  return issues;
}

/** 割り当ての集計: 項目（シリーズ id/項目 id）→ 書籍ごとの件数、書籍 → 内訳。 */
export function basisView(basis) {
  const byItem = new Map();
  const byBook = {};
  for (const [bookId, book] of Object.entries(basis.books ?? {})) {
    const t = { units: 0, series: 0, article: 0, excluded: 0 };
    for (const v of Object.values(book.units ?? {})) {
      t.units += 1;
      if (typeof v === 'string') {
        t.series += 1;
        const m = byItem.get(v) ?? {};
        m[bookId] = (m[bookId] ?? 0) + 1;
        byItem.set(v, m);
      } else if (v.article) t.article += 1;
      else t.excluded += 1;
    }
    byBook[bookId] = t;
  }
  return { byItem, byBook };
}

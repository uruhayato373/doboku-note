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
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
/** 図・写真 1 枚の進み具合（切り出し → 作成・描き直し → 監査 → 記事への配置）。 */
export const STAGES = ['crop-missing', 'planned', 'cropped', 'unreviewed', 'failed', 'created', 'embedded', 'skipped'];
export const STAGE_LABELS = {
  'crop-missing': '切り出し図が無い', planned: '未着手', cropped: '切り出し済み・未作成', unreviewed: '作成済み・未監査',
  failed: '監査で不合格', created: '作成済み・記事に未配置', embedded: '記事に配置済み', skipped: '使わない',
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
    } else if (entry.curriculum && ctx.curriculumOf) issues.push(...curriculumIssues(series, ctx));
  }
  return issues;
}

/**
 * シリーズの章とカリキュラム（src/config/category-curriculum.json）の食い違い。
 * 入口の資格（entry.curriculum の「資格:区分」）の記事で公開済みの章は、その資格のカリキュラムのどこかに載っていること。
 * 入口の区分に載っている章は、台帳の並び（読む順）と同じ順で並んでいること。
 * 2026-10-13 に、書いた 7 章がカリキュラムに無く、区分の並びも手で直していた。
 */
function curriculumIssues(series, ctx) {
  const [category, blockId] = series.entry.curriculum.split(':');
  const { all, block } = ctx.curriculumOf(category, blockId);
  const prefix = `content/site/${category}/`;
  const order = [];
  const issues = [];
  for (const item of (series.sections ?? []).flatMap((sec) => sec.items ?? [])) {
    for (const p of item.paths ?? []) {
      if (!p.startsWith(prefix) || !ctx.stateOf(p).published) continue;
      const slug = p.slice(prefix.length).replace(/\/article\.mdx$|\.mdx$/, '');
      if (!all.has(slug)) issues.push(`${series.id}/${item.id}: 公開した章 ${slug} がカリキュラム（${category}）に無い`);
      if (!order.includes(slug)) order.push(slug);
    }
  }
  if (block) {
    const want = order.filter((x) => block.includes(x));
    const got = block.filter((x) => want.includes(x));
    const at = want.findIndex((x, i) => got[i] !== x);
    if (at >= 0) issues.push(`${series.id}: カリキュラムの区分 ${series.entry.curriculum} の並びが台帳の読む順と違う（${at + 1} 番目: 台帳 ${want[at]}・区分 ${got[at]}）`);
  }
  return issues;
}

/**
 * シリーズごとに項目の状態を付け、件数を数える（管理画面と検査の出力が使う）。outlines を渡すと骨子の要約も付ける。
 * @param {any} config
 * @param {(path: string) => { exists: boolean, published: boolean }} stateOf
 * @param {Map<string, any> | null} [outlines] loadOutlines の outlines
 * @param {any} [ctx] seriesContext（一次資料の判定に使う）
 */
export function seriesView(config, stateOf, outlines = null, ctx = null) {
  return (config.series ?? []).map((series) => {
    const sections = (series.sections ?? []).map((section) => ({
      ...section,
      items: (section.items ?? []).map((item) => ({
        ...item,
        state: itemState(item, stateOf),
        outline: outlines ? outlineSummary(outlines.get(`${series.id}/${item.id}`) ?? null, ctx) : null,
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
      outlineApproved: count((i) => i.outline?.status === 'approved'),
      outlineDraft: count((i) => i.outline?.status === 'draft'),
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
  const manifests = new Map();
  const bookManifest = (bookId) => {
    if (!manifests.has(bookId)) {
      const dir = referenceSources.find((s) => s.id === bookId)?.bookBundle?.directory;
      const file = dir ? join(root, 'content', 'sources', 'books', dir, 'book-manifest.json') : null;
      manifests.set(bookId, file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
    }
    return manifests.get(bookId);
  };
  const aiFile = join(root, ...AI_LEDGER_FILE.split('/'));
  const aiLedger = existsSync(aiFile) ? JSON.parse(readFileSync(aiFile, 'utf8')) : null;
  const curriculum = JSON.parse(readFileSync(join(root, 'src', 'config', 'category-curriculum.json'), 'utf8'));
  const curriculumCategories = new Set(Object.keys(curriculum).filter((k) => !k.startsWith('$')));
  // 資格のカリキュラムに載る slug 全部（形は資格ごとに違うので slugs の配列を拾う）と、id の一致する区分の並び
  const curriculumOf = (category, blockId) => {
    const all = new Set();
    let block = null;
    const walk = (n) => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n.slugs)) {
        n.slugs.forEach((x) => typeof x === 'string' && all.add(x));
        if (blockId && n.id === blockId) block = n.slugs;
      }
      Object.values(n).forEach(walk);
    };
    walk(curriculum[category]);
    return { all, block };
  };
  // 骨子の「根拠: <法令 id>#第N条」の条が e-Gov の写し（config.egov-laws）にあるか（法令 id → 本則の条の番号）
  const egovLaws = readDatasetIf(root, 'config.egov-laws')?.laws ?? null;
  const egovArticles = (sourceId) => {
    const lawId = referenceSources.find((s) => s.id === sourceId)?.egov?.lawId;
    return lawId && egovLaws?.[lawId] ? new Set(egovLaws[lawId].articles) : null;
  };
  const cache = new Map();
  const stateOf = (path) => {
    if (!cache.has(path)) cache.set(path, articleStateFromFile(root, path));
    return cache.get(path);
  };
  return { root, referenceSources, sourceIds, referenceClasses, bookSummary, provenance, aiLedger, bookManifest, curriculumCategories, curriculumOf, egovArticles, stateOf };
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
    const stage = visualStage(v, ctx);
    if (stage === 'embedded' || stage === 'skipped') continue;
    const next = {
      'crop-missing': `切り出し図 ${v.crop?.book}/${v.crop?.id} を切り出して登録する（check-content-series --crop-jobs）`,
      planned: !v.figKey ? '元にする切り出し図（crop）か、置き場（figKey）を台帳に書く'
        : v.kind === 'photo' ? `npm run gen-article-photo -- --fig ${v.figKey}${ctx.provenance?.[v.figKey]?.prompt ? '' : ' --prompt "<被写体の指示>"'}`
        : `自作の SVG を content/site/${v.figKey}.svg に置く（create-svg）`,
      cropped: !v.figKey ? '記事の場所が決まったら figKey を台帳に書く'
        : v.kind === 'photo' ? `切り出し図を元に AI で描き直して配置する（npm run gen-article-photo -- --fig ${v.figKey} --from <描き直した画像>）`
        : `切り出し図を下敷きに自作の SVG を content/site/${v.figKey}.svg に置く（create-svg）`,
      unreviewed: 'ai-image-fidelity-auditor で判定して check-image-origin record-ai で記録する',
      failed: '指示を直して作り直す',
      created: `記事に <ArticleImage src="/posts/${v.figKey}.…"> を入れる`,
    }[stage];
    jobs.push({ series: s.id, item: it.id, kind: v.kind, subject: v.subject, crop: v.crop ?? null, figKey: v.figKey ?? null, stage, next });
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
    // 頁（図・写真を切り出す頁）: 項目は割り当てにあるもの、頁は書籍の台帳（book-manifest）にあるもの
    const manifest = ctx.bookManifest?.(bookId);
    const pageIds = manifest ? new Set(manifest.pages.map((p) => p.id)) : null;
    for (const [unit, pages] of Object.entries(book.pages ?? {})) {
      if (!(unit in (book.units ?? {}))) issues.push(`${bookId}/${unit}: 頁の欄にあるが割り当てに無い項目`);
      if (pageIds) for (const p of pages) if (!pageIds.has(p)) issues.push(`${bookId}/${unit}: 頁 ${p} が書籍の台帳に無い`);
    }
    if (!manifest) issues.push(`${bookId}: 書籍の台帳（book-manifest.json）が無い`);
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

/**
 * 章（シリーズ id/項目 id）→ 本の頁と、その頁の図の切り出しの状態（book-manifest の pages[].cropStatus・crops）。
 * 頁は割り当ての pages から。図は頁の上にあるので、章と図はこの頁でつながる（台帳に図の一覧を写さない）。
 */
export function chapterPages(basis, ctx) {
  const out = new Map();
  for (const [bookId, book] of Object.entries(basis.books ?? {})) {
    const manifest = ctx.bookManifest?.(bookId);
    const status = new Map((manifest?.pages ?? []).map((p) => [p.id, p.cropStatus]));
    const crops = new Map();
    for (const c of manifest?.crops ?? []) crops.set(c.pageId, (crops.get(c.pageId) ?? 0) + 1);
    for (const [unit, v] of Object.entries(book.units ?? {})) {
      if (typeof v !== 'string') continue;
      const cur = out.get(v) ?? { pages: [], noPageUnits: 0 };
      const pages = book.pages?.[unit] ?? [];
      if (pages.length === 0) cur.noPageUnits += 1;
      for (const page of pages) {
        if (!cur.pages.some((x) => x.book === bookId && x.page === page)) cur.pages.push({ book: bookId, page, cropStatus: status.get(page) ?? null, crops: crops.get(page) ?? 0 });
      }
      out.set(v, cur);
    }
  }
  return out;
}

/** 頁の切り出しの集計（切り出し待ち・図なし・済み・図の数）。 */
export function cropSummary(pages) {
  const t = { pages: pages.length, pending: 0, notNeeded: 0, done: 0, crops: 0 };
  for (const p of pages) {
    if (p.cropStatus === 'not-needed') t.notNeeded += 1;
    else if (p.cropStatus === 'complete') t.done += 1;
    else t.pending += 1;
    t.crops += p.crops;
  }
  return t;
}

/**
 * Codex に渡す切り出しの作業一覧: シリーズの章に使う頁のうち、切り出しが終わっていない頁（同じ頁は 1 回）。
 * 頁の画像は Drive vault の <書籍>/pages/<頁>.jpg、切り出した図は <書籍>/crops/<頁>_<図の id>.png に置き、
 * record-reference-book-artifacts で書籍の台帳へ登録する（図の無い頁は cropStatus を not-needed にする）。
 */
export function cropJobs(basis, ctx, { series = null } = {}) {
  const seen = new Set();
  const jobs = [];
  const pagesByItem = chapterPages(basis, ctx);
  for (const [item, info] of pagesByItem) {
    if (series && !item.startsWith(`${series}/`)) continue;
    for (const p of info.pages) {
      const key = `${p.book}/${p.page}`;
      if (seen.has(key) || p.cropStatus === 'complete' || p.cropStatus === 'not-needed') continue;
      seen.add(key);
      const src = ctx.referenceSources.find((r) => r.id === p.book);
      const dir = src?.bookBundle?.directory;
      jobs.push({
        book: p.book, page: p.page, chapters: [...pagesByItem].filter(([, i]) => i.pages.some((x) => x.book === p.book && x.page === p.page)).map(([k]) => k),
        pageImage: src?.origin?.vaultDir ? `${src.origin.vaultDir}/pages/${p.page}.jpg` : null,
        cropPath: dir ? `content/sources/books/${dir}/crops/${p.page}_<図の id>.png` : null,
        record: `npm run record-reference-book-artifacts -- --source-id ${p.book} --crop-path <cropPath> --crop-page ${p.page} --figure-id <図の id> --caption "<図の題>" --commit`,
      });
    }
  }
  return jobs;
}

/** 置き場（<資格>/<記事>/img/<名前>）から記事のパスを出す。 */
function articleOfFigKey(figKey) {
  const m = figKey.match(/^([a-z0-9-]+)\/([^/]+)\/img\//);
  return m ? `content/site/${m[1]}/${m[2]}/article.mdx` : null;
}

/**
 * 図・写真 1 枚の段階。手で書く欄は無く、切り出し図（book-manifest の crops）・画像の実体・AI 画像の台帳・記事の本文から出す。
 *   skipped（使わない）→ crop-missing（指定した切り出し図が台帳に無い）→ planned（切り出し図も置き場も無い）
 *   → cropped（切り出し図はあるが、サイトの画像がまだ無い）→ unreviewed / failed（写真の監査）→ created（記事にまだ入れていない）→ embedded
 */
export function visualStage(visual, ctx) {
  if (visual.skip) return 'skipped';
  if (visual.crop) {
    const crops = ctx.bookManifest?.(visual.crop.book)?.crops ?? [];
    if (!crops.some((c) => c.id === visual.crop.id)) return 'crop-missing';
  }
  const state = visualState(visual, ctx);
  if (state === 'planned' || state === 'spec') return visual.crop ? 'cropped' : 'planned';
  if (state === 'unreviewed' || state === 'not-generated') return 'unreviewed';
  if (state === 'failed') return 'failed';
  const article = articleOfFigKey(visual.figKey);
  const file = article ? join(ctx.root, ...article.split('/')) : null;
  const body = file && existsSync(file) ? readFileSync(file, 'utf8') : '';
  return body.includes(`/posts/${visual.figKey}.`) ? 'embedded' : 'created';
}

/**
 * 章ごとの画像の進み具合: 本の頁（切り出し待ち・図なし・済み）、その頁の切り出し図（対応を決めた・未対応）、図・写真の段階ごとの数。
 * 未対応 = 章の頁にある切り出し図のうち、どの計画（visuals の crop）にも結びついていないもの。
 */
export function imageProgress(view, basis, ctx) {
  const pagesByItem = chapterPages(basis, ctx);
  const out = new Map();
  for (const s of view) for (const sec of s.sections) for (const it of sec.items) {
    const key = `${s.id}/${it.id}`;
    const pages = pagesByItem.get(key)?.pages ?? [];
    const crops = [];
    for (const p of pages) for (const c of ctx.bookManifest?.(p.book)?.crops ?? []) if (c.pageId === p.page) crops.push({ book: p.book, id: c.id, page: p.page, caption: c.caption ?? null, path: c.path });
    const linked = new Set((it.visuals ?? []).filter((v) => v.crop).map((v) => `${v.crop.book}/${v.crop.id}`));
    const stages = Object.fromEntries(STAGES.map((st) => [st, 0]));
    const visuals = (it.visuals ?? []).map((v) => { const stage = visualStage(v, ctx); stages[stage] += 1; return { ...v, stage }; });
    out.set(key, {
      pages: cropSummary(pages),
      crops: crops.map((c) => ({ ...c, linked: linked.has(`${c.book}/${c.id}`) })),
      unlinkedCrops: crops.filter((c) => !linked.has(`${c.book}/${c.id}`)).length,
      visuals,
      stages,
    });
  }
  return out;
}

/**
 * シリーズの章 1 つの資料（packet）。割り当てた本の項目（本 id・項目 id・文字起こしのファイル・頁・見出し・字数）と、
 * 関連記事・根拠の id・注記・各本の文字起こしの場所を並べる。brief を作る担当と QA が読む（市販書籍の見出しを含むので
 * git 管理外の .tmp/ にだけ書く）。項目の見出しは Drive の候補表から引くので、Drive が無ければ null。
 * @returns {{ markdown: string, units: number } | null}
 */
export function chapterPacket(basis, config, ctx, vaultRoot, seriesId, itemId, articlePath) {
  if (!vaultRoot) return null;
  const series = (config.series ?? []).find((s) => s.id === seriesId);
  const item = series?.sections.flatMap((sec) => sec.items).find((i) => i.id === itemId);
  if (!item) throw new Error(`台帳に無い章: ${seriesId}/${itemId}`);
  // 先に台帳の paths に記事を入れる（書いた記事が台帳から外れないように。book-coverage-expansion.md §4 の 1）
  if (!(item.paths ?? []).includes(articlePath)) throw new Error(`${seriesId}/${itemId}: 台帳の paths に ${articlePath} が無い（先に台帳へ入れる）`);
  const key = `${seriesId}/${itemId}`;
  const lines = [];
  const ocrDirs = [];
  let units = 0;
  for (const [bookId, book] of Object.entries(basis.books ?? {})) {
    const src = ctx.referenceSources.find((s) => s.id === bookId);
    const dir = src?.origin?.vaultDir ? join(vaultRoot, ...src.origin.vaultDir.split('/')) : null;
    const file = dir ? join(dir, 'coverage', 'candidates.json') : null;
    if (!file || !existsSync(file)) throw new Error(`${bookId}: Drive に候補表が無い`);
    ocrDirs.push(`${bookId} → ${join(dir, 'ocr')}/`);
    const byId = new Map(JSON.parse(readFileSync(file, 'utf8')).units.map((u) => [u.id, u]));
    for (const [unit, v] of Object.entries(book.units ?? {})) {
      if (v !== key) continue;
      const u = byId.get(unit);
      if (!u) throw new Error(`${bookId}/${unit}: 候補表に無い項目`);
      lines.push(`- ${bookId} ${unit} ${u.file} ${u.page} 「${u.heading}」（${u.chars}字）`);
      units += 1;
    }
  }
  const dash = (xs) => (xs?.length ? xs.join('・') : '—');
  const markdown = [
    `# ${itemId} ${item.title}`, '',
    `- 記事: ${articlePath}${ctx.stateOf(articlePath).exists ? '' : '（新規）'}`,
    `- 関連記事（重複させない・リンクする）: ${dash(item.links)}`,
    `- 根拠の参考文献 id: ${dash(item.sources)}`,
    `- 注記: ${item.note ?? '—'}`, '',
    '## 割り当てた本の項目（文字起こしは各本の ocr/ にある）', '',
    ...lines, '',
    `OCR の場所: ${ocrDirs.join(' ; ')}`, '',
  ].join('\n');
  return { markdown, units };
}

// ---- 章の骨子（content/sources/series/<シリーズ id>/<項目 id>.md） ------------------------------------------
//
// 章（仕事の場面）から出発するシリーズは、章 → 論点 → 根拠 の向きでつなぐ（docs/strategy/18「章の骨子と根拠の配線」）。
// 骨子は自分の言葉の論点だけを持ち、市販書籍の見出し・文は入れない（本の項目は id だけで指す）。
// 形（book-coverage-expansion.md §4）:
//   ---
//   series: municipal-civil-engineer
//   item: A-08
//   status: draft            # draft | approved（運営者が確かめたら approved と approvedAt）
//   ---
//   ## 論点
//   - 占用許可の基準は物件・位置・構造で決まる
//     - 根拠: road-act#第33条 占用の許可基準
//     - 根拠: https://www.mlit.go.jp/... 運用通知（令和◯年）
//     - 本: civil1-textbook-management/u0123

export const OUTLINE_DIR = 'content/sources/series';
export const OUTLINE_LABELS = { none: '骨子なし', draft: '骨子あり', approved: '確認済み' };
/** 一次資料として数える参考文献の区分（法令・規格・要領・白書・省庁資料）。市販書籍は補助で数えない。 */
const PRIMARY_CLASSES = new Set(['external-primary', 'government-publication', 'exam-official']);

export function outlinePath(seriesId, itemId) {
  return `${OUTLINE_DIR}/${seriesId}/${itemId}.md`;
}

/** 根拠 1 つを読む。url・book（本 id/項目 id）・id（参考文献の台帳の id。# の後ろに条など）。 */
export function parseOutlineRef(raw, label) {
  const text = raw.trim();
  if (label === '本') {
    const m = /^(?:book:)?([a-z0-9][a-z0-9-]*)\/(u\d{4})\b\s*(.*)$/.exec(text);
    return m ? { kind: 'book', book: m[1], unit: m[2], note: m[3] } : { kind: 'invalid', value: text };
  }
  const url = /^(https?:\/\/\S+)\s*(.*)$/.exec(text);
  if (url) return { kind: 'url', value: url[1], note: url[2] };
  const id = /^([a-z0-9][a-z0-9-]*)(#\S+)?\s*(.*)$/.exec(text);
  return id ? { kind: 'id', id: id[1], detail: id[2] ?? '', note: id[3] } : { kind: 'invalid', value: text };
}

/** 骨子のファイルを読む: frontmatter・見出しごとの本文・論点と根拠。 */
export function parseOutline(text) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  const front = {};
  for (const line of (fm?.[1] ?? '').split(/\r?\n/)) {
    const m = /^([A-Za-z]+):\s*(.*?)\s*(?:#.*)?$/.exec(line);
    if (m) front[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  const body = fm ? text.slice(fm[0].length) : text;
  const sections = {};
  let current = null;
  for (const line of body.split(/\r?\n/)) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) { current = h[1]; sections[current] = []; continue; }
    if (current) sections[current].push(line);
  }
  const points = [];
  for (const line of sections['論点'] ?? []) {
    const top = /^- (?!根拠:|本:)(.+)$/.exec(line);
    if (top) { points.push({ text: top[1].trim(), refs: [] }); continue; }
    const ref = /^\s+- (根拠|本):\s*(.+)$/.exec(line);
    if (ref && points.length) points[points.length - 1].refs.push(parseOutlineRef(ref[2], ref[1]));
  }
  return { front, sections, points };
}

/** 骨子を全部読む。key は「シリーズ id/項目 id」。台帳に無い章のファイルは stray に入れる。 */
export function loadOutlines(root, config) {
  const outlines = new Map();
  const stray = [];
  const known = new Set((config.series ?? []).flatMap((s) => (s.sections ?? []).flatMap((sec) => sec.items.map((i) => `${s.id}/${i.id}`))));
  const dir = join(root, ...OUTLINE_DIR.split('/'));
  if (!existsSync(dir)) return { outlines, stray };
  for (const seriesId of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    for (const f of readdirSync(join(dir, seriesId)).filter((x) => x.endsWith('.md'))) {
      const key = `${seriesId}/${f.slice(0, -3)}`;
      const path = `${OUTLINE_DIR}/${key}.md`;
      const parsed = parseOutline(readFileSync(join(dir, seriesId, f), 'utf8'));
      if (!known.has(key)) stray.push(path);
      else outlines.set(key, { path, ...parsed });
    }
  }
  return { outlines, stray };
}

/** 根拠が一次資料（台帳の法令・要領・白書など）か URL か。本は数えない。 */
function refIsPrimary(ref, ctx) {
  if (ref.kind === 'url') return true;
  return ref.kind === 'id' && PRIMARY_CLASSES.has(ctx.referenceClasses.get(ref.id));
}

/** 骨子 1 本の要約（管理画面と検査の出力）。 */
export function outlineSummary(outline, ctx) {
  if (!outline) return { status: 'none', points: 0, withPrimary: 0, urlRefs: 0, bookRefs: 0, path: null };
  const pts = outline.points;
  return {
    status: outline.front.status === 'approved' ? 'approved' : 'draft',
    points: pts.length,
    withPrimary: ctx ? pts.filter((p) => p.refs.some((r) => refIsPrimary(r, ctx))).length : 0,
    urlRefs: pts.reduce((n, p) => n + p.refs.filter((r) => r.kind === 'url').length, 0),
    bookRefs: pts.reduce((n, p) => n + p.refs.filter((r) => r.kind === 'book').length, 0),
    path: outline.path,
    approvedAt: outline.front.approvedAt ?? null,
  };
}

/**
 * 骨子の違反。どの論点にも一次資料（台帳の法令・要領・白書か URL）が 1 つ以上あること、台帳の id・本の id が実在すること、
 * frontmatter が置き場と合い、確認済みなら論点があって確認日があること。本の項目 id は ctx.bookUnits（Drive の候補表）があれば照合する。
 */
export function outlineIssues({ outlines, stray }, ctx) {
  const issues = stray.map((p) => `${p}: シリーズの台帳に無い章の骨子`);
  for (const [key, o] of outlines) {
    const [seriesId, itemId] = key.split('/');
    const at = o.path;
    if (o.front.series !== seriesId || o.front.item !== itemId) issues.push(`${at}: frontmatter の series・item が置き場（${key}）と違う`);
    if (!['draft', 'approved'].includes(o.front.status)) issues.push(`${at}: status は draft か approved`);
    if (o.front.status === 'approved' && !/^\d{4}-\d{2}-\d{2}$/.test(o.front.approvedAt ?? '')) issues.push(`${at}: 確認済みなのに approvedAt（YYYY-MM-DD）が無い`);
    if (o.front.status === 'approved' && o.points.length === 0) issues.push(`${at}: 確認済みなのに論点が無い`);
    o.points.forEach((p, i) => {
      const where = `${at} 論点 ${i + 1}「${p.text.slice(0, 20)}」`;
      for (const r of p.refs) {
        if (r.kind === 'invalid') issues.push(`${where}: 根拠の形が読めない: ${r.value}`);
        else if (r.kind === 'id' && !ctx.sourceIds.has(r.id)) issues.push(`${where}: 根拠の id が参考文献の台帳に無い: ${r.id}`);
        else if (r.kind === 'id') {
          // 条は e-Gov の写しの本則の条と照合する（第32条の2 → 32_2。写しの無い法令・条を書かない根拠は照合しない）
          const m = /^#第(\d+)条((?:の\d+)*)/.exec(r.detail ?? '');
          const articles = m ? ctx.egovArticles?.(r.id) : null;
          if (m && articles && !articles.has([m[1], ...m[2].split('の').filter(Boolean)].join('_'))) issues.push(`${where}: ${r.id} に${r.detail.slice(1).match(/^第[\d]+条(?:の\d+)*/)[0]}が無い（e-Gov の写し）`);
        }
        else if (r.kind === 'book') {
          if (!ctx.referenceClasses.has(r.book)) issues.push(`${where}: 本の id が参考文献の台帳に無い: ${r.book}`);
          else {
            const units = ctx.bookUnits?.(r.book);
            if (units && !units.has(r.unit)) issues.push(`${where}: ${r.book} の候補表に項目 ${r.unit} が無い`);
          }
        }
      }
      if (!p.refs.some((r) => refIsPrimary(r, ctx))) issues.push(`${where}: 一次資料（法令・要領・白書の id か URL）の根拠が無い`);
    });
  }
  return issues;
}

/**
 * 章の根拠の候補: 章の題・注記・骨子の論点の語と、Drive の候補表の項目（見出し・頻出語）の 2 文字の重なりで並べる。
 * 見出しを含むので、出力は .tmp にだけ書く。books は { id, title, units } の配列（Drive の候補表から）。
 */
export function suggestUnits(query, books, { limit = 40 } = {}) {
  const grams = (s) => {
    const t = String(s).replace(/[\s、。・「」（）()【】〔〕\-—:：,.]/g, '');
    const out = new Set();
    for (let i = 0; i < t.length - 1; i += 1) out.add(t.slice(i, i + 2));
    return out;
  };
  const q = grams(query);
  const rows = [];
  for (const b of books) {
    for (const u of b.units) {
      const g = grams(`${u.heading}${(u.topTerms ?? []).join('')}`);
      if (g.size === 0) continue;
      let hit = 0;
      for (const x of g) if (q.has(x)) hit += 1;
      const score = hit / Math.sqrt(g.size);
      if (hit >= 2) rows.push({ book: b.id, title: b.title, unit: u.id, page: u.page, heading: u.heading, score });
    }
  }
  return rows.sort((a, b) => b.score - a.score).slice(0, limit);
}


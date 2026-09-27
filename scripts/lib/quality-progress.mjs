/**
 * quality-progress.mjs — 総監キーワードページ（cem プロファイル）の品質サイクル進捗を組み立てる唯一の実装。
 * ---------------------------------------------------------------------------
 * 入力: .claude/state/quality-scores.json（5 軸スコア）・quality-cycle-state.json（status / history）・
 *       keyword-summaries.json（題名）・.claude/state/metrics/gsc/gsc-page-*.json の最新（順位・表示・クリック）。
 * 読み手: 管理画面 管理 ＞ 品質概観 ＞ 品質サイクル進捗（/quality/progress）。
 * 旧 docs/editorial/05_品質サイクル進捗.md（build-progress-md.mjs が md へ書き出していた）を 2026-09-27 に置き換えた。
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { slugFromKey } from './url-normalization.mjs';

const SLUG_PREFIX = 'pe-comprehensive-management-';

function loadJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function loadLatestGscPage(GSC_DIR) {
  const files = readdirSync(GSC_DIR)
    .filter((f) => f.startsWith('gsc-page-') && f.endsWith('.json'))
    .sort();
  if (files.length === 0) return { rows: [], file: null };
  const latest = files[files.length - 1];
  return { ...loadJson(join(GSC_DIR, latest)), file: latest };
}

// 旧 /docs/pe-comprehensive-management-{slug} と 2026-08-22 移行後の新 URL
// （/exam/pe-comprehensive-management/keywords/{slug} 等）の両方を同じ slug に寄せる。
// 以前は旧 URL だけを見ていたため、移行後の GSC 行（新 URL）が進捗表から落ちていた。
function urlToSlug(url) {
  const full = slugFromKey(url);
  return full?.startsWith(SLUG_PREFIX) ? full.slice(SLUG_PREFIX.length) : null;
}

// 移行期は新旧 URL の行が同じ slug に 2 行ある。表示・クリックは合算し、順位は表示回数で重み付けする。
function mergeGscRow(prev, row) {
  if (!prev) return { ...row };
  const impressions = (prev.impressions ?? 0) + (row.impressions ?? 0);
  const clicks = (prev.clicks ?? 0) + (row.clicks ?? 0);
  const position = impressions
    ? ((prev.position ?? 0) * (prev.impressions ?? 0) + (row.position ?? 0) * (row.impressions ?? 0)) / impressions
    : prev.position ?? row.position ?? null;
  return { ...prev, impressions, clicks, position };
}

// ── 行ビルド ────────────────────────────────────────────────────

export function buildRows({ scores, state, summaries, gsc }) {
  const gscBySlug = new Map();
  for (const row of gsc.rows || []) {
    const slug = urlToSlug(row.keys?.[0] || '');
    if (slug) gscBySlug.set(slug, mergeGscRow(gscBySlug.get(slug), row));
  }

  const rows = [];
  for (const [slug, score] of Object.entries(scores.pages)) {
    const cycleEntry = state.pages?.[slug];
    const summary = summaries.keywords?.[slug];
    const g = gscBySlug.get(slug);

    const rewriteCount = (cycleEntry?.history || []).filter((h) => h.action === 'rewritten').length;
    const lastDate = (cycleEntry?.history || []).at(-1)?.date || score.scored_at;

    rows.push({
      slug,
      title: summary?.title || '—',
      gscPos: g?.position ?? null,
      impr: g?.impressions ?? 0,
      clicks: g?.clicks ?? 0,
      weighted: score.weighted,
      weakAxes: score.weak_axes || [],
      rewriteCount,
      status: cycleEntry?.status || '未着手',
      lastDate: lastDate ? lastDate.slice(0, 10) : '—',
    });
  }

  rows.sort((a, b) => a.weighted - b.weighted);
  return rows;
}

/** 状態別・weighted 別の件数。 */
export function summarize(rows) {
  return {
    total: rows.length,
    lt2: rows.filter((r) => r.weighted < 2.0).length,
    lt25: rows.filter((r) => r.weighted < 2.5).length,
    byStatus: rows.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {}),
  };
}

/** ファイルを読んで進捗を組み立てる。入力が欠けていれば present: false。 */
export function loadQualityProgress(root) {
  const p = (x) => join(root, '.claude/state', x);
  if (!existsSync(p('quality-scores.json')) || !existsSync(p('quality-cycle-state.json'))) return { present: false, rows: [], summary: summarize([]) };
  const scores = loadJson(p('quality-scores.json'));
  const state = loadJson(p('quality-cycle-state.json'));
  const summaries = existsSync(p('keyword-summaries.json')) ? loadJson(p('keyword-summaries.json')) : { keywords: {} };
  const gsc = existsSync(p('metrics/gsc')) ? loadLatestGscPage(p('metrics/gsc')) : { rows: [], file: null };
  const rows = buildRows({ scores, state, summaries, gsc });
  return { present: true, rows, summary: summarize(rows), gscFile: gsc.file, scoresAt: scores.scored_at ?? null };
}

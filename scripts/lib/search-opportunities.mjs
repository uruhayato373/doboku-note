/**
 * search-opportunities.mjs — 検索キーワード戦略（.claude/config/search-strategy.json）のクラスター別集計と改善候補。
 * ---------------------------------------------------------------------------
 * GSC の検索語×ページ集計（.claude/state/metrics/gsc/gsc-page-query-*.json・CI 供給）を読み、
 * クラスター（検索語の正規表現）ごとに 表示・クリック・1 桁順位の件数・11〜30 位の件数を出す。
 * 改善候補は「11〜30 位で表示がある検索語」をページ単位に束ねたもの（既存ページの手直しで 1 桁へ上げる対象）。
 * 既に SEO Rank Watch で観察中のページと、バックログにカードがあるページには印を付ける（二重に起票しない）。
 * 読み手: 週次レビュー（候補の上位をバックログへ起票）・月次レビュー（クラスター別の推移）・管理画面 検索 ＞ キーワード戦略。
 * ---------------------------------------------------------------------------
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const CONFIG = '.claude/config/search-strategy.json';
const GSC_DIR = '.claude/state/metrics/gsc';
const FILE_RE = /^gsc-page-query-(\d{4}-\d{2}-\d{2})T[\d-]+\.json$/;
const SITE = 'https://doboku-note.com';

const readJson = (root, rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
const pathOf = (url) => String(url).replace(SITE, '') || '/';

/** 期間の異なる検索語×ページ集計の一覧（新しい順）。同じ期間の重複取得は最新の 1 本だけ。 */
export function listPageQuerySnapshots(root) {
  const dir = join(root, GSC_DIR);
  if (!existsSync(dir)) return [];
  const seen = new Set();
  return readdirSync(dir)
    .filter((f) => FILE_RE.test(f))
    .sort()
    .reverse()
    .map((f) => ({ file: `${GSC_DIR}/${f}`, data: readJson(root, `${GSC_DIR}/${f}`) }))
    .filter(({ data }) => {
      const key = `${data.meta?.startDate}/${data.meta?.endDate}`;
      if (!data.meta?.startDate || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** クラスター 1 つ分の集計（純関数）。rows は GSC の { keys: [page, query], clicks, impressions, position }。 */
export function summarizeCluster(cluster, rows, striking, { watchedPaths = new Set(), cardedPaths = new Map() } = {}) {
  const re = new RegExp(cluster.queryPattern, 'i');
  const mine = rows.filter((r) => re.test(r.keys[1]));
  const impressions = mine.reduce((s, r) => s + r.impressions, 0);
  const clicks = mine.reduce((s, r) => s + r.clicks, 0);
  const weightedPos = impressions ? mine.reduce((s, r) => s + r.position * r.impressions, 0) / impressions : null;
  const inRange = mine.filter((r) => r.position >= striking.minPosition && r.position <= striking.maxPosition);

  const byPage = new Map();
  for (const r of inRange) {
    const page = pathOf(r.keys[0]);
    const g = byPage.get(page) ?? { page, queries: [], impressions: 0, clicks: 0 };
    g.queries.push({ query: r.keys[1], position: Math.round(r.position * 10) / 10, impressions: r.impressions, clicks: r.clicks });
    g.impressions += r.impressions;
    g.clicks += r.clicks;
    byPage.set(page, g);
  }
  const candidates = [...byPage.values()]
    .filter((g) => g.impressions >= striking.minImpressions)
    .map((g) => ({
      ...g,
      queries: g.queries.sort((a, b) => b.impressions - a.impressions),
      bestPosition: Math.min(...g.queries.map((q) => q.position)),
      inTarget: cluster.pagePrefixes.some((p) => g.page.startsWith(p)),
      legacyUrl: g.page.startsWith('/docs/'),
      watched: watchedPaths.has(g.page),
      card: cardedPaths.get(g.page) ?? null,
    }))
    .sort((a, b) => b.impressions - a.impressions || a.bestPosition - b.bestPosition);

  return {
    id: cluster.id,
    label: cluster.label,
    queries: mine.length,
    impressions,
    clicks,
    top10: mine.filter((r) => r.position <= 10).length,
    striking: inRange.length,
    avgPosition: weightedPos == null ? null : Math.round(weightedPos * 10) / 10,
    candidates,
  };
}

/** バックログのカードが本文で触れているページ（パス → DN-ID）。完了済みは削除されるので現役カードだけ。 */
export function cardedPathsFrom(backlogText) {
  const out = new Map();
  let current = null;
  for (const line of String(backlogText).split('\n')) {
    const m = /^### \[(DN-\d{4})\]/.exec(line);
    if (m) current = m[1];
    if (!current) continue;
    for (const p of line.match(/\/(?:exam|standards|practice|topics|docs|tools)\/[\w\-/]+/g) ?? []) {
      const clean = p.replace(/\/$/, '');
      if (!out.has(clean)) out.set(clean, current);
    }
  }
  return out;
}

/** クラスター別の集計・候補と、約 28 日前の集計との差（件数の推移）。 */
/**
 * Bing の検索語の候補（11〜30 位・クラスター別）。Bing Webmaster は検索語とページが別の集計で、
 * 検索語×ページの組が無いので、ページには束ねず検索語だけを出す（週次の行を直近 28 日分で合算・順位は表示回数で重み付け）。
 * rows = bing-*.json の sections.query.rows（{ date, query, impressions, clicks, avgImpressionPosition }）。
 */
export function summarizeBing(cluster, rows, striking, endDate) {
  const re = new RegExp(cluster.queryPattern, 'i');
  const end = Date.parse(endDate ?? rows.map((r) => r.date).sort().at(-1));
  const byQuery = new Map();
  for (const r of rows) {
    if (!re.test(r.query ?? '') || !(r.avgImpressionPosition > 0)) continue;
    const age = (end - Date.parse(r.date)) / 86_400_000;
    if (!(age >= 0 && age < 28)) continue;
    const g = byQuery.get(r.query) ?? { query: r.query, impressions: 0, clicks: 0, posSum: 0 };
    g.impressions += r.impressions ?? 0;
    g.clicks += r.clicks ?? 0;
    g.posSum += (r.avgImpressionPosition ?? 0) * (r.impressions ?? 0);
    byQuery.set(r.query, g);
  }
  const all = [...byQuery.values()].map((g) => ({ query: g.query, impressions: g.impressions, clicks: g.clicks, position: g.impressions ? Math.round((g.posSum / g.impressions) * 10) / 10 : null }));
  const candidates = all
    .filter((q) => q.position != null && q.position >= striking.minPosition && q.position <= striking.maxPosition && q.impressions >= striking.minImpressions)
    .sort((a, b) => b.impressions - a.impressions);
  return { queries: all.length, top10: all.filter((q) => q.position != null && q.position < 10.5).length, candidates };
}

/** 最新の Bing Webmaster の記録（.claude/state/metrics/bing/bing-YYYY-MM-DD.json）。無ければ null。 */
function latestBing(root) {
  const dir = join(root, '.claude/state/metrics/bing');
  if (!existsSync(dir)) return null;
  const name = readdirSync(dir).filter((f) => /^bing-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().at(-1);
  if (!name) return null;
  const data = JSON.parse(readFileSync(join(dir, name), 'utf8'));
  return data.sections?.query?.ok ? { file: name, rows: data.sections.query.rows ?? [] } : null;
}

export function buildSearchOpportunities(root) {
  const config = readJson(root, CONFIG);
  const snaps = listPageQuerySnapshots(root);
  if (!snaps.length) return { config, period: null, source: null, previous: null, clusters: [] };
  const latest = snaps[0];
  const prev = snaps.find((s) => (Date.parse(latest.data.meta.endDate) - Date.parse(s.data.meta.endDate)) / 86_400_000 >= 25) ?? null;
  const watch = existsSync(join(root, '.claude/config/seo-watchwords.json')) ? readJson(root, '.claude/config/seo-watchwords.json') : { watchwords: [] };
  const watchedPaths = new Set((watch.watchwords ?? []).map((w) => w.targetPath));
  const backlogPath = join(root, '.claude/todo/backlog.md');
  const cardedPaths = cardedPathsFrom(existsSync(backlogPath) ? readFileSync(backlogPath, 'utf8') : '');

  const bing = latestBing(root);
  const clusters = config.clusters.map((c) => {
    const now = summarizeCluster(c, latest.data.rows, config.striking, { watchedPaths, cardedPaths });
    const b = bing ? summarizeBing(c, bing.rows, config.striking) : null;
    const before = prev ? summarizeCluster(c, prev.data.rows, config.striking) : null;
    return {
      ...now,
      candidates: now.candidates.slice(0, config.striking.maxCandidatesPerCluster),
      candidateTotal: now.candidates.length,
      bing: b ? { queries: b.queries, top10: b.top10, candidates: b.candidates.slice(0, config.striking.maxCandidatesPerCluster), candidateTotal: b.candidates.length } : null,
      previous: before ? { impressions: before.impressions, clicks: before.clicks, top10: before.top10, striking: before.striking, avgPosition: before.avgPosition } : null,
    };
  });
  return {
    config,
    period: { startDate: latest.data.meta.startDate, endDate: latest.data.meta.endDate },
    source: latest.file,
    previous: prev ? { startDate: prev.data.meta.startDate, endDate: prev.data.meta.endDate, source: prev.file } : null,
    bingSource: bing?.file ?? null,
    clusters,
  };
}

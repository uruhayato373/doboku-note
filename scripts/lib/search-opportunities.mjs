/**
 * search-opportunities.mjs — 検索キーワード戦略（config/search-strategy.json）のクラスター別集計と改善候補。
 * ---------------------------------------------------------------------------
 * GSC の検索語×ページ集計（data/gsc/reports/<日付>.json の page-query・CI 供給）を読み、
 * クラスター（検索語の正規表現）ごとに 表示・クリック・上位の帯の件数・改善候補の帯の件数を出す。帯の境目は config の striking だけが持つ。
 * 改善候補は「改善候補の帯で表示がある検索語」をページ単位に束ねたもの（既存ページの手直しで上位へ上げる対象）。
 * 起票・計測・判定の状態は実験台帳（kind: search-strategy・search-improvement.mjs）から ID で引く。SEO Rank Watch で観察中のページにも印を付ける。
 * 読み手: 週次レビュー（fileable の上位を起票）・月次レビュー（クラスター別の推移と判定）・管理画面 検索 ＞ キーワード戦略。
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetPath, latestFile } from './datasets.mjs';
import { listReports } from './metric-reports.mjs';
import { SITE_ORIGIN } from './site-identity.mjs';
import { readJson } from './json-io.mjs';
import { readDatasetIf } from './dataset-io.mjs';
import { isLegacyPath } from './legacy-routes.mjs';
import { PHASES, RESULTS, dispatchIndex, experimentsByPage, isSearchExperiment, latestMeasurement, phaseOf } from './search-improvement.mjs';

export const CONFIG = datasetPath('config.search-strategy');

const pathOf = (url) => String(url).replace(SITE_ORIGIN, '') || '/';
const DAY = 86_400_000;
const windowDays = (p) => Math.round((Date.parse(p.endDate) - Date.parse(p.startDate)) / DAY) + 1;

/** 上位の帯（minPosition より上）。帯の判定はこの 2 つだけ */
export const inTop = (position, striking) => position < striking.minPosition;
/** 改善候補の帯（minPosition〜maxPosition） */
export const inStriking = (position, striking) => position >= striking.minPosition && position <= striking.maxPosition;
/** 帯の表示名（設定から作る。画面・CLI・カードに順位の数字を直書きしない） */
export function bandLabels(striking) {
  const from = Math.ceil(striking.minPosition);
  return { top: `${from - 1}位以内`, striking: `${from}〜${striking.maxPosition}位` };
}

/** 期間の異なる検索語×ページ集計の一覧（新しい順）。同じ期間の重複取得は最新の 1 本だけ。 */
export function listPageQuerySnapshots(root) {
  const seen = new Set();
  return listReports(root, 'gsc.page-query')
    .map((r) => ({ file: r.ref, data: r.data }))
    .filter(({ data }) => {
      const key = `${data.meta?.startDate}/${data.meta?.endDate}`;
      if (!data.meta?.startDate || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * クラスター 1 つ分の集計（純関数）。rows は GSC の { keys: [page, query], clicks, impressions, position }。
 * byPage は experimentsByPage（ページ → 計測中の EXP と最後に判定した EXP）、dispatchById は dispatch-log の索引。
 */
export function summarizeCluster(cluster, rows, striking, { watchedPaths = new Set(), byPage = new Map(), dispatchById = new Map() } = {}) {
  const re = new RegExp(cluster.queryPattern, 'i');
  const mine = rows.filter((r) => re.test(r.keys[1]));
  const impressions = mine.reduce((s, r) => s + r.impressions, 0);
  const clicks = mine.reduce((s, r) => s + r.clicks, 0);
  const weightedPos = impressions ? mine.reduce((s, r) => s + r.position * r.impressions, 0) / impressions : null;
  const inRange = mine.filter((r) => inStriking(r.position, striking));

  const grouped = new Map();
  for (const r of inRange) {
    const page = pathOf(r.keys[0]);
    const g = grouped.get(page) ?? { page, queries: [], impressions: 0, clicks: 0 };
    g.queries.push({ query: r.keys[1], position: Math.round(r.position * 10) / 10, impressions: r.impressions, clicks: r.clicks });
    g.impressions += r.impressions;
    g.clicks += r.clicks;
    grouped.set(page, g);
  }
  const candidates = [...grouped.values()]
    .filter((g) => g.impressions >= striking.minImpressions)
    .map((g) => {
      const exp = byPage.get(g.page) ?? {};
      const watched = watchedPaths.has(g.page);
      const legacyUrl = isLegacyPath(g.page);
      const experiment = exp.open ? { id: exp.open.id, phase: phaseOf(exp.open, dispatchById), card: exp.open.searchStrategy.card, nextCheck: exp.open.next_check_date ?? null } : null;
      return {
        ...g,
        queries: g.queries.sort((a, b) => b.impressions - a.impressions),
        bestPosition: Math.min(...g.queries.map((q) => q.position)),
        inTarget: cluster.pagePrefixes.some((p) => g.page.startsWith(p)),
        legacyUrl,
        watched,
        experiment,
        lastResult: exp.closed ? { id: exp.closed.id, result: exp.closed.result, closedAt: exp.closed.closed_at } : null,
        fileable: !watched && !legacyUrl && !experiment,
      };
    })
    .sort((a, b) => b.impressions - a.impressions || a.bestPosition - b.bestPosition);

  return {
    id: cluster.id,
    label: cluster.label,
    queries: mine.length,
    impressions,
    clicks,
    top10: mine.filter((r) => inTop(r.position, striking)).length,
    striking: inRange.length,
    avgPosition: weightedPos == null ? null : Math.round(weightedPos * 10) / 10,
    candidates,
  };
}

/** 候補の印（唯一の判定。CLI・管理画面・週次の下書きが使う）。key は表示の色分けに使う。 */
export function candidateMarks(p) {
  const out = [];
  if (p.experiment) out.push({ key: 'experiment', label: `${PHASES[p.experiment.phase]} ${p.experiment.id}・${p.experiment.card}` });
  if (p.watched) out.push({ key: 'watched', label: '観察中' });
  if (p.legacyUrl) out.push({ key: 'legacy', label: '旧URL' });
  if (!p.inTarget) out.push({ key: 'off-target', label: '受け皿外' });
  if (p.lastResult) out.push({ key: 'last', label: `前回 ${RESULTS[p.lastResult.result] ?? p.lastResult.result} ${p.lastResult.id}` });
  if (p.fileable) out.push({ key: 'unfiled', label: '未起票' });
  return out;
}

/**
 * Bing の検索語の候補（改善候補の帯・クラスター別）。Bing Webmaster は検索語とページが別の集計で、
 * 検索語×ページの組が無いので、ページには束ねず検索語だけを出す（週次の行を GSC と同じ日数で合算・順位は表示回数で重み付け）。
 * rows = bing-*.json の sections.query.rows（{ date, query, impressions, clicks, avgImpressionPosition }）。
 */
export function summarizeBing(cluster, rows, striking, days, endDate) {
  const re = new RegExp(cluster.queryPattern, 'i');
  const end = Date.parse(endDate ?? rows.map((r) => r.date).sort().at(-1));
  const byQuery = new Map();
  for (const r of rows) {
    if (!re.test(r.query ?? '') || !(r.avgImpressionPosition > 0)) continue;
    const age = (end - Date.parse(r.date)) / DAY;
    if (!(age >= 0 && age < days)) continue;
    const g = byQuery.get(r.query) ?? { query: r.query, impressions: 0, clicks: 0, posSum: 0 };
    g.impressions += r.impressions ?? 0;
    g.clicks += r.clicks ?? 0;
    g.posSum += (r.avgImpressionPosition ?? 0) * (r.impressions ?? 0);
    byQuery.set(r.query, g);
  }
  const all = [...byQuery.values()].map((g) => ({ query: g.query, impressions: g.impressions, clicks: g.clicks, position: g.impressions ? Math.round((g.posSum / g.impressions) * 10) / 10 : null }));
  const candidates = all
    .filter((q) => q.position != null && inStriking(q.position, striking) && q.impressions >= striking.minImpressions)
    .sort((a, b) => b.impressions - a.impressions);
  return { queries: all.length, top10: all.filter((q) => q.position != null && inTop(q.position, striking)).length, candidates };
}

/** 最新の Bing Webmaster の記録（台帳 bing.snapshots）。無ければ null。 */
function latestBing(root) {
  const file = latestFile(root, 'bing.snapshots');
  if (!file) return null;
  const data = JSON.parse(readFileSync(join(root, file), 'utf8'));
  return data.sections?.query?.ok ? { file, rows: data.sections.query.rows ?? [] } : null;
}

/** 起票してよい候補（全クラスター・表示の多い順・同じページは表示の多いクラスターの 1 件だけ）。 */
export function fileableCandidates(clusters) {
  const best = new Map();
  for (const c of clusters) for (const p of c.allCandidates ?? c.candidates) {
    if (!p.fileable) continue;
    const prev = best.get(p.page);
    if (!prev || p.impressions > prev.impressions) best.set(p.page, { ...p, cluster: c.id, clusterLabel: c.label });
  }
  return [...best.values()].sort((a, b) => b.impressions - a.impressions || a.bestPosition - b.bestPosition);
}

/** 実験台帳の検索改善（kind: search-strategy）の一覧行（段階・最後の自動計測つき）。 */
export function experimentRows(experiments, dispatchById, clusters) {
  const labelOf = new Map(clusters.map((c) => [c.id, c.label]));
  return experiments.filter(isSearchExperiment).map((e) => {
    const m = latestMeasurement(e);
    return {
      id: e.id,
      phase: phaseOf(e, dispatchById),
      cluster: e.searchStrategy?.cluster ?? null,
      clusterLabel: labelOf.get(e.searchStrategy?.cluster) ?? e.searchStrategy?.cluster ?? null,
      page: e.searchStrategy?.page ?? null,
      card: e.searchStrategy?.card ?? null,
      queries: e.measure?.scope?.queries?.length ?? 0,
      createdAt: e.created_at ?? null,
      startedAt: e.started_at ?? null,
      nextCheck: e.next_check_date ?? null,
      metric: e.measure?.metric ?? null,
      measurement: m ? { pre: m.pre?.value ?? null, post: m.post?.value ?? null, deltaPct: m.deltaPct, verdictHint: m.verdictHint, complete: m.complete } : null,
      result: e.result ?? null,
    };
  });
}

/**
 * maxCandidates はクラスターごとに返す候補の上限（既定は config の maxCandidatesPerCluster。管理画面は表で全件を出すので Infinity）。
 * asOf（YYYY-MM-DD）を渡すと、その日より前に終わる集計を最新として扱う（既存のカードを起票した日の状態で結ぶ link が使う）。
 */
export function buildSearchOpportunities(root, { maxCandidates, asOf } = {}) {
  const config = readJson(root, CONFIG);
  const limit = maxCandidates ?? config.striking.maxCandidatesPerCluster;
  const bands = bandLabels(config.striking);
  const ledger = readDatasetIf(root, 'business.experiments') ?? { experiments: [] };
  const dispatchById = dispatchIndex((readDatasetIf(root, 'state.dispatch-log') ?? { entries: [] }).entries);
  const experiments = experimentRows(ledger.experiments, dispatchById, config.clusters);
  const snaps = listPageQuerySnapshots(root).filter((s) => !asOf || s.data.meta.endDate < asOf);
  if (!snaps.length) return { config, bands, period: null, source: null, previous: null, clusters: [], fileable: [], experiments };
  const latest = snaps[0];
  // 比べる相手は最新と重ならない直前の期間（日数は集計の窓から決める）
  const prev = snaps.find((s) => s.data.meta.endDate < latest.data.meta.startDate) ?? null;
  const watch = readDatasetIf(root, 'config.seo-watchwords') ?? { watchwords: [] };
  const watchedPaths = new Set((watch.watchwords ?? []).map((w) => w.targetPath));
  const byPage = experimentsByPage(ledger.experiments);

  const bing = latestBing(root);
  const days = windowDays(latest.data.meta);
  const all = config.clusters.map((c) => {
    const now = summarizeCluster(c, latest.data.rows, config.striking, { watchedPaths, byPage, dispatchById });
    const b = bing ? summarizeBing(c, bing.rows, config.striking, days) : null;
    const before = prev ? summarizeCluster(c, prev.data.rows, config.striking) : null;
    return {
      ...now,
      allCandidates: now.candidates,
      candidates: now.candidates.slice(0, limit),
      candidateTotal: now.candidates.length,
      bing: b ? { queries: b.queries, top10: b.top10, candidates: b.candidates.slice(0, limit), candidateTotal: b.candidates.length } : null,
      previous: before ? { impressions: before.impressions, clicks: before.clicks, top10: before.top10, striking: before.striking, avgPosition: before.avgPosition } : null,
    };
  });
  const fileable = fileableCandidates(all);
  const clusters = all.map(({ allCandidates, ...c }) => c);
  return {
    config,
    bands,
    period: { startDate: latest.data.meta.startDate, endDate: latest.data.meta.endDate },
    source: latest.file,
    previous: prev ? { startDate: prev.data.meta.startDate, endDate: prev.data.meta.endDate, source: prev.file } : null,
    bingSource: bing?.file ?? null,
    clusters,
    fileable,
    experiments,
  };
}

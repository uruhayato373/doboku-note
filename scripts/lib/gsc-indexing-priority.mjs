/**
 * URL Inspection batch × GSC page 実績 から「登録リクエストを送る順番」を決める純関数群。
 *
 * なぜ: 登録リクエスト（GSC UI）は 1 日 10 件・人間の Google セッション必須で CI 化できない。
 * CI が毎週作れるのは「どの URL から送るか」の順位表まで。順位は **表示実績のある未登録**を先頭に
 * 置く（登録できれば即クリックに変わる期待値が最大）。登録済み・直近 cooldown 内にリクエスト済みは除く。
 */

const SITE = "https://doboku-note.com";

export const SEGMENT_ORDER = ["/exam/", "/practice/", "/topics/", "/tools/", "/standards/", "/"];

export function toPath(url) {
  let p = String(url ?? "").replace(/^https?:\/\/[^/]+/, "").replace(/[?#].*$/, "");
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p;
}

/** coverage_state / verdict を 5 分類にする（gsc-index-auditor と同じ語彙）。 */
export function classifyInspection(index) {
  const cs = String(index?.coverage_state ?? "");
  if (index?.verdict === "PASS") return "indexed";
  if (cs.includes("検出")) return "discovered";
  if (cs.includes("認識されていません")) return "unknown";
  if (cs.includes("重複")) return "duplicate";
  if (cs.includes("クロール済み")) return "crawled-not-indexed";
  return "other";
}

function segmentRank(path) {
  const i = SEGMENT_ORDER.findIndex((s) => (s === "/" ? true : path.startsWith(s)));
  return i < 0 ? SEGMENT_ORDER.length : i;
}

/**
 * @param {object} args
 * @param {Array<{url:string,index:object}>} args.batchResults  inspection-batch の results
 * @param {Array<{keys:string[],clicks:number,impressions:number}>} args.gscPageRows  gsc-page の rows
 * @param {Map<string,string>} args.legacyRoutes  旧 /docs パス → 正規パス
 * @param {Array<{collectedAt:string,acceptedSlugs?:string[]}>} args.requestRuns  gsc-indexing/history.json の runs
 * @param {Date} [args.now]
 * @param {number} [args.cooldownDays=14]
 */
export function buildIndexingPriority({ batchResults, gscPageRows, legacyRoutes, requestRuns = [], now = new Date(), cooldownDays = 14 }) {
  const canon = (p) => (p.startsWith("/docs/") ? legacyRoutes.get(p) ?? p : p);
  const demand = new Map();
  for (const r of gscPageRows ?? []) {
    const p = canon(toPath(r.keys?.[0]));
    const d = demand.get(p) ?? { impressions: 0, clicks: 0 };
    d.impressions += Number(r.impressions) || 0;
    d.clicks += Number(r.clicks) || 0;
    demand.set(p, d);
  }

  const cutoff = now.getTime() - cooldownDays * 86400000;
  const recentlyRequested = new Set();
  for (const run of requestRuns) {
    const t = Date.parse(run.collectedAt ?? "");
    if (Number.isFinite(t) && t >= cutoff) for (const s of run.acceptedSlugs ?? []) recentlyRequested.add(s);
  }

  const counts = { inspected: 0, indexed: 0, candidates: 0, withDemand: 0, cooledDown: 0 };
  const items = [];
  for (const r of batchResults ?? []) {
    counts.inspected++;
    const status = classifyInspection(r.index);
    if (status === "indexed") {
      counts.indexed++;
      continue;
    }
    const path = canon(toPath(r.url));
    if (recentlyRequested.has(path)) {
      counts.cooledDown++;
      continue;
    }
    const d = demand.get(path) ?? { impressions: 0, clicks: 0 };
    counts.candidates++;
    if (d.impressions > 0) counts.withDemand++;
    items.push({ path, status, reason: r.index?.coverage_state ?? null, impressions: d.impressions, clicks: d.clicks });
  }
  items.sort(
    (a, b) =>
      b.impressions - a.impressions ||
      b.clicks - a.clicks ||
      segmentRank(a.path) - segmentRank(b.path) ||
      a.path.localeCompare(b.path),
  );
  return { counts, items };
}

/**
 * 「送るべき URL が溜まっているのに人が送っていない」を判定する。
 * @returns {{due:boolean, reasons:string[], pendingWithDemand:number, lastAcceptedAt:string|null, daysSinceAccepted:number|null}}
 */
export function evaluateIndexingDue({ priority, requestRuns = [], now = new Date(), thresholdDays = 7 }) {
  if (!priority) {
    return { due: true, reasons: ["priority-latest.json が無い（index-coverage.yml の priority step が未実行・検査不能）"], pendingWithDemand: null, lastAcceptedAt: null, daysSinceAccepted: null };
  }
  const pending = Number(priority.counts?.withDemand) || 0;
  let lastAcceptedAt = null;
  for (const run of requestRuns) {
    if ((run.accepted ?? 0) > 0 && (!lastAcceptedAt || run.collectedAt > lastAcceptedAt)) lastAcceptedAt = run.collectedAt;
  }
  const daysSinceAccepted = lastAcceptedAt ? Math.floor((now.getTime() - Date.parse(lastAcceptedAt)) / 86400000) : null;
  const reasons = [];
  if (pending === 0) return { due: false, reasons: ["表示実績のある未登録 URL は 0 件"], pendingWithDemand: 0, lastAcceptedAt, daysSinceAccepted };
  if (daysSinceAccepted === null) reasons.push(`表示実績のある未登録 ${pending} 件に対し、登録リクエストの実績が無い`);
  else if (daysSinceAccepted >= thresholdDays) reasons.push(`表示実績のある未登録 ${pending} 件・最後のリクエストから ${daysSinceAccepted} 日（しきい値 ${thresholdDays} 日）`);
  return { due: reasons.length > 0, reasons: reasons.length ? reasons : [`表示実績のある未登録 ${pending} 件・最後のリクエスト ${daysSinceAccepted} 日前`], pendingWithDemand: pending, lastAcceptedAt, daysSinceAccepted };
}

export { SITE };

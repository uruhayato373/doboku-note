/**
 * URL Inspection batch × GSC page 実績 から「登録リクエストを送る順番」を決める純関数群。
 *
 * なぜ: 登録リクエスト（GSC UI）は 1 日 10 件・人間の Google セッション必須で CI 化できない。
 * CI が毎週作れるのは「どの URL から送るか」の順位表まで。登録済み・直近 cooldown 内にリクエスト済みは除く。
 *
 * 並び（上から順に比べる）:
 *   1. 表示実績のある未登録を先頭（表示の多い順 → クリックの多い順）。登録できれば即クリックに変わる期待値が最大
 *   2. 表示 0 の未登録は「型ごとの期待値」の降順。期待値 = 同じ型の登録済みページ 1 本あたりの 28 日表示
 *      （最大の 1 本を除く平均）× 同じ型の未登録率。登録できた分だけ同じ型の平均並みに表示が付くとみなす
 *      （2026-10-11 gsc-index-auditor の算定。パス昇順だと重点資格の guide・practice・tools が 60〜90 番目に沈んだ）
 *   3. 期待値が同じ（小数 1 桁で比べる）なら重点資格の型を先に（弱い加点・重点資格は config/business-direction.json）
 *   4. 内部リンク数が分かれば多い順（internalInbound を渡したときだけ）
 *   5. パス昇順
 *
 * 型: /exam/<資格>/<節>（guide・textbook・keywords・primary・secondary・past-exams …）・/practice・/tools・/topics（各ハブ込み）・
 *     /standards の 4 種（組織ハブ・規格ハブ・part-N・chapters）・/exam と資格ハブ・トップ階層（/・/about ほか）。
 * 登録済みが MIN_INDEXED_FOR_OWN_MEAN 本未満の型は、平均が当てにならないので上位のまとまり
 * （全資格の同じ節 → /exam 全体の順）の平均で代用する（未登録率は自分の型のまま）。代用したことは types[].basis に残す。
 */

/** 平均表示を自分の型の登録済みページから取るのに要る本数（これ未満は上位のまとまりで代用する） */
export const MIN_INDEXED_FOR_OWN_MEAN = 3;

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

/**
 * パス → 型。chain は平均表示を取る候補の並び（先頭が自分の型・後ろほど広いまとまり）。
 * qualification は /exam/<資格 id>/… の資格 id（それ以外は null）。
 * @returns {{key:string, chain:string[], qualification:string|null}}
 */
export function pageType(path) {
  const seg = String(path ?? "").split("/").filter(Boolean);
  const top = seg[0] ?? "";
  if (top === "exam") {
    if (seg.length <= 2) return { key: "exam/hub", chain: ["exam/hub"], qualification: null }; // /exam と /exam/<資格>
    const key = `exam/${seg[1]}/${seg[2]}`;
    return { key, chain: [key, `exam/*/${seg[2]}`, "exam"], qualification: seg[1] };
  }
  if (top === "standards") {
    const kind = seg.includes("chapters") ? "chapters" : /^part-\d+$/.test(seg.at(-1)) ? "part" : seg.length <= 2 ? "org-hub" : "std-hub";
    return { key: `standards/${kind}`, chain: [`standards/${kind}`, "standards"], qualification: null };
  }
  if (seg.length <= 1 && !["practice", "tools", "topics"].includes(top)) return { key: "site/top", chain: ["site/top"], qualification: null }; // /・/about・/contact・/privacy ほか
  return { key: top, chain: [top], qualification: null }; // practice・tools・topics（各ハブページ込み。ハブは最大の 1 本として平均から外れやすい）
}

const round = (x, digits) => Math.round(x * 10 ** digits) / 10 ** digits;

/** 最大の 1 本を除いた平均。2 本未満なら 0（平均として使えない） */
function meanWithoutMax(values) {
  if (values.length < 2) return 0;
  const rest = [...values].sort((a, b) => b - a).slice(1);
  return rest.reduce((sum, v) => sum + v, 0) / rest.length;
}

/**
 * @param {object} args
 * @param {Array<{url:string,index:object}>} args.batchResults  inspection-batch の results
 * @param {Array<{keys:string[],clicks:number,impressions:number}>} args.gscPageRows  gsc-page の rows
 * @param {Map<string,string>} args.legacyRoutes  旧 /docs パス → 正規パス
 * @param {Array<{collectedAt:string,acceptedSlugs?:string[]}>} args.requestRuns  gsc-indexing/history.json の runs
 * @param {string[]} [args.priorityQualifications]  重点資格の id（config/business-direction.json の qualifications[].id）
 * @param {Map<string,number>} [args.internalInbound]  パス → 内部リンク数（分かるときだけ）
 * @param {Date} [args.now]
 * @param {number} [args.cooldownDays=14]
 * @param {number} [args.minIndexed=MIN_INDEXED_FOR_OWN_MEAN]
 */
export function buildIndexingPriority({
  batchResults,
  gscPageRows,
  legacyRoutes,
  requestRuns = [],
  priorityQualifications = [],
  internalInbound = null,
  now = new Date(),
  cooldownDays = 14,
  minIndexed = MIN_INDEXED_FOR_OWN_MEAN,
}) {
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

  // 型・まとまりごとの検査数と、登録済みページの 28 日表示（cooldown 中も未登録として数える＝未登録率は検査した全 URL が分母）
  const stats = new Map();
  const statOf = (key) => {
    if (!stats.has(key)) stats.set(key, { inspected: 0, indexed: 0, impressions: [] });
    return stats.get(key);
  };
  const counts = { inspected: 0, indexed: 0, candidates: 0, withDemand: 0, cooledDown: 0 };
  const candidates = [];
  for (const r of batchResults ?? []) {
    counts.inspected++;
    const status = classifyInspection(r.index);
    const path = canon(toPath(r.url));
    const type = pageType(path);
    const d = demand.get(path) ?? { impressions: 0, clicks: 0 };
    for (const key of type.chain) {
      const s = statOf(key);
      s.inspected++;
      if (status === "indexed") {
        s.indexed++;
        s.impressions.push(d.impressions);
      }
    }
    if (status === "indexed") {
      counts.indexed++;
      continue;
    }
    if (recentlyRequested.has(path)) {
      counts.cooledDown++;
      continue;
    }
    counts.candidates++;
    if (d.impressions > 0) counts.withDemand++;
    candidates.push({ path, status, reason: r.index?.coverage_state ?? null, impressions: d.impressions, clicks: d.clicks, type });
  }

  // 候補のある型ごとの期待値
  const priority = new Set(priorityQualifications);
  const types = new Map();
  for (const { type } of candidates) {
    if (types.has(type.key)) continue;
    const own = stats.get(type.key);
    const levels = type.chain.map((key) => ({ key, ...stats.get(key) }));
    const enough = levels.find((l) => l.indexed >= minIndexed);
    const source = enough ?? levels.reduce((best, l) => (l.indexed > best.indexed ? l : best), levels[0]);
    const basis = !enough ? "insufficient" : source.key === type.key ? "own" : "substitute";
    const unindexedRate = (own.inspected - own.indexed) / own.inspected;
    const meanImpressions = meanWithoutMax(source.impressions);
    types.set(type.key, {
      type: type.key,
      qualification: type.qualification,
      priorityQualification: type.qualification !== null && priority.has(type.qualification),
      inspected: own.inspected,
      indexed: own.indexed,
      unindexed: own.inspected - own.indexed,
      unindexedRate: round(unindexedRate, 3),
      basis,
      meanSource: source.key,
      meanSourceIndexed: source.indexed,
      meanImpressions: round(meanImpressions, 2),
      expectedValue: round(meanImpressions * unindexedRate, 2),
    });
  }

  // 並べる。期待値は小数 1 桁で比べる（同じなら重点資格の型を先に）
  const ev10 = (e) => Math.round(types.get(e.type.key).expectedValue * 10);
  const inbound = (e) => internalInbound?.get(e.path) ?? 0;
  candidates.sort(
    (a, b) =>
      Number(b.impressions > 0) - Number(a.impressions > 0) ||
      b.impressions - a.impressions ||
      b.clicks - a.clicks ||
      ev10(b) - ev10(a) ||
      Number(types.get(b.type.key).priorityQualification) - Number(types.get(a.type.key).priorityQualification) ||
      inbound(b) - inbound(a) ||
      a.path.localeCompare(b.path),
  );
  const items = candidates.map(({ type, ...item }) => ({ ...item, type: type.key, expectedValue: types.get(type.key).expectedValue }));
  const typeRows = [...types.values()].sort((a, b) => b.expectedValue - a.expectedValue || a.type.localeCompare(b.type));
  return { counts, items, types: typeRows };
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


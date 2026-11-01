/**
 * inspection-cycle.mjs — URL 検査（index-coverage.yml）を 1 日の上限を超えて全件に届かせる「周回」の純関数（DN-0825）。
 *
 * URL Inspection API は 2,000 URL/日/property が上限で、安全側に 1 回 1,900 件までしか検査しない。sitemap がそれを超えると
 * （2026-10-21 に 2,017 件）残りが未検査のまま登録率の分母だけが増え、率が偽って下がった。
 * そこで 1 回で終わらない分は次の日の実行が続きから検査し、全件がそろった回だけを完了の batch にする。
 *
 *   - 新しい周回: sitemap の先頭から上限まで検査する
 *   - 続き: 直前の batch が未完了（partial）で、周回の開始から maxCycleDays 日以内なら、
 *     前回までの結果（今の sitemap にある URL で、失敗していないもの）を引き継ぎ、残りを上限まで検査する
 *   - 何もしない: 続きだけを頼まれ、今週の水曜以降に前回の周回が完了している
 *   - 再開: 水曜の結果を保存できず、直前の batch が先週以前なら木曜・金曜に新しい周回を始める
 *
 * batch の cycle 欄（startedAt・runs）が周回を表す。完了・未完了は今の sitemap の件数に対して数える。
 */

/** URL Inspection の 1 日上限 2,000 に対する安全マージン */
export const INSPECT_CAP = 1900;
/** 周回を続けられる日数（水曜に始めて金曜まで） */
export const MAX_CYCLE_DAYS = 3;

/** 直前の batch が続きを受けられる周回か（未完了・cycle あり・期限内） */
export function continuable(prior, now, maxCycleDays = MAX_CYCLE_DAYS) {
  if (!prior || prior.partial !== true || !prior.cycle?.startedAt) return false;
  const age = now - Date.parse(prior.cycle.startedAt);
  return Number.isFinite(age) && age >= 0 && age <= maxCycleDays * 86_400_000;
}

/** 直近の水曜 02:00 UTC（index-coverage.yml の新規周回開始時刻） */
function scheduledCycleStart(now) {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 4) % 7));
  start.setUTCHours(2, 0, 0, 0);
  if (start.getTime() > now) start.setUTCDate(start.getUTCDate() - 7);
  return start.getTime();
}

/**
 * 今回検査する URL を決める。
 * @param {{ sitemap: string[], prior: object | null, mode: 'new' | 'continue' | 'auto', now: number, cap?: number, maxCycleDays?: number }} o
 *   mode: new＝必ず新しい周回 / continue＝続きがあれば続け、今週の完了済み周回があれば何もしない、どちらも無ければ新しい周回 / auto＝続きがあれば続け、無ければ新しい周回
 * @returns {{ action: 'new' | 'continue' | 'skip', toInspect: string[], carried: object[], cycle: { startedAt: string, runs: number } | null, remaining: number }}
 */
export function planInspection({ sitemap, prior, mode, now, cap = INSPECT_CAP, maxCycleDays = MAX_CYCLE_DAYS }) {
  const urls = [...new Set(sitemap)];
  const canContinue = mode !== 'new' && continuable(prior, now, maxCycleDays);
  if (canContinue) {
    const inSitemap = new Set(urls);
    const carried = prior.results.filter((r) => inSitemap.has(r.url) && r.error === undefined);
    const done = new Set(carried.map((r) => r.url));
    const rest = urls.filter((u) => !done.has(u));
    return {
      action: 'continue',
      toInspect: rest.slice(0, cap),
      carried,
      cycle: { startedAt: prior.cycle.startedAt, runs: (prior.cycle.runs ?? 1) + 1 },
      remaining: rest.length,
    };
  }
  const priorGeneratedAt = Date.parse(prior?.generated_at ?? '');
  if (mode === 'continue' && prior?.partial === false && Number.isFinite(priorGeneratedAt) && priorGeneratedAt >= scheduledCycleStart(now)) {
    return { action: 'skip', toInspect: [], carried: [], cycle: null, remaining: 0 };
  }
  return {
    action: 'new',
    toInspect: urls.slice(0, cap),
    carried: [],
    cycle: { startedAt: new Date(now).toISOString(), runs: 1 },
    remaining: urls.length,
  };
}

/**
 * 引き継いだ結果と今回の結果を、今の sitemap に対する 1 つの batch にする（今回の結果が優先・並びは sitemap の順）。
 * total は sitemap の件数なので、partial は「sitemap の全 URL がそろっていない」を表す。
 */
export function mergeBatch({ sitemap, carried, fresh, cycle, generatedAt }) {
  const urls = [...new Set(sitemap)];
  const byUrl = new Map();
  for (const r of carried ?? []) byUrl.set(r.url, r);
  for (const r of fresh ?? []) byUrl.set(r.url, r);
  const results = urls.filter((u) => byUrl.has(u)).map((u) => byUrl.get(u));
  return {
    schemaVersion: 1,
    generated_at: generatedAt,
    partial: results.length < urls.length,
    completed: results.length,
    total: urls.length,
    cycle,
    results,
  };
}

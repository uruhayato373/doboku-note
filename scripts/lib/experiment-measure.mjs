// experiment-measure（純粋ロジック）— 実験台帳の `measure` 仕様から前後の窓を決め、値の比較と判定の目安を出す。
// 取得（GA4 / GSC / 売上台帳）と台帳への追記は scripts/measure-experiments.mjs。
//
// measure 仕様（experiments[].measure・任意）:
//   { specVersion: 1,
//     metric: 'gsc.clicks' | 'gsc.impressions' | 'gsc.position' | 'ga4.sessions' | 'ga4.event:<eventName>' | 'sales.revenue' | 'sales.count',
//     scope: { pages?: string[], pagePrefix?: string, source?: 'google' | 'all', productPrefix?: string, productIds?: string[] },
//     anchor?: 'YYYY-MM-DD'（既定 started_at の日付）, preDays: 28, postDays: 28, lagDays: 3,
//     direction: 'increase' | 'decrease', minEffect: 0.1（相対）, minVolume: 20,
//     target?: number（事後窓の絶対目標。新商品の売上など前後比が意味を持たない実験で使う） }
//
// 判定は目安（verdictHint）に留める。裁定（close）は週次レビューのトリアージと /nsm-experiment が行う。
import { createHash } from 'node:crypto';
import { addDays, GSC_FINAL_LAG_DAYS } from './business-direction.mjs';

const METRIC = /^(gsc\.(clicks|impressions|position)|ga4\.sessions|ga4\.event:[a-z0-9_]+|sales\.(revenue|count))$/;

/** 仕様の検査。エラーの配列（空なら有効）。 */
export function specErrors(spec) {
  const e = [];
  if (!spec || spec.specVersion !== 1) return ['specVersion: 1 が必要'];
  if (!METRIC.test(spec.metric ?? '')) e.push(`metric が不正: ${spec.metric}`);
  const s = spec.scope ?? {};
  if (spec.metric?.startsWith('sales.')) {
    if (!s.productPrefix && !(Array.isArray(s.productIds) && s.productIds.length)) e.push('sales.* は scope.productPrefix か scope.productIds が必要');
  } else if (!(Array.isArray(s.pages) && s.pages.length) && !s.pagePrefix) e.push('scope.pages か scope.pagePrefix が必要');
  for (const k of ['preDays', 'postDays']) if (!Number.isInteger(spec[k]) || spec[k] < 7) e.push(`${k} は 7 以上の整数`);
  if (!['increase', 'decrease'].includes(spec.direction)) e.push('direction は increase / decrease');
  if (spec.anchor && !/^\d{4}-\d{2}-\d{2}$/.test(spec.anchor)) e.push('anchor は YYYY-MM-DD');
  if (spec.target != null && !(Number.isFinite(spec.target) && spec.target >= 0)) e.push('target は 0 以上の数');
  return e;
}

export const specHash = (spec) => createHash('sha256').update(JSON.stringify(spec)).digest('hex').slice(0, 12);

/**
 * 前後の窓。post は anchor + lagDays から postDays 日。GSC 確定前（今日−4 日より後）は測らないので
 * post の終わりをそこで切り、切れたら complete:false（途中経過）。post が始まっていなければ null。
 */
export function measureWindows(spec, startedAt, today) {
  const anchor = spec.anchor ?? String(startedAt ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return null;
  const lag = spec.lagDays ?? 3;
  const pre = { startDate: addDays(anchor, -spec.preDays), endDate: addDays(anchor, -1) };
  const postStart = addDays(anchor, lag);
  const postEndFull = addDays(postStart, spec.postDays - 1);
  const lastFinal = addDays(today, -GSC_FINAL_LAG_DAYS);
  if (postStart > lastFinal) return null;
  const postEnd = postEndFull <= lastFinal ? postEndFull : lastFinal;
  return { anchor, pre, post: { startDate: postStart, endDate: postEnd }, complete: postEnd === postEndFull };
}

const days = (w) => Math.round((Date.parse(w.endDate) - Date.parse(w.startDate)) / 86400000) + 1;

/**
 * 判定の目安。量の指標は日あたりに直して比べる（窓の日数が違ってもよい）。順位は小さいほど良い。
 * value は { value, volume }（volume＝判定に足る母数か。position なら表示回数）。
 */
export function verdictHint(spec, pre, post, windows) {
  if (!windows.complete) return 'in-progress';
  if (spec.target != null) {
    if (post.value == null) return 'insufficient-data';
    const met = spec.direction === 'increase' ? post.value >= spec.target : post.value <= spec.target;
    return met ? 'target-met' : 'target-missed';
  }
  const minVolume = spec.minVolume ?? 20;
  if (pre.value == null || post.value == null || (pre.volume ?? 0) < minVolume || (post.volume ?? 0) < minVolume) return 'insufficient-data';
  const isRate = spec.metric === 'gsc.position';
  const a = isRate ? pre.value : pre.value / days(windows.pre);
  const b = isRate ? post.value : post.value / days(windows.post);
  if (a === 0) return b > 0 ? (spec.direction === 'increase' ? 'improved' : 'worse') : 'no-effect';
  const rel = (b - a) / a;
  const good = spec.direction === 'increase' ? rel : -rel;
  const minEffect = spec.minEffect ?? 0.1;
  if (good >= minEffect) return 'improved';
  if (good <= -minEffect) return 'worse';
  return 'no-effect';
}

/** 比較用の日あたり差分（%）。position はそのまま差。 */
export function deltaPct(spec, pre, post, windows) {
  if (pre.value == null || post.value == null) return null;
  if (spec.metric === 'gsc.position') return pre.value ? Math.round(((post.value - pre.value) / pre.value) * 1000) / 10 : null;
  const a = pre.value / days(windows.pre), b = post.value / days(windows.post);
  return a ? Math.round(((b - a) / a) * 1000) / 10 : null;
}

/** 売上台帳の集計（productId の接頭辞・日付の窓）。 */
export function sumSales(sales, spec, window) {
  const { productPrefix, productIds } = spec.scope;
  const matches = (id) => (productIds ?? []).includes(id) || Boolean(productPrefix && id.startsWith(productPrefix));
  const rows = sales.filter((s) => matches(String(s.productId ?? '').replace(/^article:/, '')) && s.date >= window.startDate && s.date <= window.endDate);
  const count = rows.length;
  const revenue = rows.reduce((a, s) => a + (Number(s.price) || 0), 0);
  return spec.metric === 'sales.count' ? { value: count, volume: count } : { value: revenue, volume: count };
}

/** ページが scope（pages の完全一致か pagePrefix の前方一致）に入るか。GA4 / GSC 共通の唯一の判定。 */
export const inScope = (page, scope) => (scope.pages ?? []).includes(page) || Boolean(scope.pagePrefix && page.startsWith(scope.pagePrefix));

/** GSC の page 行（正規 URL へ寄せ済み）を scope で絞って集計する。 */
export function sumGscPages(rows, spec) {
  const hit = rows.filter((r) => inScope(r.page, spec.scope));
  const clicks = hit.reduce((a, r) => a + r.clicks, 0);
  const impressions = hit.reduce((a, r) => a + r.impressions, 0);
  if (spec.metric === 'gsc.position') return { value: impressions ? Math.round((hit.reduce((a, r) => a + r.position * r.impressions, 0) / impressions) * 10) / 10 : null, volume: impressions };
  return spec.metric === 'gsc.clicks' ? { value: clicks, volume: clicks } : { value: impressions, volume: impressions };
}

/** 同じ仕様・同じ事後窓の自動計測が既にあるか（冪等性）。 */
export function alreadyMeasured(exp, hash, post) {
  return (exp.measurements ?? []).some((m) => m.source === 'auto' && m.specHash === hash && m.post?.endDate === post.endDate);
}

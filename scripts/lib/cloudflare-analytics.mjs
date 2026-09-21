/**
 * cloudflare-analytics.mjs — Cloudflare GraphQL Analytics API のクエリ組み立て・集計（純関数のみ）
 * ---------------------------------------------------------------------------
 * 背景: Cloudflare Pages 配信の doboku-note.com は Cloudflare 側にしかトラフィック実測が無い
 *   （GA4 は JS 計測でボット/クローラーを含まない）。異常検知（スパイク・国外比率）には
 *   ゾーン単位の httpRequests1dGroups が要る。
 * 方針: fetch は一切しない。クエリ文字列の組み立て・GraphQL エラーからの自己修復（フィールド剪定）・
 *   応答の集計・スパイク判定・鮮度チェックだけをここに置く。実際に叩く側（scripts/ 本体）が
 *   fetch を注入してこれらの純関数へ渡す。
 * usage: import { buildZoneQuery, pruneQueryFields, summarizeDays, spikeFlag, assessCloudflareMetrics } from './cloudflare-analytics.mjs'
 * exit code: このファイルは CLI を持たない（呼び出し側スクリプトの exit code に従う）。
 */

// sum{} のサブフィールド（1 要素 = 1 フィールド。ネストは "name { ... }" のまま 1 要素にする）。
// pruneQueryFields はこの「フィールド名が先頭」という形に依存して剪定する。
export const DEFAULT_SUM_FIELDS = [
  'requests',
  'pageViews',
  'bytes',
  'cachedRequests',
  'threats',
  'countryMap { clientCountryName requests bytes }',
  'responseStatusMap { edgeResponseStatus requests }',
];

/** sum{} フィールド文字列からフィールド名（先頭トークン）を取り出す。 */
const fieldName = (field) => String(field).trim().split(/[\s{]/, 1)[0];

/** ゾーン別 1 日集計の GraphQL クエリを組み立てる。fields は sum{} のサブフィールド配列（省略時 DEFAULT_SUM_FIELDS）。 */
export function buildZoneQuery({ zoneTag, since, until, fields = DEFAULT_SUM_FIELDS }) {
  if (!zoneTag) throw new Error('buildZoneQuery: zoneTag は必須');
  if (!since || !until) throw new Error('buildZoneQuery: since/until は必須');
  const sumBody = fields.join(' ');
  return `query {
  viewer {
    zones(filter: { zoneTag: "${zoneTag}" }) {
      httpRequests1dGroups(
        limit: 31
        filter: { date_geq: "${since}", date_leq: "${until}" }
        orderBy: [date_ASC]
      ) {
        sum { ${sumBody} }
        uniq { uniques }
        dimensions { date }
      }
    }
  }
}`;
}

/**
 * GraphQL エラーから「未知フィールド」名を特定し fields（sum{} サブフィールド配列）から除く。
 * 特定できない（メッセージが unknown field 形式でない）場合は fields をそのまま返し dropped: []。
 */
export function pruneQueryFields(fields, graphqlErrors) {
  const errors = Array.isArray(graphqlErrors) ? graphqlErrors : [];
  const dropped = [];
  for (const err of errors) {
    const message = typeof err?.message === 'string' ? err.message : '';
    const match = message.match(/Cannot query field "([^"]+)"/);
    if (match) dropped.push(match[1]);
  }
  if (dropped.length === 0) return { fields, dropped: [] };
  const survivors = fields.filter((field) => !dropped.includes(fieldName(field)));
  return { fields: survivors, dropped };
}

const STATUS_BUCKET = (status) => {
  const n = Number(status);
  if (!Number.isFinite(n)) return null;
  if (n >= 200 && n < 300) return '2xx';
  if (n >= 300 && n < 400) return '3xx';
  if (n >= 400 && n < 500) return '4xx';
  if (n >= 500 && n < 600) return '5xx';
  return null;
};

/** httpRequests1dGroups の日別 groups を人が読める日別サマリへ集計する。 */
export function summarizeDays(groups) {
  const list = Array.isArray(groups) ? groups : [];
  return list.map((g) => {
    const sum = g.sum ?? {};
    const status = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    for (const row of sum.responseStatusMap ?? []) {
      const bucket = STATUS_BUCKET(row.edgeResponseStatus);
      if (bucket) status[bucket] += row.requests ?? 0;
    }
    let jp = { requests: 0, bytes: 0 };
    const otherCountries = [];
    let otherRequests = 0;
    let otherBytes = 0;
    for (const row of sum.countryMap ?? []) {
      if (row.clientCountryName === 'JP') {
        jp = { requests: row.requests ?? 0, bytes: row.bytes ?? 0 };
      } else {
        otherRequests += row.requests ?? 0;
        otherBytes += row.bytes ?? 0;
        otherCountries.push({ country: row.clientCountryName ?? 'unknown', requests: row.requests ?? 0 });
      }
    }
    otherCountries.sort((a, b) => b.requests - a.requests);
    return {
      date: g.dimensions?.date ?? null,
      requests: sum.requests ?? 0,
      pageViews: sum.pageViews ?? 0,
      uniques: g.uniq?.uniques ?? 0,
      bytes: sum.bytes ?? 0,
      cachedRequests: sum.cachedRequests ?? 0,
      threats: sum.threats ?? 0,
      status,
      jp,
      other: { requests: otherRequests, bytes: otherBytes },
      topOther: otherCountries.slice(0, 5),
    };
  });
}

const median = (nums) => {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

/**
 * 直近日の JP リクエストが直前 6 日の中央値の 3 倍以上、または海外が国内を上回る日を異常として検知する。
 * daily は date 昇順とは限らない配列を受ける（内部でソートする）。3 日未満は判定不能。
 */
export function spikeFlag(daily) {
  const list = Array.isArray(daily) ? daily : [];
  if (list.length < 3) return { flagged: false, reason: 'insufficient-days', yesterdayJp: null, median6Jp: null, otherOverJp: false };
  const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const yesterday = sorted.at(-1);
  const prior = sorted.slice(-7, -1);
  const median6Jp = median(prior.map((d) => d.jp?.requests ?? 0));
  const yesterdayJp = yesterday.jp?.requests ?? 0;
  const yesterdayOther = yesterday.other?.requests ?? 0;
  const otherOverJp = yesterdayOther >= yesterdayJp;
  const spiked = median6Jp > 0 && yesterdayJp >= 3 * median6Jp;
  if (spiked || otherOverJp) {
    const reason = spiked && otherOverJp
      ? 'jp-spike-and-other-over-jp'
      : spiked
        ? 'jp-spike'
        : 'other-over-jp';
    return { flagged: true, reason, yesterdayJp, median6Jp, otherOverJp };
  }
  return { flagged: false, reason: null, yesterdayJp, median6Jp, otherOverJp };
}

/** 直近スナップショットの鮮度・件数から検査自体が成立しているかを判定する。 */
export function assessCloudflareMetrics(latestSnapshot, nowUtcMs, { maxAgeDays = 3 } = {}) {
  const reasons = [];
  if (!latestSnapshot) {
    return { status: 'FAIL', reasons: ['snapshot が存在しない'], inspected: 0 };
  }
  const fetchedAtMs = Date.parse(latestSnapshot.fetchedAt ?? '');
  const ageDays = Number.isFinite(fetchedAtMs) ? (nowUtcMs - fetchedAtMs) / 86400000 : Infinity;
  if (!Number.isFinite(fetchedAtMs) || ageDays > maxAgeDays) {
    reasons.push(`fetchedAt が ${maxAgeDays}日 を超えて古い（${Number.isFinite(ageDays) ? ageDays.toFixed(1) : 'invalid'}日）`);
  }
  const daysReturned = latestSnapshot.counts?.daysReturned ?? 0;
  if (daysReturned === 0) {
    reasons.push('counts.daysReturned が 0（API から日別データが 1 件も返っていない）');
  }
  return { status: reasons.length === 0 ? 'OK' : 'FAIL', reasons, inspected: daysReturned };
}

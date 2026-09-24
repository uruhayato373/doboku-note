// bing-webmaster（純粋ロジック）— Bing Webmaster Tools JSON API の応答を正規化する。I/O は scripts/fetch-bing-webmaster.mjs。
//
// 応答は WCF 形式で `{ d: [ { Date: "/Date(1695366000000-0700)/", Query, Clicks, Impressions, ... } ] }`。
// GetQueryStats / GetPageStats の Date は集計バケットの開始（週次バケットと見られるが初回取得まで未検証）。
// ここでは解釈を足さず、バケット日付と値をそのまま残す（週への按分はしない）。

/** "/Date(ms±hhmm)/" → 現地（オフセット適用）の YYYY-MM-DD。読めなければ null。 */
export function parseBingDate(raw) {
  const m = /\/Date\((-?\d+)([+-]\d{4})?\)\//.exec(String(raw ?? ''));
  if (!m) return null;
  let ms = Number(m[1]);
  if (m[2]) {
    const sign = m[2][0] === '-' ? -1 : 1;
    ms += sign * (Number(m[2].slice(1, 3)) * 60 + Number(m[2].slice(3, 5))) * 60000;
  }
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * kind: 'query' | 'page' | 'traffic'。page の Query 欄にはページ URL が入る（API 仕様）。
 * since（YYYY-MM-DD）より前のバケットは落とす（半年分を毎週積まないため）。
 */
export function normalizeBing(kind, body, { since = null } = {}) {
  const list = Array.isArray(body?.d) ? body.d : [];
  const rows = [];
  for (const r of list) {
    const date = parseBingDate(r.Date);
    if (!date || (since && date < since)) continue;
    const base = { date, clicks: n(r.Clicks), impressions: n(r.Impressions) };
    if (kind === 'traffic') rows.push(base);
    else rows.push({ ...base, [kind === 'page' ? 'page' : 'query']: String(r.Query ?? ''), avgClickPosition: n(r.AvgClickPosition), avgImpressionPosition: n(r.AvgImpressionPosition) });
  }
  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** API キーを含む URL をログへ出さないための伏せ字。 */
export const redactKey = (s) => String(s ?? '').replace(/apikey=[^&\s]+/gi, 'apikey=***');

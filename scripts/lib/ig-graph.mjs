// ig-graph.mjs — Instagram Graph API（graph.facebook.com・Facebook ログイン経路の Page/User トークン）の薄いクライアント。
//
// 背景（方針）: 既存の IG 計測は Playwright でライブ画面を読む reconciler（verify-ig-status.mjs）に
//   依存しており、UI 変更・ボット対策で壊れやすい。CI から素朴に叩ける API 経路として Graph API の
//   薄いラッパーをここへ置き、投稿一覧・インサイト・アカウント指標を fetch できるようにする。
//   本ファイルは HTTP I/O をクライアント関数に閉じ込め、判定ロジックは fetchImpl を注入できる
//   純関数（metricsFor / dropUnsupportedMetric / mediaToLive）に分離する（テストは実ネットワークを叩かない）。
//
// 要確認: メトリクス名は API バージョンで変わる。初回 run の insightsError で確定する。
//
// mediaToLive() の返り値は scripts/verify-ig-status.mjs の reconcile(packs, liveData) が受け取る
// liveData 形（shortcodes / live / recordedInfo）と同じにしてある（将来 Playwright 版と差し替え可能にする）。
//
// 使い方（例）:
//   import { createIgGraphClient, mediaToLive } from './lib/ig-graph.mjs';
//   const client = createIgGraphClient({ token, igUserId });
//   const { rows } = await client.listMedia({ max: 200 });
//   const liveData = mediaToLive(rows);
//
// exit code: このファイルはライブラリのみ。CLI 実行部を持たない。

const DEFAULT_API_VERSION = 'v23.0';
const DEFAULT_BASE = 'https://graph.facebook.com';

const FEED_METRICS = ['reach', 'views', 'likes', 'comments', 'saved', 'shares', 'total_interactions'];
const REELS_METRICS = [...FEED_METRICS, 'ig_reels_avg_watch_time'];
const STORY_METRICS = ['reach', 'views', 'replies'];

/** media_product_type からインサイトメトリクス配列を返す（純関数）。 */
export function metricsFor(productType) {
  const type = String(productType || '').toUpperCase();
  if (type === 'REELS') return [...REELS_METRICS];
  if (type === 'STORY') return [...STORY_METRICS];
  return [...FEED_METRICS]; // FEED / CAROUSEL_ALBUM / AD 等
}

/**
 * error.message 中に含まれるメトリクス名を metrics から除いた配列を返す（純関数）。
 * 1 つも特定できなければ ['reach'] に縮退する。
 */
export function dropUnsupportedMetric(metrics, errorMessage) {
  const msg = String(errorMessage || '');
  const remaining = (metrics || []).filter((m) => !msg.includes(m));
  if (remaining.length === (metrics || []).length) return ['reach']; // 特定できず→縮退
  if (remaining.length === 0) return ['reach'];
  return remaining;
}

// caption の先頭行を正規化（記号/空白を除き先頭 24 文字）。verify-ig-status.mjs の normHead と同一仕様。
function normHead(s) {
  if (!s) return '';
  const first = String(s).split('\n').map((x) => x.trim()).filter(Boolean)[0] || '';
  return first.replace(/[\s　・「」（）()【】、。:：!！?？📋✅▶#＃]/g, '').slice(0, 24);
}

// permalink（.../p/<shortcode>/ or .../reel/<shortcode>/）から shortcode を抽出する。
function shortcodeFromPermalink(permalink) {
  const m = String(permalink || '').match(/\/(?:p|reel)\/([^/]+)\/?/);
  return m ? m[1] : null;
}

/**
 * listMedia() の rows（media オブジェクト配列）を verify-ig-status.mjs の reconcile() が受け取る
 * liveData 形（shortcodes / live / recordedInfo）へ変換する（純関数）。
 */
export function mediaToLive(rows) {
  const shortcodes = [];
  const live = [];
  const recordedInfo = {};
  for (const m of rows || []) {
    const shortcode = m.shortcode || shortcodeFromPermalink(m.permalink);
    if (!shortcode) continue;
    const type = m.media_product_type === 'REELS' ? 'reel' : 'carousel';
    shortcodes.push(shortcode);
    live.push({
      shortcode,
      head: normHead(m.caption),
      type,
      permalink: m.permalink || null,
      timestamp: m.timestamp || null,
      id: m.id,
    });
    recordedInfo[shortcode] = { exists: true, type };
  }
  return { shortcodes, live, recordedInfo };
}

// 'YYYY-MM-DD' → unix 秒（UTC 0時起点。Graph API の since/until は unix 秒を受ける）。
function dateToUnixSeconds(dateStr) {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000);
}

// HTTP エラーを code 付き Error に正規化する（token を message に含めない）。
function toApiError(status, body) {
  const err = (body && body.error) || {};
  const code = err.code;
  const subcode = err.error_subcode;
  const message = String(err.message || `HTTP ${status}`).slice(0, 300);
  let kind = 'HTTP';
  if (status === 401 || status === 403 || code === 190) kind = 'AUTH';
  else if (status === 429 || (typeof code === 'number' && code >= 4 && code < 100)) kind = 'RATE';
  const e = new Error(message);
  e.code = kind;
  e.apiCode = code;
  e.apiSubcode = subcode;
  return e;
}

/**
 * Instagram Graph API クライアントを生成する。
 * @param {{token:string, igUserId:string, apiVersion?:string, base?:string, fetchImpl?:Function}} opts
 */
export function createIgGraphClient({
  token,
  igUserId,
  apiVersion = DEFAULT_API_VERSION,
  base = DEFAULT_BASE,
  fetchImpl = globalThis.fetch,
}) {
  if (!token) throw new Error('createIgGraphClient: token が必須です');
  if (!igUserId) throw new Error('createIgGraphClient: igUserId が必須です');

  function buildUrl(path, params = {}) {
    const url = new URL(`${base}/${apiVersion}${path}`);
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, v);
    }
    url.searchParams.set('access_token', token);
    return url.toString();
  }

  async function getJson(url) {
    const res = await fetchImpl(url);
    let body;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok || (body && body.error)) throw toApiError(res.status, body);
    return body;
  }

  /** paging.next を辿って全ページの data を配列で返す。 */
  async function pagedGet(url) {
    const rows = [];
    let next = url;
    while (next) {
      const body = await getJson(next);
      rows.push(...(body.data || []));
      next = body.paging && body.paging.next ? body.paging.next : null;
    }
    return rows;
  }

  /** メディア一覧を paging.next で辿り max 件で打ち切る。打ち切ったら truncated:true。 */
  async function listMedia({ limit = 100, max = 200 } = {}) {
    const fields = 'id,shortcode,permalink,timestamp,media_type,media_product_type,caption';
    let next = buildUrl(`/${igUserId}/media`, { fields, limit });
    const rows = [];
    let truncated = false;
    while (next) {
      const body = await getJson(next);
      for (const row of body.data || []) {
        if (rows.length >= max) {
          truncated = true;
          break;
        }
        rows.push(row);
      }
      if (truncated || rows.length >= max) {
        truncated = truncated || Boolean(body.paging && body.paging.next);
        break;
      }
      next = body.paging && body.paging.next ? body.paging.next : null;
    }
    return { rows, truncated };
  }

  /** 単一メディアのインサイトを取得。code 100（未対応メトリクス）は 1 回だけ縮退再試行。 */
  async function mediaInsights(media) {
    let metrics = metricsFor(media.media_product_type);
    const url1 = buildUrl(`/${media.id}/insights`, { metric: metrics.join(',') });
    try {
      const body = await getJson(url1);
      return { insights: body.data || [] };
    } catch (e) {
      if (e.apiCode !== 100) return { insights: null, insightsError: String(e.message || '').slice(0, 120) };
      const retryMetrics = dropUnsupportedMetric(metrics, e.message);
      const url2 = buildUrl(`/${media.id}/insights`, { metric: retryMetrics.join(',') });
      try {
        const body = await getJson(url2);
        return { insights: body.data || [] };
      } catch (e2) {
        return { insights: null, insightsError: String(e2.message || '').slice(0, 120) };
      }
    }
  }

  /** アカウント全体のリーチ推移（30 日以内・日次）。 */
  async function accountInsights({ since, until }) {
    const url = buildUrl(`/${igUserId}/insights`, {
      metric: 'reach',
      period: 'day',
      since: dateToUnixSeconds(since),
      until: dateToUnixSeconds(until),
    });
    const body = await getJson(url);
    const series = ((body.data || []).find((d) => d.name === 'reach') || {}).values || [];
    return series.map((v) => ({
      date: String(v.end_time || '').slice(0, 10),
      reach: v.value,
    }));
  }

  /** アカウント基本情報（フォロワー数・投稿数・ユーザー名）。 */
  async function accountFields() {
    const url = buildUrl(`/${igUserId}`, { fields: 'followers_count,media_count,username' });
    return getJson(url);
  }

  /** トークンの有効期限・スコープを確認する。返り値・ログに token 値は含めない。 */
  async function debugToken() {
    const url = `${base}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`;
    const body = await getJson(url);
    const data = body.data || {};
    return {
      type: data.type || null,
      expiresAt: data.expires_at || 0,
      dataAccessExpiresAt: data.data_access_expires_at || 0,
      scopes: data.scopes || [],
    };
  }

  return { pagedGet, listMedia, mediaInsights, accountInsights, accountFields, debugToken };
}

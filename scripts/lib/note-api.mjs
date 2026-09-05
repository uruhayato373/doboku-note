/**
 * note-api.mjs — note.com 公開 API への唯一の入口。
 *
 * 背景: `note.com/api/v3/notes` を叩くコードが 14 本中 13 本で個別実装され、
 *   URL・404 の意味・エラー処理がファイルごとに少しずつ違っていた（2026-08-25 棚卸し）。
 *   新規に書くコードはここを呼ぶ。既存実装は一括移行せず、修正対象になった時点で
 *   この共有 lib へ移し、挙動同一を確認する。
 *
 * **設計原則: URL・バージョン番号はこのファイルの外に出さない。**
 *   note.com 側の API バージョニングはこちらが操作できない外部都合であり、
 *   呼び出し側が知る必要はない。API 面は用途名（fetchNote / fetchMagazine /
 *   fetchMagazineArticles）だけで、URL 文字列はこのファイル内にしか存在しない。
 *   note が API を変えたら直すのはこのファイル 1 つ。
 *
 * 罠（2026-08-25 実測。ここに書く以外の場所には書かない）:
 *   - マガジン単体の取得は `/api/v2/magazines/{key}` が**存在しない**。叩くと
 *     HTML の 404 ページが返り、JSON でないので「取得失敗」に化ける
 *     （60 件走査して 60 件とも失敗した）。正しくは v3。
 *   - マガジン**収録記事**の一覧は今も v1（`/api/v1/magazines/{key}/notes`）が現役。
 *     番号が小さい＝旧ではない。v3 に同等機能があると確認できるまではこちらが正。
 *   - **404 は「削除」「下書き」「非公開」を区別しない**。dead は「もう見えない」
 *     という以上の意味を持たせないこと。
 *
 * 取得は curl（`fetch` は HTTP(S)_PROXY を見ず会社 PC で全滅する）。
 */
import { spawnSync } from 'node:child_process';
export { isUnmeasurable } from './note-live-check.mjs';
import { isUnmeasurable, textLen } from './note-live-check.mjs';

const sleepSync = (ms) => spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`]);

/** curl で JSON を取る。JSON でない応答（HTML の 404 等）は取得失敗として区別する。 */
function curlJson(url, { retries = 1, delayMs = 2000, timeoutSec = 25 } = {}) {
  let lastErr = 'unknown';
  for (let i = 0; i <= retries; i += 1) {
    const r = spawnSync('curl', [
      '-sS', '-m', String(timeoutSec), '--ssl-no-revoke',
      '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json',
      url,
    ], { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    const out = (r.stdout || '').trim();
    if (out.startsWith('{') || out.startsWith('[')) {
      try { return { json: JSON.parse(out), error: null }; }
      catch (e) { lastErr = `parse: ${String(e.message || e)}`; }
    } else {
      lastErr = (r.stderr || '').trim().split('\n')[0] || `non-json (${out.slice(0, 60)})`;
    }
    if (i < retries) sleepSync(delayMs);
  }
  return { json: null, error: String(lastErr) };
}

/** note API のエラー応答（形が一定しない）から文字列を作る。オブジェクトを [object Object] にしない。 */
function describeApiError(json, d) {
  const e = json?.error ?? d?.error ?? 'not-found';
  if (typeof e === 'string') return e;
  return e?.code || e?.message || JSON.stringify(e).slice(0, 80);
}

/**
 * 記事の状態を取得する。
 *
 * state:
 *   'alive'        … 存在し、公開 API から中身が読める
 *   'unmeasurable' … 存在するが未ログインでは中身が返らない（会員限定等・isUnmeasurable 参照）
 *   'dead'         … 存在しない（削除・下書き・非公開のいずれか。区別不可）
 *   'unknown'      … 取得できていない（ネットワーク・プロキシ・タイムアウト）。dead ではない
 *
 * `bodyLen` は**可読文字数**（HTML タグを除いた長さ）。生 HTML の長さではない——
 * タグを含めると読者が見る量の 3〜5 倍に膨らみ、無料プレビュー下限（600 字等）との
 * 比較に使えない値になる（2026-08-25 に note-probe で一度これを取り違えた）。
 *
 * @returns {Promise<{state: 'alive'|'unmeasurable'|'dead'|'unknown', status: string|null,
 *   price: number|null, isLimited: boolean|null, bodyLen: number, tags: number, error: string|null}>}
 */
export async function fetchNote(key, opts = {}) {
  const empty = { status: null, price: null, isLimited: null, bodyLen: 0, tags: 0 };
  const { json, error } = curlJson(`https://note.com/api/v3/notes/${key}`, opts);
  if (error) return { state: 'unknown', ...empty, error };
  const d = json.data || json;
  if (json.error || d?.error || (!d?.status && !d?.id && !d?.key)) {
    return { state: 'dead', ...empty, error: describeApiError(json, d) };
  }
  const um = isUnmeasurable(d);
  return {
    state: um ? 'unmeasurable' : 'alive',
    status: d.status ?? null,
    price: d.price ?? null,
    isLimited: typeof d.is_limited === 'boolean' ? d.is_limited : null,
    bodyLen: textLen(d.body || ''),
    tags: (d.hashtag_notes || []).length,
    error: null,
  };
}

/**
 * マガジン単体の状態を取得する。
 * @returns {Promise<{state: 'alive'|'dead'|'unknown', status: string|null, name: string|null, error: string|null}>}
 */
export async function fetchMagazine(key, opts = {}) {
  const { json, error } = curlJson(`https://note.com/api/v3/magazines/${key}`, opts);
  if (error) return { state: 'unknown', status: null, name: null, error };
  const d = json.data || json;
  if (json.error || d?.error || (!d?.status && !d?.key)) {
    return { state: 'dead', status: null, name: null, error: describeApiError(json, d) };
  }
  return { state: 'alive', status: d.status ?? null, name: d.name ?? null, error: null };
}

/**
 * マガジン収録記事の一覧（全ページ）。
 * @returns {Promise<{articles: Array<{key: string, name: string, price: number}>, error: string|null}>}
 */
export async function fetchMagazineArticles(key, { maxPages = 20, ...opts } = {}) {
  const articles = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const { json, error } = curlJson(`https://note.com/api/v1/magazines/${key}/notes?page=${page}`, opts);
    if (error) return { articles, error: page === 1 ? error : null }; // 途中ページの失敗は部分結果を返す
    const d = json.data || json;
    const notes = d?.notes ?? [];
    if (notes.length === 0) break;
    for (const n of notes) articles.push({ key: n.key, name: n.name, price: n.price ?? 0 });
    if (d?.isLastPage) break;
  }
  return { articles, error: null };
}

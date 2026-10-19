/**
 * R2 へ送った画像の CDN キャッシュ更新と照合の判定（scripts/purge-r2-changed.mjs が使う・副作用なし）。
 *
 * 同じ URL へ上書きしても Cloudflare の CDN は max-age の間は旧版を返す（DN-0756・2026-10-16 に 140 点中 22 点が旧 SVG）。
 * r2-sync は送った画像だけを URL で purge し、通常 URL の実体の SHA-256 が送った中身と一致するかを数える。
 */

/** Cloudflare の purge_cache（URL 指定）は 1 リクエスト 30 URL まで */
export const PURGE_BATCH = 30;

export function chunk(list, size = PURGE_BATCH) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/**
 * 照合結果から終了コードを決める。
 * results: [{ key, overwritten, status: 'match' | 'mismatch' | 'fetch-failed' }]
 * 0 = 全件一致 / 1 = 不一致あり / 2 = 検査不成立（取れなかった画像が 1 件でもある）。
 * 対象 0 件は 0（送った画像が無い＝照合するものが無い）で、reason で「検査した」と区別する。
 */
export function judgeCdnCheck(results) {
  const count = (s) => results.filter((r) => r.status === s).length;
  const summary = { targets: results.length, checked: results.length - count('fetch-failed'), match: count('match'), mismatch: count('mismatch'), fetchFailed: count('fetch-failed') };
  if (results.length === 0) return { exitCode: 0, summary, reason: 'no-targets' };
  if (summary.mismatch > 0) return { exitCode: 1, summary, reason: 'mismatch' };
  if (summary.fetchFailed > 0) return { exitCode: 2, summary, reason: 'unchecked' };
  return { exitCode: 0, summary, reason: 'all-match' };
}

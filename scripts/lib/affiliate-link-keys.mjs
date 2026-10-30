/**
 * affiliate-link-keys.mjs — 文章・HTML から広告リンクと計測ピクセルの「素材のキー」を取り出す（ASP 横断の唯一の実装）。
 *
 * キーは config/affiliate-mats.json の mat 欄と同じ形:
 *   A8     … a8mat の 4 トークン（例 4B5OO5+FHBA2+5B0Y+NTZCH）
 *   もしも … moshimo:<p_id>:<pl_id>（案件 id と素材 id。a_id はサイトごとの会員 id なのでキーに入れない）
 * 2026-10-30 まで検査は a8mat= だけを見ていて、もしもの素材（建築転職）を置くと未登録も二重発火も検知できなかった。
 */

const A8_MAT = /a8mat=([0-9A-Z]+(?:\+[0-9A-Z]+){3})/g;
// もしものクリック（af/c/click）とインプレッション（af/i/impression）。& は HTML では &amp; になる
const MOSHIMO = /moshimo\.com\/af\/(c\/click|i\/impression)\?([^"'\s<>\\]+)/g;

function moshimoKey(query) {
  const q = new URLSearchParams(query.replace(/&amp;/g, '&'));
  const p = q.get('p_id');
  const pl = q.get('pl_id');
  return p && pl && /^\d+$/.test(p) && /^\d+$/.test(pl) ? `moshimo:${p}:${pl}` : null;
}

/** 文章の中の広告リンク・ピクセルの素材キー（重複あり・出現順） */
export function linkKeys(text) {
  const s = String(text ?? '');
  const keys = [...s.matchAll(A8_MAT)].map((m) => m[1]);
  for (const m of s.matchAll(MOSHIMO)) {
    const key = moshimoKey(m[2]);
    if (key) keys.push(key);
  }
  return keys;
}

/**
 * 描画済み HTML の計測ピクセル（<img> と、意匠実験の発火源の印 <span data-a8-pixel>）の素材キーごとの回数。
 * RSC payload の JSON はタグでないので数えない（二重計上しない）。
 */
export function impressionKeyCounts(html) {
  const counts = {};
  const add = (k) => { if (k) counts[k] = (counts[k] || 0) + 1; };
  for (const m of String(html ?? '').matchAll(/<(?:img|span)[^>]*(?:src|data-a8-pixel)="([^"]*)"[^>]*>/g)) {
    const url = m[1];
    const a8 = /0\.gif\?a8mat=([^"&]+)/.exec(url);
    if (a8) add(a8[1]);
    const mo = /moshimo\.com\/af\/i\/impression\?(.+)$/.exec(url);
    if (mo) add(moshimoKey(mo[1]));
  }
  return counts;
}

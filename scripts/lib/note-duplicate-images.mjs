/**
 * note-duplicate-images.mjs — note 記事の本文で同じ画像を 2 回以上使っていないかの判定。
 *
 * note は同じ画像の 2 枚目がアップロード後の CDN 確定に至らず、全文更新
 * （note-update-body）が「CDN確定待ちタイムアウト」で中断する。保存しないので破損はしないが、
 * その記事は二度と全文更新できない（2026-09-23 に経験記述の無料記事で実測。末尾の著者
 * バナーが 2 枚あり、720 秒待っても 1/2 のまま）。wire-note-paid-cta は有料記事だけ重複を
 * 除去していたので、無料記事と著者バナーは素通りしていた。
 *
 * 判定は本文の `![alt](path)`（外部 URL を除く）を、先頭の ./ を落としたパスで比べる。
 * frontmatter とコードブロックは見ない。
 */
const IMG_RE = /!\[[^\]]*\]\(\s*([^)\s]+)[^)]*\)/g;

/** @returns {{line:number, path:string, firstLine:number}[]} 2 回目以降の出現（行番号は元ファイル基準） */
export function findDuplicateImages(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let start = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) start = end + 1;
  }
  const seen = new Map();
  const dups = [];
  let inFence = false;
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*```/.test(l)) { inFence = !inFence; continue; }
    if (inFence) continue;
    for (const m of l.matchAll(IMG_RE)) {
      const p = m[1];
      if (/^https?:\/\//.test(p)) continue;
      const key = p.replace(/^\.\//, '');
      if (seen.has(key)) dups.push({ line: i + 1, path: key, firstLine: seen.get(key) });
      else seen.set(key, i + 1);
    }
  }
  return dups;
}

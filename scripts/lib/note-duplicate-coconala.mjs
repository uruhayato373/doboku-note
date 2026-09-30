/**
 * note-duplicate-coconala.mjs — note 記事で同じココナラ出品 URL を 2 回以上載せていないかの判定。
 *
 * 冒頭の標準化で冒頭（有料ラインの前）にココナラ導線を置いたあとも、本文途中・末尾の
 * 旧導線が残り、57 記事で同じ出品が 2 回出ていた（2026-09-30）。有料記事の末尾は購入者にしか
 * 見えないので、導線は冒頭の 1 か所に寄せる。
 *
 * 判定は本文の coconala.com/services/{id} を id で比べる。frontmatter とコードブロックは見ない。
 */
const URL_RE = /coconala\.com\/services\/(\d+)/g;

/** @returns {{line:number, id:string, firstLine:number}[]} 2 回目以降の出現（行番号は元ファイル基準） */
export function findDuplicateCoconala(content) {
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
    for (const m of l.matchAll(URL_RE)) {
      if (seen.has(m[1])) dups.push({ line: i + 1, id: m[1], firstLine: seen.get(m[1]) });
      else seen.set(m[1], i + 1);
    }
  }
  return dups;
}

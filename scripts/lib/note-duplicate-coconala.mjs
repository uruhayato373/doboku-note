/**
 * note-duplicate-coconala.mjs — note 記事で同じココナラ出品 URL を 2 回以上載せていないかの判定。
 *
 * 冒頭の標準化で冒頭（有料ラインの前）にココナラ導線を置いたあとも、本文途中・末尾の
 * 旧導線が残り、57 記事で同じ出品が 2 回出ていた（2026-09-30）。導線は冒頭の 1 か所に寄せる。
 *
 * 例外（2026-10-07）: 有料記事で、有料ライン（frontmatter の paidBoundary 見出し）より後ろに
 * `<!-- cta:coconala-buyer -->` で始めた購入者向けの導線は数えない。模範答案を買った人は
 * 添削を頼む見込みが最も高い読者なので、読み終えた位置で案内する（主任技士 小論文で採用）。
 *
 * 判定は本文の coconala.com/services/{id} を id で比べる。frontmatter とコードブロックは見ない。
 */
const URL_RE = /coconala\.com\/services\/(\d+)/g;
const BUYER_MARKER_RE = /^\s*<!--\s*cta:coconala-buyer\s*-->\s*$/;
/** 購入者向けブロックの範囲（マーカー行から何行先までを同じブロックとみなすか）。 */
const BUYER_BLOCK_LINES = 6;

function paidBoundaryOf(lines, fmEnd) {
  for (let i = 1; i < fmEnd; i++) {
    const m = lines[i].match(/^paidBoundary:\s*["']?(.+?)["']?\s*$/);
    if (m) return m[1];
  }
  return null;
}

/** @returns {{line:number, id:string, firstLine:number}[]} 2 回目以降の出現（行番号は元ファイル基準） */
export function findDuplicateCoconala(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let start = 0;
  let boundary = null;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) {
      start = end + 1;
      boundary = paidBoundaryOf(lines, end);
    }
  }
  const seen = new Map();
  const dups = [];
  let inFence = false;
  let afterBoundary = false;
  let buyerUntil = -1;
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*```/.test(l)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (boundary && /^#{1,6}\s/.test(l) && l.replace(/^#+\s*/, '').trim() === boundary) afterBoundary = true;
    if (afterBoundary && BUYER_MARKER_RE.test(l)) { buyerUntil = i + BUYER_BLOCK_LINES; continue; }
    if (/^#{1,6}\s/.test(l)) buyerUntil = -1;
    const inBuyer = i <= buyerUntil;
    for (const m of l.matchAll(URL_RE)) {
      if (inBuyer) continue;
      if (seen.has(m[1])) dups.push({ line: i + 1, id: m[1], firstLine: seen.get(m[1]) });
      else seen.set(m[1], i + 1);
    }
  }
  return dups;
}

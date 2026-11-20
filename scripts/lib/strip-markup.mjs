/**
 * strip-markup.mjs — HTML コメントとタグを、正規表現の置換ではなく 1 回の走査で取り除く。
 *
 * `s.replace(/<!--[\s\S]*?-->/g, '')`・`s.replace(/<[^>]+>/g, '')` と結果は同じ（閉じていない `<!--`・`<` と `<>` は残す）。
 * 置換の形だと CodeQL が「不完全な除去」（消した跡に新しい `<!--` や `<script` ができうる）と止めるので、
 * 本文から素のテキストを作るときはこちらを使う。サニタイズ（安全な HTML を作る）用ではない。
 */

/**
 * HTML コメント（<!-- … -->）を取り除く。`/<!--[\s\S]*?-->/g` の置換と同じ結果。
 * eatNewline: true なら、消したコメントの直後の改行 1 つ（\r\n か \n）も消す（`/<!--[\s\S]*?-->\r?\n?/g` と同じ）。
 */
export function stripHtmlComments(s, { eatNewline = false } = {}) {
  const src = String(s);
  let out = '';
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('<!--', i);
    if (open < 0) break;
    const close = src.indexOf('-->', open + 4);
    if (close < 0) break;
    out += src.slice(i, open);
    i = close + 3;
    if (eatNewline) {
      if (src[i] === '\r' && src[i + 1] === '\n') i += 2;
      else if (src[i] === '\n') i += 1;
    }
  }
  return out + src.slice(i);
}

/** タグ（< で始まり > で終わる 1 文字以上の並び）を取り除く。`/<[^>]+>/g` の置換と同じ結果 */
export function stripTags(s) {
  const src = String(s);
  let out = '';
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('<', i);
    if (open < 0) break;
    const close = src.indexOf('>', open + 1);
    if (close < 0) break;
    if (close === open + 1) {
      // `<>` は `<[^>]+>` に当たらないので残し、`>` の次から探し直す
      out += src.slice(i, close + 1);
      i = close + 1;
      continue;
    }
    out += src.slice(i, open);
    i = close + 1;
  }
  return out + src.slice(i);
}

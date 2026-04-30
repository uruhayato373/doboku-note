/**
 * 日本語テキストの簡易ラッパ。文字数ベースで折り返す（budou-x 不使用）。
 *
 * 句読点ぶら下げや禁則は厳密にしない。SNS 画像では多少のラフさより視認性を優先。
 */

const PUNCT_NO_BREAK_BEFORE = ['、', '。', '」', ')', '）', '・'];

export function wrapByCharCount(text, maxChars) {
  if (!text) return [''];
  const chars = [...text];
  const lines = [];
  let cur = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    cur += ch;
    if (ch === '\n') {
      lines.push(cur.replace(/\n$/, ''));
      cur = '';
      continue;
    }
    if (cur.length >= maxChars) {
      const next = chars[i + 1];
      // 直後が句読点なら 1 文字繰り越し
      if (next && PUNCT_NO_BREAK_BEFORE.includes(next)) {
        cur += next;
        i++;
      }
      lines.push(cur);
      cur = '';
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines.length > 0 ? lines : [''];
}

// 改行タグ \n を尊重しつつ、各セグメントを wrapByCharCount で折り返す
export function wrapPreservingNewlines(text, maxChars) {
  if (!text) return [''];
  const segments = String(text).split(/\n/);
  return segments.flatMap(seg => wrapByCharCount(seg, maxChars));
}

// 「あふれたら fontSize を一段下げて再 wrap」用。
// fontTable=[40, 36, 32], maxLines=4 のとき、4 行に収まるサイズを返す
export function pickWrapped(text, { fontTable, maxLines, charPerEm }) {
  for (const size of fontTable) {
    const maxChars = Math.floor(charPerEm * size / 40); // base 40 想定
    const lines = wrapPreservingNewlines(text, maxChars);
    if (lines.length <= maxLines) return { lines, size };
  }
  // 全部あふれたら最小サイズで丸ごと返す（後段で truncate される）
  const size = fontTable[fontTable.length - 1];
  const maxChars = Math.floor(charPerEm * size / 40);
  return { lines: wrapPreservingNewlines(text, maxChars).slice(0, maxLines), size };
}

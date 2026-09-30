/**
 * note-intro-range.mjs — note エディタで冒頭ブロックを消すときの選択範囲の決め方と、見出しの保全判定（純関数）。
 *
 * 不具合（DN-0465）: 冒頭ブロック k[a..b] を DOM Range の setStartBefore(k[a]) / setEndAfter(k[b]) で選ぶと、
 * 端点はエディタ直下の境界（ed, b+1）になる。ProseMirror はこれを隣のテキストブロックの中（k[b+1]＝最初の H2 の先頭、
 * k[a-1]＝残した先頭段落の末尾）へ解決するため、Delete で先頭段落と H2 が結合する。結果は
 *   - H2 の文字が先頭段落へ吸われ、その段落をあとで空にするので見出しの文字が消える（最初の h2 が空・見出しが消える）
 *   - 結合後のブロックが H2 型のまま残り、そこへ貼った冒頭の一文が H2 になる
 * 端がテキストブロックに接するときは、端点を「隣」ではなく選ぶブロック自身の中（先頭／末尾）に置く。
 */

export const TEXTBLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'PRE', 'UL', 'OL']);

/**
 * tags: エディタ直下の子要素の tagName 配列。a..b を消す範囲とする。
 * 戻り値: start/end それぞれ 'before'|'inside-start' と 'after'|'inside-end'。
 *   inside-* は k[a] / k[b] 自身の内容の端に端点を置く（隣のテキストブロックへ解決されない）。
 */
export function introRangeEndpoints(tags, a, b) {
  const prevIsText = a > 0 && TEXTBLOCK_TAGS.has(tags[a - 1]);
  const nextIsText = b + 1 < tags.length && TEXTBLOCK_TAGS.has(tags[b + 1]);
  return {
    start: prevIsText && TEXTBLOCK_TAGS.has(tags[a]) ? 'inside-start' : 'before',
    end: nextIsText && TEXTBLOCK_TAGS.has(tags[b]) ? 'inside-end' : 'after',
  };
}

/** 見出し（H2/H3）の [tag, text] 列が冒頭の貼り直し前後で同じか。違えば差分の説明を返す（同じなら null）。 */
export function headingsDiff(before, after) {
  const fmt = (h) => `${h.tag}:${h.text}`;
  const n = Math.max(before.length, after.length);
  for (let i = 0; i < n; i++) {
    const x = before[i], y = after[i];
    if (!x || !y || x.tag !== y.tag || x.text !== y.text) {
      return `見出し${i + 1}番目が ${x ? fmt(x) : '（なし）'} → ${y ? fmt(y) : '（なし）'}`;
    }
  }
  return null;
}

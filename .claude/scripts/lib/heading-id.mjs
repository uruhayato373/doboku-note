/**
 * 見出し ID 生成・抽出の共有モジュール。
 *
 * src/lib/toc.ts の generateHeadingId()/extractHeadings() と
 * build-exam-backlinks.mjs の過去問変種を統合した単一正源。
 *
 * サイトの実アンカーは src/lib/toc.ts がレンダリングするため、
 * 一般版（examMode: false）は toc.ts と挙動等価に保つこと。
 * 過去問変種（examMode: true）は章番号 Ⅰ-1-1 / I-1-1 を 1-1 に正規化する。
 */

// 保持する文字範囲: ひらがな・カタカナ・CJK 統合漢字・CJK 拡張 A（src/lib/toc.ts と同一）
const KEEP_RANGE = '\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FAF\\u3400-\\u4DBF';
const STRIP_RE = new RegExp(`[^\\w${KEEP_RANGE}\\s-]`, 'g');

/**
 * 見出しテキストから URL-safe な ID を生成する。
 *
 * @param {string} text 見出しテキスト
 * @param {{ examMode?: boolean }} [opts]
 *   examMode=true で過去問章番号を正規化（NFKC 正規化 + 先頭 ASCII ローマ数字除去）。
 *   例: `Ⅰ-1-1` / `I-1-1` → `1-1`
 * @returns {string}
 */
export function generateHeadingId(text, { examMode = false } = {}) {
  let s = examMode ? text.normalize('NFKC') : text;
  s = s.trim().toLowerCase();
  if (examMode) s = s.replace(/^[ivx]+(?=-)/, '');
  return (
    s
      .replace(STRIP_RE, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'heading'
  );
}

/**
 * MDX 本文から見出しを抽出する。コードブロック（```）と数式ブロック（$$）内はスキップ。
 * 各見出しに一般版 ID（id）と過去問変種 ID（examId）の両方を付与する。
 *
 * @param {string} content MDX 本文
 * @param {{ minLevel?: number, maxLevel?: number }} [opts]
 * @returns {{ text: string, level: number, id: string, examId: string }[]}
 */
export function extractHeadings(content, { minLevel = 2, maxLevel = 6 } = {}) {
  const headings = [];
  const lines = content.split('\n');
  const usedIds = new Map();
  let inCodeBlock = false;
  let inMathBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (trimmed === '$$') {
      inMathBlock = !inMathBlock;
      continue;
    }
    if (inCodeBlock || inMathBlock) continue;

    const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    if (level < minLevel || level > maxLevel) continue;

    const text = match[2]
      .replace(/\*\*(.+?)\*\*/g, '$1') // strip bold
      .replace(/\*(.+?)\*/g, '$1') // strip italic
      .replace(/`(.+?)`/g, '$1') // strip inline code
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // strip links
      .trim();

    let id = generateHeadingId(text);
    const count = usedIds.get(id) ?? 0;
    if (count > 0) id = `${id}-${count}`;
    usedIds.set(generateHeadingId(text), count + 1);

    headings.push({
      text,
      level,
      id,
      examId: generateHeadingId(text, { examMode: true }),
    });
  }

  return headings;
}

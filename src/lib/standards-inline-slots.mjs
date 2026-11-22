/** 基準書の本文を分割せずに枠を置く。見出し ID の採番をサイト・管理画面で変えないための共有計画。 */
export const INLINE_FIRST_CHARS = 600;
// 間隔は字数で取る。施工管理基準は表を組み直して繰り返しの字が減り（2-1 章 4,716 字）、1,800 字では 2 枠に減ったので 1,400 字（DN-1213）。
export const INLINE_INTERVAL_CHARS = 1400;
export const INLINE_REMAINING_CHARS = 600;
export const INLINE_MAX_SLOTS = 3;
// AdSense の記事内広告（2026-11-22）: 転職の 3 枠の後から本文の終わりまで、約 5,000 字ごとに最大 10 枠。転職の枠から 800 字以上離す。
// 長い章（3.8 万字・高さ約 5.9 万 px）で、転職の 3 枠が上から 6,000px までに固まり、その下の本文に広告が 1 つも無かった。
export const STANDARDS_AD_GAP_CHARS = 800;
export const STANDARDS_AD_INTERVAL_CHARS = 5000;
export const STANDARDS_AD_MAX_SLOTS = 10;

/** @param {string} line */
function isTableSeparator(line) {
  const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
  return cells.every((cell) => /^:?-+:?$/.test(cell.trim()));
}

/**
 * line は元の markdown の 0 始まりの行番号（その行の直前に差し込む）。
 * @param {string} markdown
 * @param {{ firstChars?: number, intervalChars?: number, remainingChars?: number, maxSlots?: number, slotPrefix?: string, forbiddenRanges?: Array<{start: number, end: number}>, allowedLines?: number[], occupiedLines?: number[] }} [opts]
 * @returns {{ insertAt: Array<{ line: number, slot: string, afterLabel: string }>, chars: number, tables: number }}
 */
export function planInlineSlots(markdown, opts = {}) {
  const {
    firstChars = INLINE_FIRST_CHARS,
    intervalChars = INLINE_INTERVAL_CHARS,
    remainingChars = INLINE_REMAINING_CHARS,
    maxSlots = INLINE_MAX_SLOTS,
    slotPrefix = 'standards-inline', forbiddenRanges = [], allowedLines, occupiedLines = [],
  } = opts;
  // コメントを行ごと消すと元の行番号がずれるため、改行は保存する。
  const lines = markdown.replace(/\{\/\*[\s\S]*?\*\/\}/g, (s) => s.replace(/[^\n]/g, '')).split('\n');
  let fenceLength = 0;
  const visible = lines.map((line) => {
    const fence = /^\s*(`{3,})/.exec(line);
    if (fence) {
      if (!fenceLength) fenceLength = fence[1].length;
      else if (fence[1].length >= fenceLength && /^\s*`+\s*$/.test(line)) fenceLength = 0;
      return false;
    }
    return !fenceLength;
  });
  const cumulative = [0];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    const count = visible[i] && !/^<.*>$/.test(line) ? line.replace(/\s/g, '').length : 0;
    cumulative.push(cumulative[i] + count);
  }
  const chars = cumulative[lines.length];
  /** @type {Array<{ line: number, afterLabel: string }>} */
  const candidates = [];
  let headings = 0;
  let tables = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (!visible[i]) continue;
    if (/^## /.test(lines[i])) {
      headings += 1;
      if (headings >= 2) candidates.push({ line: i, afterLabel: `見出し『${lines[i].slice(3).trim()}』の前` });
    }
    // GFM のヘッダーと区切り行の組だけを表とする（本文の | は区切りにしない）。
    if (!lines[i].includes('|') || !visible[i + 1] || !isTableSeparator(lines[i + 1] ?? '')) continue;
    tables += 1;
    let end = i + 2;
    while (end < lines.length && visible[end] && lines[end].includes('|') && lines[end].trim()) end += 1;
    // 表の注記と出典を広告で切り離さない。コメントは上で空行にしてある。
    while (end < lines.length && visible[end] && (!lines[end].trim() || /^\s*単位[：:]/.test(lines[end]) || /^\s*<SourceRef\b.*\/>\s*$/.test(lines[end]))) end += 1;
    candidates.push({ line: end, afterLabel: `表 ${tables} の後` });
    i = end - 1;
  }
  // 表も 2 つ目の ## も無い長い章（条文の段落だけ・### だけ）でも枠を置けるよう、段落の切れ目と ###・#### の前も候補にする。
  // 箇条の項目の間（ゆるい箇条）は番号と見た目が割れるので候補にしない。表の中は上で飛ばしてあるので表の行は来ない。
  const isListItem = (s) => /^\s*([-*+]|\d+[.)])\s/.test(s ?? '');
  const taken = new Set(candidates.map((c) => c.line));
  for (let i = 1; i < lines.length - 1; i += 1) {
    if (!visible[i] || taken.has(i)) continue;
    if (/^#{3,4} /.test(lines[i])) {
      candidates.push({ line: i, afterLabel: `見出し『${lines[i].replace(/^#+ /, '').trim()}』の前` });
      continue;
    }
    if (lines[i].trim() || !visible[i - 1] || !visible[i + 1]) continue;
    const prev = lines[i - 1];
    const next = lines[i + 1];
    if (!prev.trim() || !next.trim() || prev.includes('|') || next.includes('|') || /^\s*</.test(prev) || /^\s*</.test(next)) continue;
    if (isListItem(prev) && isListItem(next)) continue;
    // 見出しとその本文の間には置かない
    if (/^#{1,6} /.test(prev)) continue;
    candidates.push({ line: i, afterLabel: '段落の切れ目' });
  }
  candidates.sort((a, b) => a.line - b.line);
  /** @type {Array<{ line: number, slot: string, afterLabel: string }>} */
  const insertAt = [];
  let previousChars = 0;
  for (const candidate of candidates) {
    if (allowedLines && !allowedLines.includes(candidate.line)) continue;
    if (forbiddenRanges.some(r => candidate.line >= r.start && candidate.line <= r.end)) continue;
    const at = cumulative[candidate.line];
    if (occupiedLines.some(line => Math.abs(at - cumulative[line]) < firstChars)) continue;
    if (insertAt.length >= maxSlots) break;
    if (chars - at < remainingChars) continue;
    if (insertAt.length ? at - previousChars < intervalChars : at <= firstChars) continue;
    const number = insertAt.length + 1;
    insertAt.push({ ...candidate, slot: number === 1 ? slotPrefix : `${slotPrefix}-${number}` });
    previousChars = at;
  }
  return { insertAt, chars, tables };
}

/**
 * 転職の本文の枠の後ろに置く AdSense の枠（standards-adsense-N）。転職の最後の枠より前には置かない。
 * @param {string} markdown
 * @param {Array<{ line: number }>} banners planInlineSlots(markdown).insertAt
 */
export function planStandardsAdSlots(markdown, banners = planInlineSlots(markdown).insertAt) {
  const last = banners.length ? banners[banners.length - 1].line : -1;
  return planInlineSlots(markdown, {
    slotPrefix: 'standards-adsense',
    firstChars: STANDARDS_AD_GAP_CHARS,
    intervalChars: STANDARDS_AD_INTERVAL_CHARS,
    maxSlots: STANDARDS_AD_MAX_SLOTS,
    occupiedLines: banners.map((b) => b.line),
    forbiddenRanges: last >= 0 ? [{ start: 0, end: last }] : [],
  });
}

/** @param {string} markdown @returns {string} */
export function withInlineSlots(markdown) {
  const lines = markdown.split('\n');
  const banners = planInlineSlots(markdown).insertAt;
  const items = [
    ...banners.map(({ line, slot }) => ({ line, tag: `<StandardsInlineBanner slot="${slot}" />` })),
    ...planStandardsAdSlots(markdown, banners).insertAt.map(({ line, slot }) => ({ line, tag: `<StandardsInlineAd slot="${slot}" />` })),
  ].sort((a, b) => b.line - a.line);
  // 後ろから入れることで、計画した元の行番号を保つ。
  for (const { line, tag } of items) lines.splice(line, 0, '', tag, '');
  return lines.join('\n');
}

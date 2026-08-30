/**
 * standards-table.mjs — 固定レイアウトのテキスト表を GFM テーブルへ復元する。
 *
 * 入力は `pdftotext -layout` が出した版面（standards-structure.mjs が `type: 'table'` と
 * 判定した領域）。-layout は**表示桁**で字を揃えるので、全角を 1 文字として数えると
 * 桁がずれて列境界を取り違える。ここでは全て表示桁（全角 = 2 桁）で計算する。
 *
 * 設計の芯は「誤った GFM 化はデータ破壊」という一点にある。復元に少しでも確信が
 * 持てない版面は ok:false を返して呼び出し側にコードブロックのまま出させる。
 * そのため次の 2 段構えにしている:
 *
 *   1. 列境界は「ほぼ全行で空白の 3 桁以上の区間」に置く。3 桁以上を要求するのは、
 *      幅 2 桁の全角文字が境界をまたぐ場合、必ず境界内から始まる文字が生じるため。
 *      つまり「またいだ text は必ず 1 文字以上を境界内に落とす」ことが保証される。
 *   2. 復元したセルを連結して空白を除いた文字列が、元行のそれと完全一致するかを見る。
 *      1 の性質により、境界をまたいだ行は必ずこの検査で落ちる。可逆性が最後の砦。
 *
 * 「ほぼ全行」を 100% でなく 90% にできるのは 2 の砦があるからで、
 * 逆に 2 を外すと 90% は静かなデータ破壊になる。片方だけ緩めてはいけない。
 */

/** 列境界とみなす桁の「空白である行の割合」。残り 10% の例外行は可逆性検査が落とす。 */
const SEPARATOR_BLANK_RATIO = 0.9;
/** 列境界の最小幅（桁）。2 桁だと全角 1 文字がまたげてしまい可逆性検査をすり抜ける。 */
const MIN_SEPARATOR_WIDTH = 3;
/** 1 列は表でない。7 列以上は復元の確信度が落ちるうえモバイルで読めない。 */
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 6;
/** ヘッダ 1 行 + データ 2 行未満は表として復元する価値がない（誤検出の方が多い）。 */
const MIN_DATA_ROWS = 2;

const SPACE = ' ';
const IDEOGRAPHIC_SPACE = '　';

/** 表示幅 2 桁の文字（East Asian Wide / Fullwidth）。U+3000 もここに入り、かつ空白。 */
function charWidth(cp) {
  if (cp < 0x1100) return 1;
  if (
    cp <= 0x115f ||
    cp === 0x2329 ||
    cp === 0x232a ||
    (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe19) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1f64f) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  ) {
    return 2;
  }
  return 1;
}

const isBlankChar = (ch) => ch === SPACE || ch === IDEOGRAPHIC_SPACE;
const stripSpaces = (text) => text.replace(/[\s　]/g, '');

/** 1 行を表示桁の並びへ展開する。文字は開始桁と幅を持ち、blank[] は桁単位の空白判定。 */
function layoutOf(line) {
  const chars = [];
  const blank = [];
  let col = 0;
  for (const ch of line) {
    const width = charWidth(ch.codePointAt(0));
    chars.push({ ch, col, width, blank: isBlankChar(ch) });
    for (let i = 0; i < width; i += 1) blank[col + i] = isBlankChar(ch);
    col += width;
  }
  return { chars, blank, width: col };
}

/** 桁 c が「3 桁以上の空白で区切られた content 群」の何番目かを数える（行単体の見え方）。 */
function segmentCount(layout) {
  let count = 0;
  let gap = 0;
  let inSegment = false;
  for (let c = 0; c < layout.width; c += 1) {
    if (layout.blank[c]) {
      gap += 1;
      if (inSegment && gap >= MIN_SEPARATOR_WIDTH) inSegment = false;
      continue;
    }
    if (!inSegment) count += 1;
    inSegment = true;
    gap = 0;
  }
  return count;
}

/** 行を列範囲（半開区間の表示桁）でセルへ割る。境界内から始まる文字は落ち、可逆性検査が拾う。 */
function sliceCells(layout, ranges) {
  const buckets = ranges.map(() => '');
  for (const entry of layout.chars) {
    const index = ranges.findIndex((r) => entry.col >= r.start && entry.col < r.end);
    if (index < 0) continue;
    buckets[index] += entry.ch;
  }
  return buckets.map((cell) => cell.replace(/^[\s　]+/, '').replace(/[\s　]+$/, ''));
}

/**
 * 固定レイアウトの表領域を GFM テーブルへ復元する。
 *
 * @param {string[]} lines 表領域の生の行（左端の共通インデントは残っていてよい）
 * @returns {{ ok: true, header: string[], rows: string[][], columns: number, reason: string }
 *          | { ok: false, reason: string }}
 */
export function tryGfmTable(lines) {
  const source = (lines ?? []).filter((line) => typeof line === 'string' && line.trim() !== '');
  if (source.length < MIN_DATA_ROWS + 1) return { ok: false, reason: 'too-few-rows' };
  // タブがあると桁揃えの前提（-layout は空白で揃える）が崩れ、列境界を静かに間違える。
  if (source.some((line) => line.includes('\t'))) return { ok: false, reason: 'tab-character' };

  const layouts = source.map(layoutOf);
  const maxWidth = Math.max(...layouts.map((l) => l.width));

  // 桁ごとの空白率。行末より右は空白として数える（右端が短い行は表として普通）。
  const blankRatio = new Array(maxWidth).fill(0);
  for (let c = 0; c < maxWidth; c += 1) {
    let blank = 0;
    for (const layout of layouts) blank += c >= layout.width || layout.blank[c] ? 1 : 0;
    blankRatio[c] = blank / layouts.length;
  }
  const isSeparatorColumn = (c) => blankRatio[c] >= SEPARATOR_BLANK_RATIO;

  // 版面の左右端（外側の余白は列境界ではない）
  let extentStart = 0;
  while (extentStart < maxWidth && isSeparatorColumn(extentStart)) extentStart += 1;
  let extentEnd = maxWidth - 1;
  while (extentEnd >= 0 && isSeparatorColumn(extentEnd)) extentEnd -= 1;
  if (extentStart > extentEnd) return { ok: false, reason: 'empty-layout' };

  // 版面内部の「3 桁以上の空白区間」を列境界にする
  const separators = [];
  let runStart = -1;
  for (let c = extentStart; c <= extentEnd + 1; c += 1) {
    const separator = c <= extentEnd && isSeparatorColumn(c);
    if (separator) {
      if (runStart < 0) runStart = c;
      continue;
    }
    if (runStart >= 0 && c - runStart >= MIN_SEPARATOR_WIDTH) separators.push({ start: runStart, end: c });
    runStart = -1;
  }

  const columns = separators.length + 1;
  if (columns < MIN_COLUMNS || columns > MAX_COLUMNS) return { ok: false, reason: 'columns-out-of-range' };

  // 左右端は開いておく（版面からはみ出した外れ値の文字を落として lossy と誤報しない）
  const ranges = [];
  let cursor = 0;
  for (const separator of separators) {
    ranges.push({ start: cursor, end: separator.start });
    cursor = separator.end;
  }
  ranges.push({ start: cursor, end: Number.POSITIVE_INFINITY });

  const table = layouts.map((layout) => sliceCells(layout, ranges));

  // 最重要ゲート: 1 文字でも失われたら GFM を出さない。
  // 境界は 3 桁以上なので、境界をまたいだ行は必ず境界内から始まる文字を持ち、ここで落ちる。
  for (let i = 0; i < table.length; i += 1) {
    if (stripSpaces(table[i].join('')) !== stripSpaces(source[i])) return { ok: false, reason: 'lossy' };
  }

  // 行を単体で見たときの content 群の数が列数と揃わない＝セル内に広い空白がある／
  // 隣り合うセルが繋がっている。どのセルへ属する文字なのか機械が決められていない。
  if (layouts.some((layout) => segmentCount(layout) !== columns)) return { ok: false, reason: 'ragged-rows' };

  // 空セルは「桁数は合っているのに中身が隣の列へ寄っている」ことの症状として現れる。
  // 実測 p173 の版面が該当し、`骨材の微粒分量 ％` が 1 列目へ同居して 2 列目が空になった
  // （可逆性も列数も通ってしまう）。復元後の空セルは無条件で不採用にする。
  if (table.some((row) => row.some((cell) => cell === ''))) return { ok: false, reason: 'empty-cell' };

  if (table.some((row) => row.some((cell) => cell.includes('|')))) return { ok: false, reason: 'pipe-in-cell' };

  return { ok: true, header: table[0], rows: table.slice(1), columns, reason: 'restored' };
}

export const thresholds = {
  SEPARATOR_BLANK_RATIO,
  MIN_SEPARATOR_WIDTH,
  MIN_COLUMNS,
  MAX_COLUMNS,
  MIN_DATA_ROWS,
};

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

import { createHash } from 'node:crypto';

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

/**
 * 一覧の 1 項目の終わり＝行末の（年月）。`（令和6年3月一部改正）` `（平成14年7月31日）` など。
 * 年を含み、空白の後か行頭に置かれたものに限る。名称の中の括弧
 * （`道路橋示方書・同解説（Ⅲコンクリート部材・コンクリート上部構造編）` で行が折り返す）で切らないため。
 * 空白は 1 個でもよい（北海道版 7-1 の `…基準について （令和3年7月）`）。
 */
const LIST_ENTRY_END = /(?:^|[ 　])（[^（）]*(?:元|[0-9０-９]+)年[^（）]*）[\s　]*$/;
const DATE_ONLY_LINE = /^[\s　]*（[^（）]*）[\s　]*$/;

/**
 * 「適用すべき諸基準」の基準類一覧を、1 項目 1 行の箇条書きへ組み直す。
 *
 * 版面は `発行者 + 空白 + 名称 + 空白 + （年月）` の 1 項目が 1〜3 行に折り返される形
 * （名称の途中・年月だけが次行へ落ちる）。列の桁が項目ごとに揃わないので tryGfmTable では
 * 復元できない（近畿版の実測 32 件とも columns-out-of-range / ragged-rows など）。
 * 発行者と名称の境目は 1 空白のことも、発行者自体が 2 語（`建設省 土木研究所`）のこともあり、
 * 列へ分けると振り分けを誤る。項目は必ず（年月）で終わるので、そこで区切って 1 項目を 1 行にし、
 * 列には分けない（判断の要る箇所を作らない）。
 *
 * 可逆性の砦は tryGfmTable と同じ: 項目の文字列から空白を除いたものが、その項目の版面の行を
 * 連結して空白を除いたものと完全一致しなければ採用しない。（年月）で終わらない行が残る一覧は丸ごと不採用。
 *
 * @param {string[]} lines 表領域の生の行
 * @returns {{ ok: true, items: string[], reason: string } | { ok: false, reason: string }}
 */
export function tryStandardsList(lines) {
  const source = (lines ?? []).filter((line) => typeof line === 'string' && line.trim() !== '');
  if (source.length === 0) return { ok: false, reason: 'empty-layout' };
  if (source.some((line) => line.includes('\t'))) return { ok: false, reason: 'tab-character' };

  const entries = [];
  let current = [];
  for (const line of source) {
    current.push(line);
    if (LIST_ENTRY_END.test(line)) {
      entries.push(current);
      current = [];
    }
  }
  if (current.length > 0 || entries.length === 0) return { ok: false, reason: 'list-unterminated' };

  const items = [];
  for (const entry of entries) {
    // 折り返しの続き（名称の途中）は空白なしでつなぎ、年月だけの行は 1 空白を挟む。
    // 版面の桁揃えの広い空白（発行者・名称・年月の間）は 1 個に畳む。
    let item = '';
    for (const line of entry) {
      const piece = line.replace(/^[\s　]+/, '').replace(/[\s　]+$/, '');
      item += item && DATE_ONLY_LINE.test(line) ? ` ${piece}` : piece;
    }
    item = item.replace(/[ 　]{2,}/g, ' ');
    if (stripSpaces(item) !== stripSpaces(entry.join(''))) return { ok: false, reason: 'lossy' };
    items.push(item);
  }
  return { ok: true, items, reason: 'restored-standards-list' };
}

// ---- 原本と照合して組み直した表（content/sources/standards/tables/*.json） ----------------

/**
 * 版面の表領域を同定するキー。空白を除いた文字列の sha256 の先頭 16 桁。
 * 空白は機関ごと・抽出ごとに揺れるので除き、同じ表を持つ機関すべてに同じ組み直しが効く。
 */
export function tableKey(lines) {
  return createHash('sha256').update(stripSpaces(lines.join('')), 'utf8').digest('hex').slice(0, 16);
}

/** 文字の多重集合（空白を除く）。セルの並べ替えは許し、文字の過不足だけを見るための比較に使う。 */
function charBag(texts) {
  const bag = new Map();
  for (const ch of stripSpaces(texts.join(''))) bag.set(ch, (bag.get(ch) ?? 0) + 1);
  return bag;
}

function bagDiff(expected, actual) {
  const missing = [];
  const extra = [];
  for (const [ch, n] of expected) if ((actual.get(ch) ?? 0) < n) missing.push(`${ch}×${n - (actual.get(ch) ?? 0)}`);
  for (const [ch, n] of actual) if ((expected.get(ch) ?? 0) < n) extra.push(`${ch}×${n - (expected.get(ch) ?? 0)}`);
  return { missing, extra };
}

/** `{ "same": "above" | "left" }` は結合セルの繰り返し（文字の照合から外し、表示では元の文字を写す）。 */
const isSameRef = (cell) => typeof cell === 'object' && cell !== null && (cell.same === 'above' || cell.same === 'left');

/**
 * 組み直しの部品の並び。`kind: table / list` の短い書き方を `parts` へそろえる。
 * 部品は caption（太字の 1 行）・text（段落）・table・list・note（表の後の注記）。
 */
export function overrideParts(override) {
  if (Array.isArray(override.parts)) return override.parts;
  const notes = (override.notes ?? []).map((text) => ({ kind: 'note', text }));
  if (override.kind === 'list') return [{ kind: 'list', items: override.items ?? [] }, ...notes];
  if (override.kind === 'table') {
    return [
      {
        kind: 'table',
        header: override.header ?? [],
        rows: override.rows ?? [],
        headerFrom: override.headerFrom ?? null,
        headerFill: override.headerFill ?? null,
        headerless: override.headerless === true,
      },
      ...notes,
    ];
  }
  return [];
}

/** 部品の中で原典の文字として数える文字列（結合セルの繰り返し・headerFrom の再掲は数えない）。 */
export function overrideTexts(parts) {
  const texts = [];
  for (const part of parts) {
    if (part.kind === 'table') {
      for (const cell of [...(part.header ?? []), ...(part.rows ?? [])].flat()) if (!isSameRef(cell)) texts.push(String(cell));
    } else if (part.kind === 'list') {
      texts.push(...(part.items ?? []).map(String));
    } else if (part.kind === 'verbatim') {
      texts.push(...(part.lines ?? []).map(String));
    } else {
      texts.push(String(part.text ?? ''));
    }
  }
  return texts;
}

/** 表の部品の結合セルを解決し、見出しの無い続きの表には headerFrom の見出しを写す。 */
function resolveTablePart(part, lookup) {
  const own = [...(part.header ?? []), ...(part.rows ?? [])];
  const width = own[0]?.length ?? 0;
  if (width < 2 || own.some((row) => row.length !== width)) return { error: 'override-ragged' };
  const resolved = own.map((row) => [...row]);
  for (let r = 0; r < resolved.length; r += 1) {
    for (let c = 0; c < width; c += 1) {
      const cell = resolved[r][c];
      if (!isSameRef(cell)) continue;
      const source = cell.same === 'above' ? resolved[r - 1]?.[c] : resolved[r][c - 1];
      if (typeof source !== 'string') return { error: 'override-bad-same' };
      resolved[r][c] = source;
    }
  }
  if (resolved.flat().some((cell) => String(cell).includes('|'))) return { error: 'pipe-in-cell' };
  const headerRows = part.header?.length ?? 0;
  let header = resolved.slice(0, headerRows);
  if (header.length === 0 && part.headerFrom) {
    // ページをまたいだ表の続き。見出しは前の表から写す（原典のこの位置の文字ではないので照合の外）。
    // `key#n` は相手の n 番目（0 から）の見出し付きの表（1 つの版面に表が 2 つ以上あるとき）
    const [fromKey, index] = String(part.headerFrom).split('#');
    const from = lookup(fromKey);
    const candidates = from ? overrideParts(from).filter((p) => p.kind === 'table' && (p.header?.length ?? 0) > 0) : [];
    const fromTable = candidates[Number(index ?? 0)];
    if (!fromTable || fromTable.header[0].length !== width) return { error: 'override-bad-header-from' };
    header = fromTable.header.map((row) => row.map((cell) => (isSameRef(cell) ? '' : String(cell))));
  }
  // 見出しの語がテキスト層に無く空欄になった列（国交省の品質管理基準 p218 は 9 列のうち 7 列）は、headerFill に
  // 同じ列構成の表を指すと空欄だけをその表の見出しで補う（headerFrom と同じく照合の外。文字のある欄は変えない）
  if (header.length > 0 && part.headerFill) {
    const [fromKey, index] = String(part.headerFill).split('#');
    const from = lookup(fromKey);
    const candidates = from ? overrideParts(from).filter((p) => p.kind === 'table' && (p.header?.length ?? 0) > 0) : [];
    const fromTable = candidates[Number(index ?? 0)];
    if (!fromTable || fromTable.header[0].length !== width) return { error: 'override-bad-header-fill' };
    header = header.map((row, r) => row.map((cell, c) => {
      const fill = fromTable.header[r]?.[c];
      return String(cell).trim() === '' && typeof fill === 'string' ? fill : cell;
    }));
  }
  // 原本の表にもともと見出し行が無いもの（近畿版 表3-2-13(2) の飼育試験の表など）は、
  // headerless: true と明示したときだけ空の見出しで出す（GFM は見出し行を省けない）
  if (header.length === 0 && part.headerless === true) header = [new Array(width).fill('')];
  if (header.length === 0) return { error: 'override-no-header' };
  return { kind: 'table', header, rows: resolved.slice(headerRows) };
}

/**
 * 組み直しを版面へ当てる。検証済み（review.status = approved）で、部品の文字が版面の文字と
 * 多重集合で完全一致するものだけを採用する（並べ替え・結合セルの繰り返しは許し、文字の追加・欠落は
 * 1 文字も許さない）。
 *
 * 版面の区切り（空行）と表の区切りは一致しない。1 つの版面に前の表の続き・次の表のキャプション・
 * 次の表が入ることがあり（近畿版 2-2 の表2-2-1/2-2-2）、逆に 1 つの表の見出しと中身が別の版面に
 * 分かれることもある。そのため 1 つの版面から複数の部品（parts）を出せ、直前の版面を取り込める
 * （absorbs。取り込まれた版面は kind: absorbed で何も出さない）。照合は取り込んだ版面すべての文字で行う。
 *
 * @param {string[]} lines 表領域の生の行（キャプション除く）
 * @param {object|undefined} override content/sources/standards/tables/{key}.json の中身
 * @param {{ lookup?: (key: string) => object|undefined, absorbedBodies?: Map<string, string[]> }} [context]
 *   lookup: 他の組み直し（headerFrom・absorbs の相手）、absorbedBodies: 同じ章でここより前に出た版面
 */
export function applyTableOverride(lines, override, { lookup = () => undefined, absorbedBodies = new Map() } = {}) {
  if (!override) return { ok: false, reason: 'no-override' };
  if (override.review?.status !== 'approved') return { ok: false, reason: 'override-unreviewed' };
  if (override.key !== tableKey(lines) || tableKey(override.layout ?? []) !== override.key) {
    return { ok: false, reason: 'override-key-mismatch' };
  }
  if (override.kind === 'verbatim') return { ok: true, kind: 'verbatim', reason: 'override-verbatim' };
  if (override.kind === 'absorbed') {
    // 文字の照合は取り込んだ側で行う。ここでは相手が自分を取り込むと宣言しているかだけを見る
    const target = lookup(override.into);
    if (!target || target.review?.status !== 'approved' || !(target.absorbs ?? []).includes(override.key)) {
      return { ok: false, reason: 'override-bad-absorbed', detail: `into ${override.into}` };
    }
    return { ok: true, kind: 'absorbed', into: override.into, reason: 'restored-override' };
  }

  const expected = [...lines];
  for (const key of override.absorbs ?? []) {
    const body = absorbedBodies.get(key);
    if (!body) return { ok: false, reason: 'override-absorb-missing', detail: `${key} が同じ章のこの表より前に無い` };
    expected.push(...body);
  }
  const parts = overrideParts(override);
  if (parts.length === 0) return { ok: false, reason: 'override-empty' };
  const diff = bagDiff(charBag(expected), charBag(overrideTexts(parts)));
  if (diff.missing.length || diff.extra.length) {
    return { ok: false, reason: 'override-lossy', detail: `不足 ${diff.missing.join(' ')} / 余分 ${diff.extra.join(' ')}` };
  }
  const resolved = [];
  for (const part of parts) {
    if (part.kind === 'table') {
      const table = resolveTablePart(part, lookup);
      if (table.error) return { ok: false, reason: table.error };
      resolved.push(table);
    } else if (part.kind === 'list') {
      resolved.push({ kind: 'list', items: (part.items ?? []).map(String) });
    } else if (part.kind === 'verbatim') {
      // 分数の式・図の中の文字など、表にも段落にもできない部分は版面の行のまま出す
      resolved.push({ kind: 'verbatim', lines: (part.lines ?? []).map(String) });
    } else if (['caption', 'text', 'note'].includes(part.kind)) {
      resolved.push({ kind: part.kind, text: String(part.text ?? '') });
    } else {
      return { ok: false, reason: 'override-bad-part', detail: String(part.kind) };
    }
  }
  return { ok: true, kind: 'parts', parts: resolved, reason: 'restored-override' };
}

export const thresholds = {
  SEPARATOR_BLANK_RATIO,
  MIN_SEPARATOR_WIDTH,
  MIN_COLUMNS,
  MAX_COLUMNS,
  MIN_DATA_ROWS,
};

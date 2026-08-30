/**
 * standards-structure.mjs — 逐語文字起こし（レイヤー1）から編・章・節構造を解析する。
 *
 * 入力は content/site/standards-library/{agency}/{document}/part-*.md（PDF 50 ページ単位の分冊）。
 * **part 単位では処理しない**。章・節は part 境界をまたぐため、文書の全 part を PDF ページ順に
 * 結合してから構造解析し、そのうえで章単位へ再分割する。
 *
 * 設計の芯は 3 つ:
 *   1. **柱（running header）を一次情報にする。** 中部 common の実測では本文 582 ページ全ての
 *      第 1 非空行が `第N編 XX編 第M章 YY` で、章の帰属をページ単位で確定できる。本文から
 *      章境界を推定する必要がない。
 *   2. **条番号で構造解析そのものを検証する。** 条番号 `A-B-C-D` は 編-章-節-条 なので、
 *      柱の編章および直前の節番号と一致しなければならない。中部 common では 1804/1804 が一致した。
 *      ズレは解析バグの証拠なので rejects へ出す。
 *   3. **黙って捨てない。** 本文行は「章へ割当」「前付け」「柱・印刷ページ番号として除去（監査記録）」
 *      「rejects/review」のいずれかに必ず入る。確信できない行を無視して PASS にしない。
 *
 * 例外補正はコードへの場当たり的条件追加ではなく .claude/config/standards-structure.json へ集約する。
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const LIBRARY_ROOT = join(process.cwd(), 'content', 'site', 'standards-library');
export const ARTICLES_ROOT = join(process.cwd(), 'content', 'site', 'standards-articles');
const OVERRIDES_PATH = join(process.cwd(), '.claude', 'config', 'standards-structure.json');

// ---- 行パターン ---------------------------------------------------------
// インデント上限は中部 common の実測分布から決めている（コメントの数値は実測件数）。
/** 柱: `第1編   共通編     第3章 無筋・鉄筋コンクリート`（本文 582/582 ページ） */
const RE_RUNNING_HEADER = /^[\s　]*第\s*(\d+)\s*編\s+(\S+?)\s+第\s*(\d+)\s*章\s+(\S.*?)\s*$/;
/** 印刷ページ番号: `1-73`（本文 582/582 ページの最終行） */
const RE_PRINT_PAGE = /^[\s　]*(\d+)[-－](\d+)[\s　]*$/;
/** 編扉: `第1編 共通編`（章冒頭のみ 8 件） */
const RE_BOOK_TITLE = /^[\s　]*第\s*(\d+)\s*編\s+(\S+?編)[\s　]*$/;
/** 章扉: `第3章     無筋・鉄筋コンクリート`（章冒頭。本文中の参照列挙にも一致しうるので章冒頭でのみ使う） */
const RE_CHAPTER_TITLE = /^[\s　]*第\s*(\d+)\s*章\s+(\S.*?)[\s　]*$/;
/** 節: `第9節   暑中コンクリート`。実測 404/404 が indent 0（本文中の「第4節コンクリートミキサー船」は行頭でないので当たらない） */
const RE_SECTION = /^[\s　]{0,2}第\s*(\d+)\s*節\s+(\S.*?)[\s　]*$/;
/** 条: `1-3-9-1   一般事項`。indent は 0-1 が 1800/1804、残り 4 件が 3-9（条番号整合で本物と確認済み） */
const RE_ARTICLE = /^[\s　]{0,9}(\d+)-(\d+)-(\d+)-(\d+)\s+(\S.*?)[\s　]*$/;
/**
 * 項: `1.一般事項`。
 *
 * `1.5時間` のような小数と `8.2枚以上の反射シートの重ね合わせ` のような項見出しは
 * **正規表現だけでは区別できない**（どちらも `N.M` + 日本語）。そこで 2 段構えにする:
 *   STRICT = ドットの直後が数字でないもの（3324 本・表本文の混入ゼロを実測）
 *   LOOSE  = 数字が続くもの。文書自身の項番号の連番に一致するときだけ項として採用する。
 * 実測では行頭 `N.M` が 20 行あり、うち 6 行が本物の項（p213 の 7./8. 等）だった。
 */
const RE_CLAUSE = /^[\s　]{0,16}(\d+)[.．](?![0-9０-９])[\s　]*(\S.*?)[\s　]*$/;
const RE_CLAUSE_LOOSE = /^[\s　]{0,16}(\d+)[.．][\s　]*(\S.*?)[\s　]*$/;
/**
 * 項のインデントは**親（節・条）見出しからの相対**で見る。
 * 版面が右寄りの紙面（p273 は条が indent 9・項が 13）があり、絶対値で閾値を切ると項を落とす。
 * 一方ページ内に全幅の表が同居するため（p273/p177）ページ単位の正規化では届かない。
 * 親からの差分に上限を置けば、深い位置にある表のセルは自然に外れる。
 */
const CLAUSE_INDENT_TOLERANCE = 6;
/** 号: `（1）工事概要` */
const RE_ITEM = /^[\s　]{0,4}[（(](\d+)[）)][\s　]*(.*?)[\s　]*$/;
/** 表・図キャプション: `表1-3-4   養生期間` */
const RE_TABLE_CAPTION = /^[\s　]*表\s*(\d+)[-－](\d+)(?:[-－](\d+))?\s*(.*?)[\s　]*$/;
const RE_FIGURE_CAPTION = /^[\s　]*図\s*(\d+)[-－](\d+)(?:[-－](\d+))?\s*(.*?)[\s　]*$/;
/** 注記: `［注］` / `[注1]` */
const RE_NOTE = /^[\s　]{0,6}[［\[]\s*注/;
/** 目次のドットリーダー行 */
const RE_DOT_LEADER = /\.{5,}/;

const indentOf = (line) => line.length - line.replace(/^[\s　]+/, '').length;
const trimBoth = (line) => line.replace(/^[\s　]+/, '').replace(/[\s　]+$/, '');
/**
 * 版面（表・2 列組の一覧）の署名。
 *
 * 2 種類ある。1 行に広い空白が 2 箇所以上あれば単独で表の行と分かる（多列の表）。
 * 一方「発行者名 + 広い空白 + 基準名/日付」の 2 列組は 1 行あたり 1 箇所しか無いので、
 * その形は chunk 全体の密度で判定する（下の segmentToBlocks）。
 *
 * 閾値の根拠（中部 common 実測）: 句点で終わる長い散文行 3,069 本のうち 4 空白以上の
 * 隙間を持つのは 27 本（0.88%）。一方 p134 の基準一覧は 6/8 行、p177 の表は 17/28 行、
 * p109 の表は 10/13 行が該当する。1 行だけで断定せず密度と併用すれば取り違えない。
 */
const gapCount = (line, width) => (trimBoth(line).match(new RegExp(`[ 　]{${width},}`, 'g')) ?? []).length;
const isLayoutLine = (line) => gapCount(line, 3) >= 2;
const hasWideGap = (line) => gapCount(line, 4) >= 1;

// ---- 読み込み -----------------------------------------------------------

export function loadOverrides() {
  if (!existsSync(OVERRIDES_PATH)) return { version: 1, documents: {} };
  return JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8'));
}

export function getCatalog() {
  return JSON.parse(readFileSync(join(LIBRARY_ROOT, 'catalog.json'), 'utf8'));
}

/**
 * 文書の全 part を PDF ページ順に結合して 1 本のページ配列にする。
 * catalog の firstPage/lastPage と実ページの整合もここで確認する（欠番・重複は例外）。
 */
export function loadDocumentPages(document) {
  const pages = [];
  for (const part of document.parts) {
    const source = readFileSync(join(LIBRARY_ROOT, part.file), 'utf8');
    const heads = [...source.matchAll(/^## PDF page (\d+)\s*$/gm)];
    if (heads.length !== part.pageCount) {
      throw new Error(`${part.file}: PDF page 見出し ${heads.length} 件 ≠ catalog pageCount ${part.pageCount}`);
    }
    heads.forEach((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = heads[index + 1]?.index ?? source.length;
      const block = source.slice(start, end);
      const body = block.match(/`{3,4}text\s*\r?\n([\s\S]*?)\r?\n`{3,4}/);
      if (!body) throw new Error(`${part.file}: PDF page ${match[1]} のコードブロックを読めない`);
      pages.push({ page: Number(match[1]), part: part.slug, lines: body[1].split('\n') });
    });
  }
  pages.sort((a, b) => a.page - b.page);
  for (let i = 1; i < pages.length; i += 1) {
    if (pages[i].page !== pages[i - 1].page + 1) {
      throw new Error(`ページ不連続: ${pages[i - 1].page} → ${pages[i].page}`);
    }
  }
  if (pages.length !== document.pages) {
    throw new Error(`ページ総数 ${pages.length} ≠ catalog pages ${document.pages}`);
  }
  return pages;
}

// ---- 前付け / 本文の境界 -------------------------------------------------

/**
 * 本文開始ページを検出する。
 *
 * 中部 common は p1=表紙、p2-78=目次（印刷ページ 1-1〜1-77）、p79 で印刷ページが 1-1 に戻って本文が始まる。
 * 「印刷ページ番号が巻き戻る」ことと「ドットリーダーが消える」ことの両方を要求し、
 * どちらか一方しか満たさない場合は判定不能として null を返す（推測で決めない）。
 */
export function detectBodyStart(pages, override) {
  if (override?.bodyStartPage) return { page: override.bodyStartPage, reason: 'override' };
  const dotDensity = (p) => p.lines.filter((l) => RE_DOT_LEADER.test(l)).length;
  const printNumber = (p) => {
    for (let i = p.lines.length - 1; i >= 0; i -= 1) {
      const line = p.lines[i];
      if (!line.trim()) continue;
      const m = line.match(RE_PRINT_PAGE);
      return m ? { book: Number(m[1]), no: Number(m[2]) } : null;
    }
    return null;
  };
  for (let i = 1; i < pages.length; i += 1) {
    const prev = printNumber(pages[i - 1]);
    const cur = printNumber(pages[i]);
    if (!prev || !cur) continue;
    const rewound = cur.book === prev.book && cur.no < prev.no;
    const tocEnded = dotDensity(pages[i - 1]) >= 5 && dotDensity(pages[i]) === 0;
    if (rewound && tocEnded) return { page: pages[i].page, reason: 'print-page-rewind+toc-end' };
  }
  return null;
}

// ---- 章の切り出し -------------------------------------------------------

/** ページの柱を読む。本文ページは全て柱を持つ前提で、無い場合は null（呼び出し側が reject する）。 */
function readRunningHeader(page) {
  for (const line of page.lines) {
    if (!line.trim()) continue;
    const m = line.match(RE_RUNNING_HEADER);
    return m
      ? {
          line,
          bookNumber: Number(m[1]),
          bookTitle: m[2].replace(/[\s　]+/g, ''),
          chapterNumber: Number(m[3]),
          chapterTitle: m[4].replace(/[\s　]+/g, ''),
        }
      : null;
  }
  return null;
}

// ---- ページ本文の抽出（柱・印刷ページ番号の除去） -------------------------

/**
 * 1 ページから柱と印刷ページ番号を取り除き、残りの行を返す。
 * 何を除去したかは removed に積む（黙って捨てない）。
 */
function stripPageFurniture(page, header, removed, dedents) {
  const kept = [];
  let headerRemoved = false;
  let printRemoved = false;
  // 印刷ページ番号は最終非空行に限る（本文中の `1-73` 風の記述を巻き込まないため）
  let lastContentIndex = -1;
  for (let i = page.lines.length - 1; i >= 0; i -= 1) {
    if (page.lines[i].trim()) { lastContentIndex = i; break; }
  }
  page.lines.forEach((line, index) => {
    if (!headerRemoved && header && line === header.line) {
      headerRemoved = true;
      removed.runningHeaders.push({ page: page.page, text: trimBoth(line) });
      return;
    }
    if (index === lastContentIndex && RE_PRINT_PAGE.test(line)) {
      printRemoved = true;
      removed.printPageNumbers.push({ page: page.page, text: trimBoth(line) });
      return;
    }
    kept.push({ text: line, page: page.page });
  });
  // 紙面ごとの左マージンのズレを吸収する。pdftotext -layout は版面が右寄りのページを
  // そのまま +9〜13 桁ずらして返すため（実測 p273 等）、インデント閾値だけを緩めると
  // 表のセルを見出しに誤認する。ページ内の最小インデントを引いて相対位置だけを残す。
  const content = kept.filter((e) => e.text.trim() !== '');
  const shift = content.length ? Math.min(...content.map((e) => indentOf(e.text))) : 0;
  if (shift > 0) {
    dedents.push({ page: page.page, columns: shift });
    for (const entry of kept) entry.text = entry.text.slice(shift);
  }
  return { kept, headerRemoved, printRemoved };
}

/**
 * 章冒頭の扉（`第1編 共通編` / `第3章 無筋・鉄筋コンクリート`）を落とす。
 * ページ側の PageHeader が H1 を出すため本文に重複させない。
 * **柱の番号と一致する場合のみ**落とすので、本文中の参照列挙（p523 の「第8章 吹付枠工、…」）は残る。
 */
function stripChapterFront(lines, chapter, removed) {
  const out = [...lines];
  let cursor = 0;
  let dropped = 0;
  while (cursor < out.length && dropped < 2) {
    const line = out[cursor].text;
    if (!line.trim()) { cursor += 1; continue; }
    const book = line.match(RE_BOOK_TITLE);
    if (book && Number(book[1]) === chapter.bookNumber) {
      removed.chapterFront.push({ page: out[cursor].page, text: trimBoth(line) });
      out.splice(cursor, 1); dropped += 1; continue;
    }
    const chap = line.match(RE_CHAPTER_TITLE);
    if (chap && Number(chap[1]) === chapter.chapterNumber
      && chap[2].replace(/[\s　]+/g, '') === chapter.chapterTitle) {
      removed.chapterFront.push({ page: out[cursor].page, text: trimBoth(line) });
      out.splice(cursor, 1); dropped += 1; continue;
    }
    break;
  }
  return out;
}

// ---- 行の分類 -----------------------------------------------------------

/**
 * 見出し行を判定する。条は「番号が柱・節と整合するか」も見るため context を受ける。
 * 整合しない条番号は見出しにせず呼び出し側が reject する（推測で見出し化しない）。
 */
function classifyHeading(line, context) {
  const section = line.match(RE_SECTION);
  if (section && indentOf(line) === 0) {
    return { kind: 'section', number: Number(section[1]), title: section[2].replace(/[\s　]+/g, ' ').trim() };
  }
  const article = line.match(RE_ARTICLE);
  if (article) {
    const [, b, c, s, a, title] = article;
    const consistent =
      Number(b) === context.bookNumber &&
      Number(c) === context.chapterNumber &&
      (context.sectionNumber === null || Number(s) === context.sectionNumber);
    return {
      kind: 'article',
      consistent,
      number: `${b}-${c}-${s}-${a}`,
      sectionNumber: Number(s),
      articleNumber: Number(a),
      title: title.replace(/[\s　]+/g, ' ').trim(),
    };
  }
  const withinClauseIndent = indentOf(line) <= context.headingIndent + CLAUSE_INDENT_TOLERANCE;
  const clause = withinClauseIndent ? line.match(RE_CLAUSE) : null;
  if (clause) {
    return { kind: 'clause', number: Number(clause[1]), title: clause[2].replace(/[\s　]+/g, ' ').trim() };
  }
  // 小数と紛らわしい項（`8.2枚以上の…`）は、文書自身の連番に一致するときだけ採用する。
  const loose = withinClauseIndent ? line.match(RE_CLAUSE_LOOSE) : null;
  if (loose && Number(loose[1]) === context.expectedClause) {
    return {
      kind: 'clause',
      number: Number(loose[1]),
      title: loose[2].replace(/[\s　]+/g, ' ').trim(),
      resolvedBySequence: true,
    };
  }
  return null;
}

/**
 * 見出しで区切られたひとまとまり（segment）を、空行で chunk に割り、
 * chunk 単位で「表領域」か「散文」かを決める。
 *
 * 表領域は GFM へ復元せず原文レイアウトのコードブロックとして出す（内容を捨てないことを優先）。
 * キャプションだけの chunk とその直後の表 chunk は 1 つに束ねる。
 */
function segmentToBlocks(segment) {
  const chunks = [];
  let current = [];
  for (const entry of segment) {
    if (entry.text.trim() === '') {
      if (current.length) { chunks.push(current); current = []; }
    } else {
      current.push(entry);
    }
  }
  if (current.length) chunks.push(current);

  const classified = [];
  for (const chunk of chunks) {
    const captionOnly =
      chunk.length === 1 &&
      (RE_TABLE_CAPTION.test(chunk[0].text) || RE_FIGURE_CAPTION.test(chunk[0].text));
    const dense = chunk.some((e) => isLayoutLine(e.text));
    const wide = chunk.filter((e) => hasWideGap(e.text)).length;
    // 多列の表は 1 行で判る（dense）。2 列組の一覧は 1 行では散文と区別できないので、
    // 「広い隙間を持つ行が 2 本以上、かつ chunk の 4 割以上」を要求する。散文の誤検出は
    // 1 行あたり 0.88% なので、この密度条件を通ることはまず無い。
    const isTable = !captionOnly && (dense || (wide >= 2 && wide / chunk.length >= 0.4));
    if (!isTable) {
      classified.push({ chunk, isTable, captionOnly });
      continue;
    }
    // 表の前に散文が空行なしで続く紙面がある（「以下の基準類による。」＋一覧）。
    // 段落まで一緒にコードブロックへ入れるとコードブロックの濫用になるので、
    // 最初の版面行／キャプションで切って前半は散文として出す。
    const start = chunk.findIndex(
      (e) =>
        isLayoutLine(e.text) ||
        hasWideGap(e.text) ||
        RE_TABLE_CAPTION.test(e.text) ||
        RE_FIGURE_CAPTION.test(e.text),
    );
    if (start > 0) classified.push({ chunk: chunk.slice(0, start), isTable: false, captionOnly: false });
    classified.push({ chunk: chunk.slice(Math.max(start, 0)), isTable: true, captionOnly: false });
  }

  // 表領域は空行をまたいで複数 chunk に割れる（キャプション / 見出し行 / データ行）。
  // 連続する「キャプション単独」「表」chunk を 1 つの表領域へ束ねる。
  const merged = [];
  for (let i = 0; i < classified.length; i += 1) {
    const entry = classified[i];
    if (!entry.isTable && !(entry.captionOnly && classified[i + 1]?.isTable)) {
      merged.push(entry);
      continue;
    }
    const lines = [...entry.chunk];
    let j = i + 1;
    while (j < classified.length && (classified[j].isTable || classified[j].captionOnly)) {
      // キャプション単独で終わる並びは次の表に属するので、後続が表でなければ束ねない
      if (classified[j].captionOnly && !classified[j + 1]?.isTable) break;
      lines.push({ text: '', page: classified[j].chunk[0].page }, ...classified[j].chunk);
      j += 1;
    }
    merged.push({ chunk: lines, isTable: true, captionOnly: false });
    i = j - 1;
  }

  const blocks = [];
  for (const entry of merged) {
    if (entry.isTable) {
      blocks.push({ type: 'table', lines: entry.chunk, pages: uniquePages(entry.chunk) });
      continue;
    }
    if (entry.captionOnly) {
      blocks.push({ type: 'caption', lines: entry.chunk, pages: uniquePages(entry.chunk) });
      continue;
    }
    blocks.push(...proseBlocks(entry.chunk));
  }
  return blocks;
}

function uniquePages(entries) {
  return [...new Set(entries.map((e) => e.page))].sort((a, b) => a - b);
}

/**
 * 散文 chunk を段落へ復元する。
 * 実測ルール: chunk 内の最小インデントが継続行、それより深い行が段落の開始。
 * （p151 で `本節は…` / `なお、…` の 2 段落が正しく割れることを確認済み）
 */
function proseBlocks(chunk) {
  const base = Math.min(...chunk.map((e) => indentOf(e.text)));
  const blocks = [];
  let current = null;
  for (const entry of chunk) {
    const note = RE_NOTE.test(entry.text);
    const item = entry.text.match(RE_ITEM);
    const startsNew = indentOf(entry.text) > base || note || item;
    if (!current || startsNew) {
      if (current) blocks.push(current);
      current = {
        type: note ? 'note' : item ? 'item' : 'paragraph',
        ...(item ? { itemNumber: Number(item[1]) } : {}),
        lines: [entry],
      };
    } else {
      current.lines.push(entry);
    }
  }
  if (current) blocks.push(current);
  return blocks.map((b) => ({ ...b, pages: uniquePages(b.lines) }));
}

// ---- 本体 ---------------------------------------------------------------

/**
 * 文書全体を解析して章配列・監査記録・rejects を返す。
 * 例外を投げるのは「入力が壊れている」ときだけで、判定不能な行は rejects/review に載せて解析は続ける。
 */
export function analyzeDocument(document, overrides = {}) {
  const pages = loadDocumentPages(document);
  const override = overrides.documents?.[`${document.agencyId}/${document.documentId}`] ?? {};
  const removed = { runningHeaders: [], printPageNumbers: [], chapterFront: [], dedents: [] };
  const rejects = [];
  const reviewQueue = [];

  const bodyStart = detectBodyStart(pages, override);
  if (!bodyStart) {
    throw new Error(`${document.agencyId}/${document.documentId}: 本文開始ページを判定できない（override で bodyStartPage を指定する）`);
  }

  const frontPages = pages.filter((p) => p.page < bodyStart.page);
  const bodyPages = pages.filter((p) => p.page >= bodyStart.page);

  // --- 柱で章へ束ねる ---
  const chapters = [];
  let currentChapter = null;
  for (const page of bodyPages) {
    const header = readRunningHeader(page);
    if (!header) {
      rejects.push({ page: page.page, kind: 'missing-running-header', detail: '柱を検出できないページ' });
      if (currentChapter) currentChapter.pages.push({ page, header: null });
      continue;
    }
    const chapterId = `${header.bookNumber}-${header.chapterNumber}`;
    if (!currentChapter || currentChapter.chapterId !== chapterId) {
      if (currentChapter && chapters.some((c) => c.chapterId === chapterId)) {
        // 非連続な章（柱が途中で戻る）＝解析前提が崩れているので必ず surface する
        rejects.push({ page: page.page, kind: 'non-contiguous-chapter', detail: chapterId });
      }
      currentChapter = {
        chapterId,
        bookNumber: header.bookNumber,
        bookTitle: header.bookTitle,
        chapterNumber: header.chapterNumber,
        chapterTitle: header.chapterTitle,
        pages: [],
      };
      chapters.push(currentChapter);
    }
    currentChapter.pages.push({ page, header });
  }

  // --- 章ごとに本文を組み立てる ---
  for (const chapter of chapters) {
    chapter.firstPage = chapter.pages[0].page.page;
    chapter.lastPage = chapter.pages[chapter.pages.length - 1].page.page;
    chapter.sourcePages = chapter.pages.map((p) => p.page.page);
    chapter.sourceParts = [...new Set(chapter.pages.map((p) => p.page.part))];

    let lines = [];
    for (const { page, header } of chapter.pages) {
      const { kept, headerRemoved, printRemoved } = stripPageFurniture(page, header, removed, removed.dedents);
      if (header && !headerRemoved) rejects.push({ page: page.page, kind: 'header-not-removed' });
      if (!printRemoved) {
        reviewQueue.push({ page: page.page, kind: 'no-print-page-number', detail: '印刷ページ番号が最終行に無い' });
      }
      lines.push(...kept);
    }
    lines = stripChapterFront(lines, chapter, removed);

    // --- 見出しで segment 化 ---
    const context = {
      bookNumber: chapter.bookNumber,
      chapterNumber: chapter.chapterNumber,
      sectionNumber: null,
      // 項の期待番号。節・条で 1 に戻る。LOOSE な項（`8.2枚以上…`）の採否をこの連番で決める。
      expectedClause: 1,
      // 直近の節・条見出しのインデント。項のインデント判定の基準になる。
      headingIndent: 0,
    };
    const nodes = [];
    let segment = [];
    const flush = () => {
      if (!segment.length) return;
      nodes.push(...segmentToBlocks(segment).map((b) => ({ ...b, role: 'body' })));
      segment = [];
    };
    for (const entry of lines) {
      const heading = classifyHeading(entry.text, context);
      if (heading?.kind === 'article' && !heading.consistent) {
        // 条番号が柱・節と整合しない＝解析前提が崩れている。見出しにせず reject して本文として残す。
        rejects.push({
          page: entry.page,
          kind: 'article-number-mismatch',
          detail: `${heading.number} が 柱 ${chapter.chapterId} / 節 ${context.sectionNumber} と不一致`,
          text: trimBoth(entry.text),
        });
        segment.push(entry);
        continue;
      }
      if (heading) {
        flush();
        if (heading.kind !== 'clause') context.headingIndent = indentOf(entry.text);
        if (heading.kind === 'section') {
          context.sectionNumber = heading.number;
          context.expectedClause = 1;
          context.scope = trimBoth(entry.text);
        } else if (heading.kind === 'article') {
          context.expectedClause = 1;
          context.scope = trimBoth(entry.text);
        } else if (heading.kind === 'clause') {
          // 連番から外れる項は文書側の採番か解析漏れのどちらか。判定せず review へ出して先へ進む。
          if (heading.number !== context.expectedClause) {
            reviewQueue.push({
              page: entry.page,
              kind: 'clause-sequence',
              detail: `「${trimBoth(entry.text)}」は ${context.expectedClause}. を期待（直近の見出し: ${context.scope ?? '章冒頭'}）`,
            });
          }
          context.expectedClause = heading.number + 1;
        }
        nodes.push({ ...heading, role: 'heading', page: entry.page, raw: trimBoth(entry.text) });
        continue;
      }
      segment.push(entry);
    }
    flush();
    chapter.nodes = nodes;
  }

  // --- 行会計: 本文行が全て割り当てられているか ---
  const bodyLineTotal = bodyPages.reduce((sum, p) => sum + p.lines.filter((l) => l.trim() !== '').length, 0);
  const assigned = chapters.reduce((sum, chapter) => {
    return sum + chapter.nodes.reduce((n, node) => {
      if (node.role === 'heading') return n + 1;
      return n + node.lines.filter((l) => l.text.trim() !== '').length;
    }, 0);
  }, 0);
  const removedCount =
    removed.runningHeaders.length + removed.printPageNumbers.length + removed.chapterFront.length;

  return {
    document: { agencyId: document.agencyId, documentId: document.documentId },
    bodyStart,
    frontMatter: {
      pages: frontPages.map((p) => p.page),
      firstPage: frontPages[0]?.page ?? null,
      lastPage: frontPages[frontPages.length - 1]?.page ?? null,
    },
    chapters,
    removed,
    rejects,
    reviewQueue,
    audit: {
      totalPages: pages.length,
      frontMatterPages: frontPages.length,
      bodyPages: bodyPages.length,
      bodyLineTotal,
      assignedLines: assigned,
      removedLines: removedCount,
      unassignedLines: bodyLineTotal - assigned - removedCount,
    },
  };
}

export const patterns = {
  RE_RUNNING_HEADER,
  RE_PRINT_PAGE,
  RE_SECTION,
  RE_ARTICLE,
  RE_CLAUSE,
  RE_ITEM,
  RE_TABLE_CAPTION,
  RE_FIGURE_CAPTION,
  RE_NOTE,
};
export const helpers = { indentOf, trimBoth, isLayoutLine, hasWideGap, gapCount, uniquePages };

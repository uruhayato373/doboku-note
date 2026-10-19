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
 * 例外補正はコードへの場当たり的条件追加ではなく config/standards-structure.json へ集約する。
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { datasetPath } from './datasets.mjs';
import { escapeRegExp } from './regexp-escape.mjs';
import { CONTENT_SOURCES_ROOT, REPO_ROOT, SITE_CONTENT_ROOT } from './repository-paths.mjs';

// リポジトリのルートは module の場所から決める（import 時の process.cwd() で固定しない。どの cwd から呼んでも同じ実体を指す）
export const LIBRARY_ROOT = join(SITE_CONTENT_ROOT, 'standards-library');
export const ARTICLES_ROOT = join(SITE_CONTENT_ROOT, 'standards-articles');
/** 原本と照合して組み直した表（人とエージェントが書く入力。生成器が読み、検査が照合する） */
export const TABLE_OVERRIDES_ROOT = join(CONTENT_SOURCES_ROOT, 'standards', 'tables');

/** 組み直した表を key → 中身の Map で読む（無ければ空）。 */
export function loadTableOverrides() {
  const map = new Map();
  if (!existsSync(TABLE_OVERRIDES_ROOT)) return map;
  for (const name of readdirSync(TABLE_OVERRIDES_ROOT).filter((file) => file.endsWith('.json'))) {
    const entry = JSON.parse(readFileSync(join(TABLE_OVERRIDES_ROOT, name), 'utf8'));
    if (`${entry.key}.json` !== name) throw new Error(`${name}: ファイル名と key（${entry.key}）が違う`);
    map.set(entry.key, entry);
  }
  return map;
}
const OVERRIDES_PATH = join(REPO_ROOT, datasetPath('config.standards-structure'));

// ---- 行パターン ---------------------------------------------------------
// インデント上限は中部 common の実測分布から決めている（コメントの数値は実測件数）。
/** 柱: `第1編   共通編     第3章 無筋・鉄筋コンクリート`（本文 582/582 ページ） */
const RE_RUNNING_HEADER = /^[\s　]*第\s*([0-9０-９]+)\s*編\s+(\S+?)\s+第\s*([0-9０-９]+)\s*章\s+(\S.*?)\s*$/;
/** 印刷ページ番号: `1-73`（本文 582/582 ページの最終行） */
const RE_PRINT_PAGE = /^[\s　]*([0-9０-９]+)[\s　]*[-－][\s　]*([0-9０-９]+)[\s　]*$/;
/** 編扉: `第1編 共通編`（章冒頭のみ 8 件） */
const RE_BOOK_TITLE = /^[\s　]*第\s*([0-9０-９]+)\s*編\s+(\S.*?編)[\s　]*$/;
/** 章扉: `第3章     無筋・鉄筋コンクリート`（章冒頭。本文中の参照列挙にも一致しうるので章冒頭でのみ使う） */
const RE_CHAPTER_TITLE = /^[\s　]*第\s*([0-9０-９]+)\s*章\s+(\S.*?)[\s　]*$/;
/** 節: `第9節   暑中コンクリート`。実測 404/404 が indent 0（本文中の「第4節コンクリートミキサー船」は行頭でないので当たらない） */
const RE_SECTION = /^[\s　]{0,2}第\s*([0-9０-９]+)\s*節\s+(\S.*?)[\s　]*$/;
/** 条: `1-3-9-1   一般事項`。indent は 0-1 が 1800/1804、残り 4 件が 3-9（条番号整合で本物と確認済み） */
const RE_ARTICLE = /^[\s　]{0,9}([0-9０-９]+)-([0-9０-９]+)-([0-9０-９]+)-([0-9０-９]+)\s+(\S.*?)[\s　]*$/;
/** 要綱の第N: `第１ 目的` `第 27 歩行者用通路の確保`（設定 articleStyle: "dai"）。題名が長い・句読点を含む行は見出しにしない */
const RE_ARTICLE_DAI = /^[\s　]{0,4}第[\s　]*([0-9０-９]{1,3})[\s　]+(\S.*?)[\s　]*$/;
const DAI_TITLE_MAX = 30;
/** 印刷ページ番号が通し番号だけの文書（中部の特記仕様書は最終行が `7`）。設定 printPageNumber: "plain" */
const RE_PRINT_PAGE_PLAIN = /^[\s　]*[0-9０-９]{1,4}[\s　]*$/;
/** 印刷ページ番号を横棒で挟む文書（東北の共通特記仕様書は `- 3 -`）。設定 printPageNumber: "dashed" */
const RE_PRINT_PAGE_DASHED = /^[\s　]*[-－][\s　]*[0-9０-９]{1,4}[\s　]*[-－][\s　]*$/;
/** 条番号が 章-節-条 の 3 段の文書（東北の共通特記仕様書 `１－１－16 設計図書の照査`）。編は番号に入らない */
const RE_ARTICLE_3 = /^[\s　]{0,9}([0-9０-９]+)[-－]([0-9０-９]+)[-－]([0-9０-９]+)[\s　]+(\S.*?)[\s　]*$/;
/**
 * 文書ごとの版面の方言（設定 documents.* から作る）。共通仕様書は全て既定のまま。
 *   runningHeaderPrefix  柱の前の語（中部の特記仕様書 `特仕 第1編 …`）
 *   articleNumberPrefix  条番号の前の語（同 `特仕1-1-1-1 適用`）。見出しの番号にも残す
 *   printPageNumber      "plain" は最終行の通し番号（`7`）、"dashed" は `- 3 -` を印刷ページ番号として除く
 *   articleNumberParts   3 なら条番号を 章-節-条 で読む（既定は 編-章-節-条 の 4 段）
 *   chapterSource        "headings" なら章を柱でなく本文中の編・章の見出しで切る（柱を持たない文書）
 *   runningHeaderText    chapterSource=headings の文書で、各ページの先頭に刷られた定型の行（北海道独自の `北海道開発局独自`）
 *   clauseTitleMaxLength 項の題名がこの字数を超えるか読点を含むなら、見出しにせず段落の始まりにする
 *                        （`11．受注者は、工事箇所の湧水は…` のように項が題名を持たず文で始まる文書）
 *   clauseSequence       "sparse" なら項番号の連番を検査しない（差分だけを共通仕様書の項番号で載せる文書）
 *   sectionIndentMax     節の見出しとして認める字下げの上限（既定 0。東北の共通特記仕様書は 1 字下げの節がある）
 *   chapterSource        "outline" なら章の始まりを設定 outline（ページ＋その行）で決める（chaptersFromOutline）。
 *                        編・章の見出しの形が文書ごとに違う要綱・要領（工事必携の各要綱など）に使う
 *   runningHeaderPattern 各ページの先頭の柱の形（正規表現の文字列）。一致した先頭行を柱として除く（outline の文書）
 *   printPageNumber      配列なら複数の形を認める（["dashed", "plain"]）。"none" は印刷ページ番号を持たない文書
 *   printPagePattern     印刷ページ番号の形を正規表現の文字列で与える（九州の必携は `通 4−1 1` のように編の略称が付く）
 *   printPageRequired    false なら印刷ページ番号の無いページを review に出さない（原本が一部のページにしか刷っていない文書）
 *   fullWidthClauses     true なら全角数字の項番号（`３．材料`）も項として読む
 *   tablePages           [[開始, 終了], …] の PDF ページは 1 ページ全体を 1 つの表の版面にする（見出しも段落も判定しない）。
 *                        摘要欄の長い文が段落に化けて表が 1〜2 行ずつに切れる、全ページが 1 つの大きな表の文書（国交省の品質管理基準）に使う
 *   articleStyle         "none" なら条を読まない（本文が共通仕様書の条番号を引く手引き）。"dai" なら `第１ 目的` の形（要綱の第N）を条の見出しにする（番号の整合は見ない）
 */
function dialectOf(override) {
  const header = override.runningHeaderPrefix;
  const article = override.articleNumberPrefix;
  return {
    header: header
      ? new RegExp(`^[\\s　]*${escapeRegExp(header)}[\\s　]+${RE_RUNNING_HEADER.source.replace(/^\^\[\\s　\]\*/, '')}`)
      : RE_RUNNING_HEADER,
    article: override.articleNumberParts === 3
      ? RE_ARTICLE_3
      : article
      ? new RegExp(`^[\\s　]{0,9}${escapeRegExp(article)}[\\s　]*${RE_ARTICLE.source.replace(/^\^\[\\s　\]\{0,9\}/, '')}`)
      : RE_ARTICLE,
    articlePrefix: article ?? '',
    articleParts: override.articleNumberParts ?? 4,
    clauseTitleMaxLength: override.clauseTitleMaxLength ?? null,
    sparseClauses: override.clauseSequence === 'sparse',
    sectionIndentMax: override.sectionIndentMax ?? 0,
    printPage: override.printPagePattern ? new RegExp(override.printPagePattern) : printPagePatternOf(override.printPageNumber),
    printPageRequired: override.printPageRequired ?? true,
    articleStyle: override.articleStyle ?? null,
    fullWidthClauses: override.fullWidthClauses === true,
  };
}
const PRINT_PAGE_PATTERNS = { plain: RE_PRINT_PAGE_PLAIN, dashed: RE_PRINT_PAGE_DASHED, default: RE_PRINT_PAGE, none: /(?!)/ };
function printPagePatternOf(setting) {
  if (!setting) return RE_PRINT_PAGE;
  const names = Array.isArray(setting) ? setting : [setting];
  const patterns = names.map((name) => {
    const pattern = PRINT_PAGE_PATTERNS[name];
    if (!pattern) throw new Error(`printPageNumber「${name}」は未知の形（plain / dashed / default / none）`);
    return pattern;
  });
  return patterns.length === 1 ? patterns[0] : { test: (line) => patterns.some((pattern) => pattern.test(line)) };
}
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
/** 項番号が全角の文書（九州の必携の安全施工技術指針 `３．土留・支保工の組立て`）。設定 fullWidthClauses: true */
const RE_CLAUSE_FW = /^[\s　]{0,16}([0-9０-９]+)[\s　]?[.．](?![0-9０-９])[\s　]*(\S.*?)[\s　]*$/;
const RE_CLAUSE_LOOSE_FW = /^[\s　]{0,16}([0-9０-９]+)[\s　]?[.．][\s　]*(\S.*?)[\s　]*$/;
/**
 * 項のインデントは**親（節・条）見出しからの相対**で見る。
 * 版面が右寄りの紙面（p273 は条が indent 9・項が 13）があり、絶対値で閾値を切ると項を落とす。
 * 一方ページ内に全幅の表が同居するため（p273/p177）ページ単位の正規化では届かない。
 * 親からの差分に上限を置けば、深い位置にある表のセルは自然に外れる。
 */
const CLAUSE_INDENT_TOLERANCE = 6;
/** 号: `（1）工事概要` */
const RE_ITEM = /^[\s　]{0,4}[（(](\d+)[）)][\s　]*(.*?)[\s　]*$/;
/** 丸数字の細目: `① 振動数の多い振動機を用いて…`（段落の始まり。折り返しの続きとしてつながない） */
const RE_CIRCLED_ITEM = /^[\s　]{0,6}(?:[①-⑳]|[0-9０-９]{1,2}[）)])/;
/** 規格番号を 1 行ずつ並べた一覧の項目: `JIS A 5011-1（コンクリート用スラグ骨材…）`（折り返しの続きとしてつながない） */
const RE_STANDARD_ENTRY = /^[\s　]*(?:JIS|JSCE|JHS|JPI|JASS|ISO|ASTM)[\s　]+[A-Z0-9]/;
/** 文の終わり（段落をここで閉じてよい字）と、文頭に来ない字（前の段落の続きである印） */
const RE_SENTENCE_END = /[。）」』：]$/;
const RE_NOT_SENTENCE_START = /^[ぁ-ゖ、。ー）」』】〕］]/;
/** 表示幅（全角 2・半角 1）。行が紙面の右端まで詰まっているかを見るのに使う */
const displayWidth = (text) => [...text].reduce((sum, ch) => sum + (ch.codePointAt(0) > 0xff ? 2 : 1), 0);
/** 表・図キャプション: `表1-3-4   養生期間` */
const RE_TABLE_CAPTION = /^[\s　]*表\s*(\d+)[-－](\d+)(?:[-－](\d+))?\s*(.*?)[\s　]*$/;
const RE_FIGURE_CAPTION = /^[\s　]*図\s*(\d+)[-－](\d+)(?:[-－](\d+))?\s*(.*?)[\s　]*$/;
/** 注記: `［注］` / `[注1]` */
const RE_NOTE = /^[\s　]{0,6}[［\[]\s*注/;
/** 目次のドットリーダー行 */
const RE_DOT_LEADER = /\.{5,}/;

const indentOf = (line) => line.length - line.replace(/^[\s　]+/, '').length;
/** 全角数字を含む番号を数値にする（北海道版は柱・章扉が `第１編` `第１章`）。 */
const toInt = (value) => Number(String(value).replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
/**
 * 見出しの題名を整える。連続空白は 1 個に畳み、1 文字どうしの間の空白（字間を空けた組み）だけ詰める。
 * 北海道版は短い語を字間を空けて組む（`総    則` `し ゃ 断 層   開発局独自参照`）ので、
 * そのままだと「総 則」「し ゃ 断 層」になる。語の区切りの空白（近畿版 7-1 の
 * `コンクリート管 コルゲートパイプ管の施工`）は両側が 1 文字ではないので残る。
 */
const normalizeTitle = (text) =>
  text.replace(/[\s　]+/g, ' ').trim().replace(/(?<=(?:^| )\S) (?=\S(?: |$))/g, '');
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
  if (!existsSync(OVERRIDES_PATH)) return { schemaVersion: 1, documents: {} };
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
    // Windows の作業ツリーは autocrlf で CRLF になる。行末の \r を残すと章の sourceSha256 が
    // OS ごとに変わる（Linux の CI と Windows で別の値を書く）ので、読んだ時点で LF にそろえる。
    const source = readFileSync(join(LIBRARY_ROOT, part.file), 'utf8').replace(/\r\n/g, '\n');
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
      return m ? { book: toInt(m[1]), no: toInt(m[2]) } : null;
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
function readRunningHeader(page, pattern = RE_RUNNING_HEADER) {
  for (const line of page.lines) {
    if (!line.trim()) continue;
    const m = line.match(pattern);
    return m
      ? {
          line,
          bookNumber: toInt(m[1]),
          bookTitle: m[2].replace(/[\s　]+/g, ''),
          chapterNumber: toInt(m[3]),
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
function stripPageFurniture(page, header, removed, dedents, printPattern = RE_PRINT_PAGE) {
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
    if (index === lastContentIndex && printPattern.test(line)) {
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
    if (book && toInt(book[1]) === chapter.bookNumber) {
      removed.chapterFront.push({ page: out[cursor].page, text: trimBoth(line) });
      out.splice(cursor, 1); dropped += 1; continue;
    }
    const chap = line.match(RE_CHAPTER_TITLE);
    if (chap && toInt(chap[1]) === chapter.chapterNumber
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
  if (context.articleStyle === 'dai') {
    const dai = line.match(RE_ARTICLE_DAI);
    // 題名に読点は許す（`第 50 杭、鋼矢板等の打設工程`）。句点・長い行・折り返しの続き（`第\n86 号）`）は見出しにしない
    const daiTitle = dai?.[2] ?? '';
    const unbalanced = (daiTitle.match(/[）)]/g)?.length ?? 0) > (daiTitle.match(/[（(]/g)?.length ?? 0);
    if (dai && [...daiTitle].length <= DAI_TITLE_MAX && !/。/.test(daiTitle) && !/^[号条項]/.test(daiTitle) && !unbalanced) {
      return { kind: 'article', consistent: true, number: `第${toInt(dai[1])}`, articleNumber: toInt(dai[1]), title: normalizeTitle(dai[2]) };
    }
  }
  // 節の字下げの上限は既定 0（共通仕様書）。設定で広げた文書は字下げを外してから形を見る
  const section = indentOf(line) <= (context.sectionIndentMax ?? 0) ? line.replace(/^[\s　]+/, '').match(RE_SECTION) : null;
  if (section) {
    return { kind: 'section', number: toInt(section[1]), title: normalizeTitle(section[2]) };
  }
  // 条を持たない文書（書類作成マニュアル・手引き）は本文中の共通仕様書の条番号 `1-1-1-3` を見出しにしない
  // 要綱（dai）も条は `第N` だけで、本文中の `1-1-1-2` は共通仕様書への参照
  const article = context.articleStyle === 'none' || context.articleStyle === 'dai' ? null : line.match(context.articlePattern ?? RE_ARTICLE);
  if (article && context.articleParts === 3) {
    // 3 段の条番号は 章-節-条（編を持たない）なので、章・節で整合を見る
    const [c, sec, a] = article.slice(1, 4).map(toInt);
    return {
      kind: 'article',
      consistent: c === context.chapterNumber && (context.sectionNumber === null || sec === context.sectionNumber),
      number: `${context.articlePrefix ?? ''}${c}-${sec}-${a}`,
      sectionNumber: sec,
      articleNumber: a,
      title: normalizeTitle(article[4]),
    };
  }
  if (article) {
    const [b, c, s, a] = article.slice(1, 5).map(toInt);
    const consistent =
      b === context.bookNumber &&
      c === context.chapterNumber &&
      (context.sectionNumber === null || s === context.sectionNumber);
    return {
      kind: 'article',
      consistent,
      number: `${context.articlePrefix ?? ''}${b}-${c}-${s}-${a}`,
      sectionNumber: s,
      articleNumber: a,
      title: normalizeTitle(article[5]),
    };
  }
  const withinClauseIndent = indentOf(line) <= context.headingIndent + CLAUSE_INDENT_TOLERANCE;
  const clause = withinClauseIndent ? line.match(context.fullWidthClauses ? RE_CLAUSE_FW : RE_CLAUSE) : null;
  if (clause) {
    const title = normalizeTitle(clause[2]);
    const sentence = context.clauseTitleMaxLength !== null && context.clauseTitleMaxLength !== undefined
      && ([...title].length > context.clauseTitleMaxLength || /[、。]/.test(title));
    return { kind: 'clause', number: toInt(clause[1]), title, ...(sentence ? { sentence: true } : {}) };
  }
  // 小数と紛らわしい項（`8.2枚以上の…`）は、文書自身の連番に一致するときだけ採用する。
  const loose = withinClauseIndent ? line.match(context.fullWidthClauses ? RE_CLAUSE_LOOSE_FW : RE_CLAUSE_LOOSE) : null;
  if (loose && toInt(loose[1]) === context.expectedClause) {
    return {
      kind: 'clause',
      number: toInt(loose[1]),
      title: normalizeTitle(loose[2]),
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
    // 表の行が空行で 1 行ずつ離れて組まれた紙面（近畿版 p167 表2-2-1 の `10   100` `5   90～100` …）は、
    // 1 行の chunk だけ見ると散文と区別できず段落に化けていた。直前が表の領域で、広い空白を持ち、
    // 句点で終わらない 1 行は表の続きとみなす。
    const previous = classified[classified.length - 1];
    const tableRowAfterTable =
      chunk.length === 1 && !captionOnly && previous?.isTable && hasWideGap(chunk[0].text) && !trimBoth(chunk[0].text).endsWith('。');
    const isTable =
      tableRowAfterTable || (!captionOnly && !isWrappedProse(chunk) && (dense || (wide >= 2 && wide / chunk.length >= 0.4)));
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

  // 表と表に挟まれた短い chunk（1 列目のラベルだけの行・縦書きの見出しの断片。近畿版 3-1 p198 の
  // `重要構造物`・2-2 p177 の `均等であ`）は、広い空白を持たないので段落に化け、表の行が抜け落ちていた。
  // 前後がともに表で、句点で終わる行を含まない並びは表の一部とみなす（散文の文は句点で終わる）。
  for (let i = 0; i < classified.length; i += 1) {
    if (classified[i].isTable || classified[i].captionOnly) continue;
    let j = i;
    while (j < classified.length && !classified[j].isTable && !classified[j].captionOnly) j += 1;
    // 表のキャプションで始まり表の直前まで続く並び（近畿版 p244 表3-2-13(1) の縦書きの見出し
    // `確認方法場` `項目 要求性能所` …）も、見出しの行が段落に化けていたので表の一部とみなす
    // 並びの途中から始まるキャプション（前に散文の段落がある）も見る。表に含めるのはキャプションから後ろ
    const captionAt = classified.slice(i, j).findIndex((e) => RE_TABLE_CAPTION.test(e.chunk[0].text));
    const from = classified[i - 1]?.isTable ? i : captionAt >= 0 ? i + captionAt : -1;
    const sandwiched = from >= 0 && classified[j]?.isTable;
    if (sandwiched && classified.slice(from, j).every((e) => e.chunk.every((line) => !trimBoth(line.text).endsWith('。')))) {
      for (let k = from; k < j; k += 1) classified[k].isTable = true;
    }
    i = j - 1;
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
  // 空行をはさんで文が続く紙面（ページの変わり目・版面の余白）で、段落が文の途中で切れていた
  // （近畿版 1-1「…監督職員を通じ」⏎「て発注者に通知しなければならない。」）。前の段落が句点で終わらず、
  // 次の段落が文頭に来ない字（ひらがな・読点・閉じ括弧）で始まるなら、1 つの段落につなぐ。
  const joined = [];
  for (const block of blocks) {
    const prev = joined[joined.length - 1];
    const prevText = prev && ['paragraph', 'item', 'note'].includes(prev.type) ? trimBoth(prev.lines[prev.lines.length - 1].text) : '';
    const firstText = block.type === 'paragraph' ? trimBoth(block.lines[0].text) : '';
    if (prevText && firstText && !RE_SENTENCE_END.test(prevText) && RE_NOT_SENTENCE_START.test(firstText)) {
      prev.lines.push(...block.lines);
      prev.pages = uniquePages(prev.lines);
      continue;
    }
    joined.push(block);
  }
  return joined;
}

/**
 * 版面の桁揃えで語間に広い空白が入っただけの散文段落か（DN-0430）。
 * 例: `（平成14年7月31日      国官技第112号、…` が 2 行以上続くと 2 列組の一覧と区別できず表に落ちていた。
 * 散文の条件: 段落が「。」で終わる／途中行は「。」で終わらず継続行の字下げが揃う（文の折返しだけ）／
 * 広い空白を 2 か所以上持つ行（多列の表の行）もキャプションも無い。広い空白は散文側の joinWrapped が 1 個に畳む。
 */
function isWrappedProse(chunk) {
  if (chunk.length < 2) return false;
  const texts = chunk.map((e) => trimBoth(e.text));
  if (!texts[texts.length - 1].endsWith('。')) return false;
  if (texts.slice(0, -1).some((t) => t.endsWith('。'))) return false;
  if (chunk.some((e) => isLayoutLine(e.text) || gapCount(e.text, 4) >= 2)) return false;
  if (chunk.some((e) => RE_TABLE_CAPTION.test(e.text) || RE_FIGURE_CAPTION.test(e.text))) return false;
  const rest = chunk.slice(1).map((e) => indentOf(e.text));
  return rest.every((n) => n === rest[0]) && indentOf(chunk[0].text) >= rest[0];
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
  // 行が版面の右端まで詰まっているか（＝紙面の幅で折り返した行か）を見るための chunk 内の最大の表示幅
  const maxWidth = Math.max(...chunk.map((e) => displayWidth(e.text.replace(/[\s　]+$/, ''))));
  const blocks = [];
  let current = null;
  let previous = null;
  for (const entry of chunk) {
    const note = RE_NOTE.test(entry.text);
    const item = entry.text.match(RE_ITEM);
    const circled = RE_CIRCLED_ITEM.test(entry.text) || RE_STANDARD_ENTRY.test(entry.text);
    // 項目のぶら下げ字下げ（`（1）…おそれのあるも` の次行を字下げして `のを除去し…`）は、字下げが深くても
    // 文の続き。前の行が右端まで詰まっていて句点で終わっていなければ折り返しとみなす（近畿版 3-2-3-12 で
    // 文の途中に段落が入っていた）。字下げした段落の始まり（前の行が句点で終わる）はこれまでどおり分ける。
    const wrapped =
      previous !== null &&
      displayWidth(previous.text.replace(/[\s　]+$/, '')) >= maxWidth * 0.85 &&
      !trimBoth(previous.text).endsWith('。');
    const startsNew = (!wrapped && indentOf(entry.text) > base) || note || item || circled;
    previous = entry;
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
 * 柱を持たない文書（chapterSource=headings）の章を、本文中の編・章の見出しで切る。
 *
 * 章はページの途中で替わるので、ページを見出しの行で割った「ページ片」を章へ束ねる。片は元の
 * ページ番号を持ち、ページの途中で終わる片（次の章へ続く）は印刷ページ番号を持たない（continued）。
 * 編・章の見出しの行は扉と同じく本文から除き removed.chapterFront に積む。最初の章見出しより
 * 前の本文（前文）は最初の章の冒頭へ入れる（章の外に置く場所が無く、捨てない）。
 *
 * 見出しは版面の中央に寄せて組まれる（北海道独自は字下げ 20〜28 桁）ので字下げでは判定しない。
 * 本文中の「第2章」への参照と取り違えないよう、行全体が見出しの形で、同じ編の中で章番号が増えるか、
 * 直前に編の見出しがあるときだけ採る。
 */
function chaptersFromHeadings(bodyPages, override, removed) {
  const runningText = override.runningHeaderText ? override.runningHeaderText.replace(/[\s　]+/g, '') : null;
  const chapters = [];
  let book = null;
  let bookFresh = false;
  let current = null;
  const preface = [];
  const open = (chapter) => {
    current = { ...chapter, pages: [] };
    chapters.push(current);
    // 前文は最初の章の冒頭へ
    for (const piece of preface.splice(0)) current.pages.push(piece);
  };
  for (const page of bodyPages) {
    const firstContent = page.lines.findIndex((line) => line.trim());
    const header = runningText && firstContent >= 0 && page.lines[firstContent].replace(/[\s　]+/g, '') === runningText
      ? { line: page.lines[firstContent] }
      : null;
    let piece = { page: { ...page, lines: [] }, header };
    const flush = (continued) => {
      piece.page.continued = continued;
      if (current) current.pages.push(piece);
      else preface.push(piece);
    };
    page.lines.forEach((line) => {
      const bookMatch = line.match(RE_BOOK_TITLE);
      if (bookMatch) {
        book = { number: toInt(bookMatch[1]), title: bookMatch[2].replace(/[\s　]+/g, '') };
        bookFresh = true;
        removed.chapterFront.push({ page: page.page, text: trimBoth(line) });
        return;
      }
      const chapterMatch = book ? line.match(RE_CHAPTER_TITLE) : null;
      const number = chapterMatch ? toInt(chapterMatch[1]) : null;
      if (chapterMatch && (bookFresh || (current && current.bookNumber === book.number && number > current.chapterNumber))) {
        removed.chapterFront.push({ page: page.page, text: trimBoth(line) });
        if (piece.page.lines.some((entry) => entry.trim()) || piece.header) flush(true);
        piece = { page: { ...page, lines: [] }, header: null };
        open({
          chapterId: `${book.number}-${number}`,
          bookNumber: book.number,
          bookTitle: book.title,
          chapterNumber: number,
          chapterTitle: chapterMatch[2].replace(/[\s　]+/g, ''),
        });
        bookFresh = false;
        return;
      }
      piece.page.lines.push(line);
    });
    flush(false);
  }
  if (preface.length) throw new Error('章の見出しが 1 つも無い（chapterSource=headings の前提が崩れている）');
  return chapters;
}

/** 章の見出しの行から番号の部分（ラベル）と題名を分ける: `第１章 総則` `1章 総 則` `Ⅰ．共通編` `3．工事施設帳票` */
const RE_OUTLINE_LABEL = /^[\s　]*(第[\s　]*[0-9０-９]+[\s　]*章|[0-9０-９]+[\s　]*章|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+[\s　]*[．.]?|[0-9０-９]+[\s　]*[．.])[\s　]*(\S.*?)[\s　]*$/;
const compact = (text) => text.replace(/[\s　]+/g, '');
const toHalfWidth = (text) => text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));

/**
 * 章の始まりを設定の目次（outline）で決める（chapterSource=outline）。
 *
 * 工事必携の要綱・要領は見出しの形が文書ごとに違い（編を持たない `第１章 総則`、`土木工事編` の下で章番号が
 * 繰り返す公衆災害防止対策要綱、`Ⅰ．共通編` の完成図書作成要領 …）、正規表現で拾うと本文中の参照
 * （`第１章３節に準ずること。`）と取り違える。そこで章の始まりを「ページ＋その行」で設定に持つ。
 *   { "page": 39, "match": "建築工事編", "book": true }  … 編の見出し。行を除き、以降の章をこの編に入れる
 *   { "page": 2, "match": "第１章 総則" }               … 章の見出し。行を除き、新しい章を始める
 *   { "page": 66, "match": "…について", "book": true, "chapter": true } … 編と、その題名の章を同時に始める
 *   { …, "plainArticles": true }                       … その章では要綱の `第N` を条の見出しにしない（見直し内容の抜き書きなど）
 *   { …, "book": true, "item": 14 }                      … 冊子の項目番号（近畿の必携の総目次の番号）。章に item を持たせ、設定 editionCanonical の項目と結ぶ
 *   { "page": 81, "match": "…の解説", "front": true }    … ここから次の項目までを中扉・目次として章に入れない
 *                                                          （removed.outlineFront に積み、ページは前付けと同じく章の外に数える）
 * match は空白を無視してそのページのちょうど 1 行に一致しなければならない（0 行・2 行以上は例外）。
 * 同じページに同じ行が複数あるときは occurrence（1 始まり）で選ぶ。label・title で表示を上書きできる。
 * 編を持たない文書は outlineBook（既定は文書の題名）を 1 つの編にする。章 ID は編と章の通し番号（1-1, 1-2 …）。
 * 柱・印刷ページ番号の除去は柱の文書と同じ（runningHeaderPattern・printPageNumber）。
 */
function chaptersFromOutline(bodyPages, override, removed, document) {
  const outline = override.outline ?? [];
  if (!outline.length) throw new Error('chapterSource=outline だが outline が空');
  const headerPattern = override.runningHeaderPattern ? new RegExp(override.runningHeaderPattern) : null;
  const anchors = new Map();
  outline.forEach((entry, index) => {
    const list = anchors.get(entry.page) ?? [];
    list.push({ ...entry, index, key: compact(entry.match) });
    anchors.set(entry.page, list);
  });
  const found = new Set();
  const chapters = [];
  let inFront = false;
  removed.outlineFront = [];
  removed.outlineFrontPages = [];
  const preface = [];
  let current = null;
  let book = null;
  let bookCount = 0;
  const chapterCountByBook = new Map();
  const openBook = (title, label, item = null) => {
    bookCount += 1;
    book = { number: bookCount, title, label, item };
  };
  for (const page of bodyPages) {
    const firstContent = page.lines.findIndex((line) => line.trim());
    const pageAnchors = anchors.get(page.page) ?? [];
    // 柱と同じ行が章の見出しを兼ねるページ（見直し内容の 1 ページ目）は、見出しとして扱い柱にしない
    const anchoredFirst = firstContent >= 0 && pageAnchors.some((anchor) => anchor.key === compact(page.lines[firstContent]));
    const header = headerPattern && firstContent >= 0 && !anchoredFirst && headerPattern.test(page.lines[firstContent])
      ? { line: page.lines[firstContent] }
      : null;
    // 各 anchor が当たる行を先に確定する（ちょうど 1 行。occurrence があればその番目）
    const lineToAnchor = new Map();
    for (const anchor of pageAnchors) {
      const hits = page.lines.map((line, i) => (compact(line) === anchor.key ? i : -1)).filter((i) => i >= 0);
      const pick = anchor.occurrence ? hits[anchor.occurrence - 1] : hits.length === 1 ? hits[0] : undefined;
      if (pick === undefined) {
        throw new Error(`${document.agencyId}/${document.documentId}: outline「${anchor.match}」が p${page.page} の ${hits.length} 行に一致（ちょうど 1 行か occurrence が要る）`);
      }
      lineToAnchor.set(pick, anchor);
    }
    let piece = { page: { ...page, lines: [] }, header, front: inFront };
    const flush = (continued) => {
      if (piece.front && !piece.page.lines.some((entry) => entry.trim())) return;
      piece.page.continued = continued;
      if (current) current.pages.push(piece);
      else preface.push(piece);
    };
    page.lines.forEach((line, i) => {
      const anchor = lineToAnchor.get(i);
      if (!anchor) {
        if (!inFront) { piece.page.lines.push(line); return; }
        if (line.trim()) {
          removed.outlineFront.push({ page: page.page, text: trimBoth(line) });
          if (removed.outlineFrontPages.at(-1) !== page.page) removed.outlineFrontPages.push(page.page);
        }
        return;
      }
      found.add(anchor.index);
      inFront = Boolean(anchor.front);
      if (anchor.front) {
        removed.outlineFront.push({ page: page.page, text: trimBoth(line) });
        if (removed.outlineFrontPages.at(-1) !== page.page) removed.outlineFrontPages.push(page.page);
        // 中扉の前までの片は今の章へ閉じる（中扉のページは章に入れない）
        if (piece.page.lines.some((entry) => entry.trim())) flush(true);
        piece = { page: { ...page, lines: [] }, header: null, front: true };
        return;
      }
      removed.chapterFront.push({ page: page.page, text: trimBoth(line) });
      if (anchor.book) {
        openBook(anchor.bookTitle ?? (anchor.chapter ? null : anchor.title) ?? normalizeTitle(trimBoth(line)), anchor.label && !anchor.chapter ? anchor.label : null, anchor.item ?? null);
        if (!anchor.chapter) return;
      }
      if (!book) openBook(override.outlineBook ?? document.title, null);
      if (piece.page.lines.some((entry) => entry.trim()) || piece.header) flush(true);
      piece = { page: { ...page, lines: [] }, header: null, front: false };
      const parsed = trimBoth(line).match(RE_OUTLINE_LABEL);
      const number = (chapterCountByBook.get(book.number) ?? 0) + 1;
      chapterCountByBook.set(book.number, number);
      current = {
        chapterId: `${book.number}-${number}`,
        bookNumber: book.number,
        bookTitle: book.title,
        bookLabel: book.label ?? book.title,
        chapterNumber: number,
        chapterTitle: anchor.title ?? normalizeTitle(parsed ? parsed[2] : trimBoth(line)),
        chapterLabel: anchor.label ?? (parsed ? compact(toHalfWidth(parsed[1])) : ''),
        ...(anchor.plainArticles ? { plainArticles: true } : {}),
        ...(book.item ? { item: book.item } : {}),
        pages: [],
      };
      chapters.push(current);
      for (const early of preface.splice(0)) current.pages.push(early);
    });
    flush(false);
  }
  const missing = outline.filter((_, index) => !found.has(index));
  if (missing.length) {
    throw new Error(`outline の ${missing.length} 項目が本文に無い（例: p${missing[0].page}「${missing[0].match}」）`);
  }
  if (!chapters.length) throw new Error('outline に章が 1 つも無い（編の見出しだけ）');
  return chapters;
}

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
  const dialect = dialectOf(override);
  const headerPattern = dialect.header;

  const bodyStart = detectBodyStart(pages, override);
  if (!bodyStart) {
    throw new Error(`${document.agencyId}/${document.documentId}: 本文開始ページを判定できない（override で bodyStartPage を指定する）`);
  }

  const frontPages = pages.filter((p) => p.page < bodyStart.page);
  const bodyPages = pages.filter((p) => p.page >= bodyStart.page);

  // 原本の柱の誤植の補正（設定 runningHeaderCorrections）。柱の行は除去するが、章の帰属は設定の章にする。
  // 補正先の章の題名は、その章の柱を正しく持つ他のページから取る（設定に題名を書き写さない）。
  const headerCorrections = new Map((override.runningHeaderCorrections ?? []).map((entry) => [entry.page, entry.chapterId]));
  const headersByChapter = new Map();
  for (const page of bodyPages) {
    if (headerCorrections.has(page.page)) continue;
    const header = readRunningHeader(page, headerPattern);
    if (header) headersByChapter.set(`${header.bookNumber}-${header.chapterNumber}`, header);
  }
  removed.headerCorrections = [];

  // --- 柱で章へ束ねる（柱を持たない文書は本文中の見出しで切る） ---
  const chapters = override.chapterSource === 'headings'
    ? chaptersFromHeadings(bodyPages, override, removed)
    : override.chapterSource === 'outline'
      ? chaptersFromOutline(bodyPages, override, removed, document)
      : [];
  let currentChapter = null;
  for (const page of override.chapterSource ? [] : bodyPages) {
    let header = readRunningHeader(page, headerPattern);
    const correctedId = headerCorrections.get(page.page);
    if (correctedId) {
      const target = headersByChapter.get(correctedId);
      const printed = header ? `${header.bookNumber}-${header.chapterNumber}` : null;
      if (!header || !target || printed === correctedId) {
        throw new Error(`${document.agencyId}/${document.documentId}: p${page.page} の柱の補正（→${correctedId}）が実体と合わない（柱 ${printed ?? 'なし'}・補正先の章 ${target ? 'あり' : 'なし'}）。設定を見直す`);
      }
      removed.headerCorrections.push({ page: page.page, printed, corrected: correctedId });
      header = { ...target, line: header.line };
    }
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
    chapter.sourcePages = [...new Set(chapter.pages.map((p) => p.page.page))];
    chapter.sourceParts = [...new Set(chapter.pages.map((p) => p.page.part))];

    let lines = [];
    for (const { page, header } of chapter.pages) {
      const { kept, headerRemoved, printRemoved } = stripPageFurniture(page, header, removed, removed.dedents, dialect.printPage);
      if (header && !headerRemoved) rejects.push({ page: page.page, kind: 'header-not-removed' });
      if (!printRemoved && !page.continued && dialect.printPageRequired) {
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
      articlePattern: dialect.article,
      articlePrefix: dialect.articlePrefix,
      articleParts: dialect.articleParts,
      clauseTitleMaxLength: dialect.clauseTitleMaxLength,
      sectionIndentMax: dialect.sectionIndentMax,
      articleStyle: chapter.plainArticles ? null : dialect.articleStyle,
      fullWidthClauses: dialect.fullWidthClauses,
    };
    const nodes = [];
    let segment = [];
    const tablePageRanges = override.tablePages ?? [];
    const isTablePage = (page) => tablePageRanges.some(([from, to]) => page >= from && page <= to);
    const flush = () => {
      if (!segment.length) return;
      nodes.push(...segmentToBlocks(segment).map((b) => ({ ...b, role: 'body' })));
      segment = [];
    };
    // 設定 tablePages のページは 1 ページ全体を 1 つの表の版面にする（行を落とさず、見出し・段落の判定をしない）
    let tableBlock = null;
    const flushTable = () => {
      if (!tableBlock) return;
      while (tableBlock.lines.length && !tableBlock.lines.at(-1).text.trim()) tableBlock.lines.pop();
      if (tableBlock.lines.some((entry) => entry.text.trim())) nodes.push({ type: 'table', role: 'body', lines: tableBlock.lines, pages: [tableBlock.page] });
      tableBlock = null;
    };
    for (const entry of lines) {
      if (isTablePage(entry.page)) {
        flush();
        if (tableBlock && tableBlock.page !== entry.page) flushTable();
        if (!tableBlock) {
          if (!entry.text.trim()) continue;
          tableBlock = { page: entry.page, lines: [] };
        }
        tableBlock.lines.push(entry);
        continue;
      }
      flushTable();
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
      if (heading?.sentence) {
        // 文で始まる項（題名を持たない）は見出しにせず、段落の始まりにする。番号は連番として数える
        flush();
        segment.push(entry);
        if (heading.number === context.expectedClause) context.expectedClause = heading.number + 1;
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
          if (heading.number !== context.expectedClause && !dialect.sparseClauses) {
            reviewQueue.push({
              page: entry.page,
              kind: 'clause-sequence',
              detail: `「${trimBoth(entry.text)}」は ${context.expectedClause}. を期待（直近の見出し: ${context.scope ?? '章冒頭'}）`,
            });
          }
          // 範囲で書かれた項（北海道版 `2．～4．開発局独自参照`）は範囲の終わりの次を期待する
          const range = heading.title.match(/^[～〜]\s*([0-9０-９]+)\s*[.．]/);
          context.expectedClause = (range ? toInt(range[1]) : heading.number) + 1;
        }
        nodes.push({ ...heading, role: 'heading', page: entry.page, raw: trimBoth(entry.text) });
        continue;
      }
      segment.push(entry);
    }
    flush();
    flushTable();
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
    removed.runningHeaders.length + removed.printPageNumbers.length + removed.chapterFront.length
    + (removed.outlineFront?.length ?? 0);

  // 原本どおりと確かめた review は設定（acceptedReview）で理由付きで受け入れる。消さずに
  // acceptedReview として台帳に残し、設定にあるのに当たらない受け入れは古い設定として reject する。
  const acceptances = override.acceptedReview ?? [];
  const acceptedReview = [];
  const used = new Set();
  const pending = reviewQueue.filter((entry) => {
    const index = acceptances.findIndex(
      (rule, i) => !used.has(i) && rule.page === entry.page && rule.kind === entry.kind && entry.detail.includes(rule.match),
    );
    if (index < 0) return true;
    used.add(index);
    acceptedReview.push({ ...entry, reason: acceptances[index].reason });
    return false;
  });
  acceptances.forEach((rule, i) => {
    if (!used.has(i)) {
      rejects.push({ page: rule.page, kind: 'stale-acceptance', detail: `acceptedReview「${rule.match}」（${rule.kind}）が再解析の review に当たらない` });
    }
  });

  return {
    document: { agencyId: document.agencyId, documentId: document.documentId },
    bodyStart,
    frontMatter: {
      pages: frontPages.map((p) => p.page),
      // 目次（outline）の中扉・目次として章に入れなかったページ（本文の途中にある）
      outlinePages: removed.outlineFrontPages ?? [],
      firstPage: frontPages[0]?.page ?? null,
      lastPage: frontPages[frontPages.length - 1]?.page ?? null,
    },
    chapters,
    removed,
    rejects,
    reviewQueue: pending,
    acceptedReview,
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
export const helpers = { indentOf, trimBoth, isLayoutLine, hasWideGap, gapCount, uniquePages, segmentToBlocks };

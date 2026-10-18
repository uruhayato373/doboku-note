#!/usr/bin/env node
/**
 * build-standard-articles.mjs — 逐語文字起こし（レイヤー1）から構造化章記事（レイヤー2）を生成する。
 *
 *   入力 content/site/standards-library/{agency}/{document}/part-*.md   ← 不変・原典照合用
 *   出力 content/site/standards-articles/{agency}/{document}/manifest.json
 *        content/site/standards-articles/{agency}/{document}/chapters/{chapterId}.md
 *
 * 章は part（PDF 50 ページ単位）ではなく**柱（running header）が示す編・章**で切る。part 境界を
 * またぐ章があるため、全 part を PDF ページ順に結合してから解析する（scripts/lib/standards-structure.mjs）。
 *
 * 表は**可逆に復元できるものだけ** GFM にする（scripts/lib/standards-table.mjs）。復元後のセルを
 * 連結して空白を除いた文字列が元行と完全一致しなければ採用しない。落ちたものは原文レイアウトの
 * コードブロック＋原本ページリンクで出し、**なぜ GFM にしなかったかの理由を manifest に残す**
 * （黙って諦めた表と、そもそも表を見ていない状態を区別できるようにする）。
 *
 * 使い方:
 *   node scripts/build-standard-articles.mjs                # 設定 build.documents を生成
 *   node scripts/build-standard-articles.mjs chubu/common   # 対象を明示
 *   node scripts/build-standard-articles.mjs --check        # 生成せず解析だけ回して統計を出す
 */

import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import { applyTableOverride, tableKey, tryGfmTable, tryStandardsList } from './lib/standards-table.mjs';
import { pathToFileURL } from 'node:url';
import { datasetPath } from './lib/datasets.mjs';
import {
  AMENDMENT_BLOCK_END,
  AMENDMENT_BLOCK_START,
  amendmentChapterOf,
  amendmentScopeByChapter,
  loadAmendmentPages,
  resolveAmendmentEntries,
} from './lib/standards-amendments.mjs';
import {
  ARTICLES_ROOT,
  analyzeDocument,
  getCatalog,
  loadDocumentPages,
  loadOverrides,
  loadTableOverrides,
  patterns,
} from './lib/standards-structure.mjs';

const { RE_TABLE_CAPTION, RE_FIGURE_CAPTION } = patterns;
/** 基準類の一覧を持つ節・条の題名（`第2節 適用すべき諸基準`・`1-3-2-1 適用すべき諸基準`） */
const STANDARDS_LIST_SCOPE = /適用すべき諸基準/;

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex');

/**
 * 共通仕様書の章に対する地方の訂正・追加（設定 documents.*.amendments）を章ごとのページへ束ねる。
 *
 * 中国地方整備局版（chugoku/local）は共通仕様書の条ごとの訂正・追加を 5 列の表で並べた文書で、
 * 各ページの先頭に `【第１編 共通編 第１章 総則 関係】` を刷る（1 ページに 2 章を書くこともある:
 * `第１章 築堤・護岸，第３章 樋門・樋管 関係`）。表は版面の列がずれていてテキストから行を組み直せないので、
 * ページ画像から組み直した行（content/sources/standards/amendments/・scripts/standards-amendments.mjs）が
 * 全ページ承認済みなら条ごとに差し込み、そうでなければ章の冒頭にページへの案内だけを出す。
 */
function amendmentPagesOf(catalog, amendments) {
  if (!amendments) return null;
  const [agencyId, documentId] = amendments.document.split('/');
  const source = catalog.documents.find((d) => d.agencyId === agencyId && d.documentId === documentId);
  if (!source) throw new Error(`amendments の文書 ${amendments.document} が catalog に無い`);
  const byChapter = amendmentScopeByChapter(loadDocumentPages(source));
  if (byChapter.size === 0) throw new Error(`amendments の文書 ${amendments.document} から【…関係】のページを 1 つも拾えない`);

  // 原本と照合して組み直した行（content/sources/standards/amendments/）。【…関係】のページが全部承認済みのときだけ
  // 章記事へ差し込む（一部だけだとページをまたぐ行が途中で切れる）。そうでなければ案内だけを出す
  const scopePages = [...new Set([...byChapter.values()].flat())].sort((a, b) => a - b);
  const pageFiles = loadAmendmentPages(amendments.document);
  const approved = new Set(pageFiles.filter(({ data }) => data.review?.status === 'approved').map(({ data }) => data.page));
  const complete = scopePages.every((page) => approved.has(page));
  const rowsByChapter = new Map();
  if (complete) {
    const { entries } = resolveAmendmentEntries(pageFiles.filter(({ data }) => scopePages.includes(data.page)));
    for (const entry of entries) {
      const chapterId = amendmentChapterOf(entry);
      rowsByChapter.set(chapterId, [...(rowsByChapter.get(chapterId) ?? []), entry]);
    }
  }
  return { source, label: amendments.label, byChapter, rowsByChapter, complete, scopePages: scopePages.length, approvedPages: approved.size };
}

/** ページ番号の並びを連続区間に畳む（[3,4,5,9] → [[3,5],[9,9]]）。 */
function pageRanges(pages) {
  const ranges = [];
  for (const page of [...new Set(pages)].sort((a, b) => a - b)) {
    const last = ranges[ranges.length - 1];
    if (last && page === last[1] + 1) last[1] = page;
    else ranges.push([page, page]);
  }
  return ranges;
}

/** 逐語分冊の該当ページへのリンク（src/lib/standards-articles.ts の resolveSourcePageHref と同じ形）。 */
function libraryPageHref(document, page) {
  const part = document.parts.find((p) => page >= p.firstPage && page <= p.lastPage);
  return part ? `/standards/${document.agencyId}/${document.documentId}/${part.slug}#pdf-page-${page}` : null;
}

function renderAmendmentNote(amendment, pages, inserted) {
  const links = pageRanges(pages).map(([first, last]) => {
    const label = first === last ? `原本 p.${first}` : `原本 p.${first}–${last}`;
    return `[${label}](${libraryPageHref(amendment.source, first)})`;
  });
  // 案内も差し込みと同じ目印で囲む（地域差分・読みやすさの検査が本文から除けるように）
  const note = inserted
    ? `> この章の条ごとに、${amendment.label}が定める訂正・追加を差し込んでいます（${amendment.source.title}・${links.join('、')}）。`
    : `> この章には、${amendment.label}が定める訂正・追加があります（${amendment.source.title}・${links.join('、')}）。`;
  return [AMENDMENT_BLOCK_START, '', note, '', AMENDMENT_BLOCK_END].join('\n');
}

/** 訂正・追加の 1 行を引用ブロックにする（欄の文字は原本どおり。枠の文言だけが生成器のもの）。 */
function renderAmendmentRow(row, amendment, { withArticle }) {
  const label = [
    withArticle && row.article ? `${row.article}${row.articleTitle ? ` ${row.articleTitle}` : ''}` : null,
    row.clause ? `項 ${row.clause}` : null,
    row.heading,
  ].filter(Boolean).map((text) => escapeInline(text)).join('｜');
  const pageLinks = pageRanges(row.pages)
    .map(([first, last]) => `[原本 p.${first === last ? first : `${first}–${last}`}](${libraryPageHref(amendment.source, first)})`)
    .join('、');
  // 訂正・追加の欄が原本で空欄の行は印を出さない
  const mark = row.kind.trim() ? `〔${escapeInline(row.kind)}〕` : '';
  const blocks = [`**${[mark, label].filter(Boolean).join(' ') || '（欄なし）'}**（${pageLinks}）`];
  for (const paragraph of row.body) {
    if (typeof paragraph === 'string') {
      blocks.push(escapeBlockStart(escapeInline(paragraph)));
      continue;
    }
    const [head, ...rest] = paragraph.table;
    const line = (cells) => `| ${cells.map((cell) => escapeInline(cell)).join(' | ')} |`;
    blocks.push([line(head), `| ${head.map(() => '---').join(' | ')} |`, ...rest.map(line)].join('\n'));
  }
  return blocks.map((block) => block.split('\n').map((line) => `> ${line}`).join('\n')).join('\n>\n');
}

/** 条の直後に置く訂正・追加のまとまり。検査が本文と区別できるよう目印のコメントで囲む。 */
function renderAmendmentBlock(rows, amendment, { heading, withArticle = false }) {
  return [
    AMENDMENT_BLOCK_START,
    '',
    heading,
    '',
    rows.map((row) => renderAmendmentRow(row, amendment, { withArticle })).join('\n\n'),
    '',
    AMENDMENT_BLOCK_END,
  ].join('\n');
}

// ---- Markdown 生成 -------------------------------------------------------

/**
 * 散文の折返しを 1 段落へ戻す。日本語は語間に空白を持たないので原則は無連結だが、
 * 半角英数どうしが行またぎで隣接する場合（`JIS K` / `2208`）だけ空白を補う。
 */
function joinWrapped(lines) {
  let out = '';
  for (const line of lines) {
    // 版面の桁揃えで入った連続空白は 1 個へ畳む。HTML はどのみち連続空白を 1 個に描画するので
    // 表示は変わらず、ソースの diff と grep だけが読みやすくなる（表はコードブロックなので対象外）。
    const piece = line.text.replace(/^[\s　]+/, '').replace(/[\s　]+$/, '').replace(/[ 　]{2,}/g, ' ');
    if (!out) { out = piece; continue; }
    const needsSpace = /[0-9A-Za-z]$/.test(out) && /^[0-9A-Za-z]/.test(piece);
    out += needsSpace ? ` ${piece}` : piece;
  }
  return out;
}

/**
 * Markdown/MDX の記法として解釈される文字を無害化する。
 * 実測（中部 common 本文 21,227 行）では `<` `>` `{` `}` バッククォート `|` は 1 件も無く、
 * 出現するのは `[` `]`（半角の ［注］ 12 行）、`_`（URL 1 行）、`*`（表の中身のみ）だけだった。
 * 表はコードブロックへ入れるのでここへは来ない。
 */
function escapeInline(text) {
  return text.replace(/([\\`*_[\]<>{}|])/g, '\\$1');
}

/** 行頭がブロック記法に見える段落を無害化する（`0.08％…` が番号付きリストになるのを防ぐ）。 */
function escapeBlockStart(text) {
  return text
    .replace(/^(\d+)([.)])/, '$1\\$2')
    .replace(/^([#>+|-])/, '\\$1');
}

/** 組み直した表の部品 1 つを Markdown にする（部品の種類は applyTableOverride のコメント）。 */
function renderOverridePart(part) {
  if (part.kind === 'caption') return `**${escapeInline(part.text)}**`;
  if (part.kind === 'text' || part.kind === 'note') return escapeBlockStart(escapeInline(part.text));
  if (part.kind === 'list') return part.items.map((item) => `- ${escapeBlockStart(escapeInline(item))}`).join('\n');
  if (part.kind === 'verbatim') return ['```text', ...part.lines, '```'].join('\n');
  const row = (cells, bold = false) =>
    `| ${cells.map((cell) => (cell && bold ? `**${escapeInline(cell)}**` : escapeInline(cell))).join(' | ')} |`;
  // 見出しの結合セル（横に結合した上段の見出し・縦に結合した列名）は GFM で表せないので、
  // 左隣・上の段と同じ文字の 2 つ目以降は空欄で出す。繰り返すと列幅が膨らみスマホで読めない
  const header = part.header.map((cells, r) =>
    cells.map((cell, c) => (cell && (cell === cells[c - 1] || cell === part.header[r - 1]?.[c]) ? '' : cell)),
  );
  return [
    row(header[0]),
    `| ${header[0].map(() => '---').join(' | ')} |`,
    // 2 段目以降の見出し行は GFM の見出しにできないので太字の行にする
    ...header.slice(1).map((cells) => row(cells, true)),
    ...part.rows.map((cells) => row(cells)),
  ].join('\n');
}

const formatPages = (pages) =>
  pages.length === 0 ? '' : pages.length === 1 ? `${pages[0]}` : `${pages[0]}-${pages[pages.length - 1]}`;

function renderChapter(chapter, tableOutcomes = [], tableOverrides = new Map(), verbatimTables = [], amendmentNote = null, amendmentRows = null) {
  // 章記事は next-mdx-remote で MDX としてコンパイルする（<SourceRef> を解決するため）。
  // MDX は HTML コメントを受け付けないので、注記は MDX コメント {/* */} で書く。
  const lines = [
    '{/* 自動生成: scripts/build-standard-articles.mjs。直接編集しない。',
    '    原典（逐語文字起こし）は content/site/standards-library/ 側が真実源。 */}',
    '',
  ];
  const push = (block) => { lines.push(block, ''); };
  if (amendmentNote) push(amendmentNote);
  // 訂正・追加の行は、その条の本文の後（次の節・条の見出しの前）に差し込む。章に当たる条が無い行は章末へ
  // 3 段の番号（編-章-節）の行は、その節の冒頭（最初の条の前）に置く
  const rowsByArticle = new Map();
  const keyOf = (row) => (row.articleNumber ? `article:${row.articleNumber}` : row.sectionNumber ? `section:${row.sectionNumber}` : '');
  for (const row of amendmentRows?.rows ?? []) rowsByArticle.set(keyOf(row), [...(rowsByArticle.get(keyOf(row)) ?? []), row]);
  let openArticle = null;
  const flushAmendments = () => {
    const rows = openArticle && rowsByArticle.get(openArticle);
    if (rows) {
      const level = openArticle.startsWith('section:') ? '###' : '####';
      push(renderAmendmentBlock(rows, amendmentRows.amendment, { heading: `${level} ${amendmentRows.amendment.label}の訂正・追加` }));
      rowsByArticle.delete(openArticle);
    }
    openArticle = null;
  };
  if (chapter.nodes.length === 0) {
    // 原本が章名だけで本文を持たない章（中部の特記仕様書 10-9 地下横断歩道など＝特記事項が無い章）
    push('原本ではこの章は章名だけで、本文はありません。');
  }
  // 原典には条を持たない節がある（第1編第3章第1節 適用は項が節へ直付け）。そのまま H2→H4 に
  // すると見出しレベルが飛ぶので、条が無い節の項は H3 へ繰り上げる。入れ子の深さは変わらない。
  let sectionHasArticle = false;
  // 「適用すべき諸基準」の節・条の中の表領域は基準類の一覧なので、専用の組み直しを先に試す
  let inStandardsList = false;
  // 版面のまま残った表の台帳（--table-inventory）に、どの見出しの下の表かを残す
  let lastHeading = '';
  // 組み直しの absorbs（直前の版面の取り込み）のために、この章で出た版面を key で覚える
  const seenBodies = new Map();
  const pendingAbsorbed = new Map();

  for (const node of chapter.nodes) {
    if (node.role === 'heading') {
      if (node.kind === 'section' || node.kind === 'article') flushAmendments();
      if (node.kind === 'article') openArticle = `article:${node.number}`;
      if (node.kind === 'section') openArticle = `section:${chapter.bookNumber}-${chapter.chapterNumber}-${node.number}`;
      lastHeading = node.raw;
      if (node.kind === 'section') {
        sectionHasArticle = false;
        inStandardsList = STANDARDS_LIST_SCOPE.test(node.title);
        push(`## 第${node.number}節 ${escapeInline(node.title)}`);
      } else if (node.kind === 'article') {
        sectionHasArticle = true;
        inStandardsList = STANDARDS_LIST_SCOPE.test(node.title);
        push(`### ${node.number} ${escapeInline(node.title)}`);
      } else {
        push(`${sectionHasArticle ? '####' : '###'} ${node.number}. ${escapeInline(node.title)}`);
      }
      continue;
    }
    const pages = formatPages(node.pages);
    if (node.type === 'table') {
      const body = node.lines.map((entry) => entry.text.replace(/[\s　]+$/, ''));
      while (body.length && !body[0].trim()) body.shift();
      while (body.length && !body[body.length - 1].trim()) body.pop();
      // キャプション行は表の 1 行目ではないので先に切り離す。渡したままだとヘッダ行として
      // 吸われ、`表2-2-14 | 石粉…の粒度範囲` という誤った見出し行になる。
      const caption = [];
      while (body.length && (RE_TABLE_CAPTION.test(body[0]) || RE_FIGURE_CAPTION.test(body[0]))) {
        caption.push(body.shift());
      }
      while (body.length && !body[0].trim()) body.shift();

      const listed = inStandardsList && caption.length === 0 && body.length ? tryStandardsList(body) : null;
      if (listed?.ok) {
        // 基準類の一覧は 1 項目 1 行の箇条書き（列に分けない理由は tryStandardsList のコメント）
        tableOutcomes.push(listed.reason);
        push(listed.items.map((item) => `- ${escapeBlockStart(escapeInline(item))}`).join('\n'));
        push(`<SourceRef pages="${pages}" kind="table" />`);
        continue;
      }
      if (caption.length) push(`**${escapeInline(caption.map((l) => l.trim()).join(' '))}**`);

      // 原本と照合して組み直した表（content/sources/standards/tables）。検証済みで文字の過不足が
      // ゼロのものだけ使う。検証済みなのに文字が合わないのは組み直しの誤りなので生成を止める。
      const key = body.length ? tableKey(body) : null;
      const override = key ? tableOverrides.get(key) : undefined;
      const applied = override
        ? applyTableOverride(body, override, { lookup: (ref) => tableOverrides.get(ref), absorbedBodies: seenBodies })
        : null;
      if (key) seenBodies.set(key, body);
      if (override && !applied.ok && applied.reason !== 'override-unreviewed') {
        throw new Error(`組み直した表 ${key}（章 ${chapter.chapterId}）を適用できない: ${applied.reason} ${applied.detail ?? ''}`);
      }
      if (applied?.ok) {
        tableOutcomes.push(applied.reason);
        if (applied.kind === 'absorbed') {
          // 後ろの版面が文字ごと取り込んで出す。取り込まれずに章が終わったら下で止める
          pendingAbsorbed.set(key, applied.into);
          push(`{/* table-override: ${key} absorbed-into ${applied.into} */}`);
          continue;
        }
        push(`{/* table-override: ${key} */}`);
        for (const absorbed of override.absorbs ?? []) pendingAbsorbed.delete(absorbed);
        if (applied.kind === 'verbatim') {
          push(['```text', ...body, '```'].join('\n'));
        } else {
          for (const part of applied.parts) push(renderOverridePart(part));
        }
        push(`<SourceRef pages="${pages}" kind="table" />`);
        continue;
      }

      const restored = body.length ? tryGfmTable(body) : { ok: false, reason: 'empty-layout' };
      tableOutcomes.push(restored.reason);
      if (!restored.ok && key) {
        verbatimTables.push({ key, chapterId: chapter.chapterId, pages: node.pages, caption, context: lastHeading, body, draft: Boolean(override) });
      }

      if (restored.ok) {
        const row = (cells) => `| ${cells.map((cell) => escapeInline(cell)).join(' | ')} |`;
        push([
          row(restored.header),
          `| ${restored.header.map(() => '---').join(' | ')} |`,
          ...restored.rows.map(row),
        ].join('\n'));
      } else {
        // 復元できなかった版面は 1 文字も落とさずそのまま出す（キャプションは上で別に出した）。
        push(['```text', ...caption, ...body, '```'].join('\n'));
      }
      push(`<SourceRef pages="${pages}" kind="table" />`);
      continue;
    }
    if (node.type === 'caption') {
      // 原本では図表が画像で、テキスト層にキャプションしか無いケース。原本ページへ返す。
      push(`**${escapeInline(joinWrapped(node.lines))}**`);
      push(`<SourceRef pages="${pages}" kind="figure" />`);
      continue;
    }
    if (node.type === 'note') {
      push(`> ${escapeInline(joinWrapped(node.lines))}`);
      continue;
    }
    push(escapeBlockStart(escapeInline(joinWrapped(node.lines))));
  }
  flushAmendments();
  const unplaced = [...rowsByArticle.values()].flat();
  if (unplaced.length) {
    push(renderAmendmentBlock(unplaced, amendmentRows.amendment, {
      heading: `## ${amendmentRows.amendment.label}の訂正・追加（この章の条に当たらないもの）`,
      withArticle: true,
    }));
  }
  const [leftover] = pendingAbsorbed;
  if (leftover) {
    throw new Error(`組み直した表 ${leftover[0]}（章 ${chapter.chapterId}）は ${leftover[1]} に取り込まれる宣言だが、${leftover[1]} が後ろに出てこない（本文が消える）`);
  }

  // 末尾の余分な空行を 1 本に畳む
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return `${lines.join('\n')}\n`;
}

// ---- manifest ------------------------------------------------------------

/**
 * 章の節・条を manifest 用に畳む。
 * アンカー ID は保存しない。ページ側が src/lib/toc.ts の extractHeadings（rehypeHeadingIds と
 * 同じ生成規則）で導出するため、ここに置くと第 2 の真実源になる。
 */
function summarizeChapter(chapter) {
  const sections = [];
  let section = null;
  for (const node of chapter.nodes) {
    if (node.role !== 'heading') continue;
    if (node.kind === 'section') {
      section = {
        number: node.number,
        title: node.title,
        headingText: `第${node.number}節 ${node.title}`,
        firstPage: node.page,
        lastPage: node.page,
        articles: [],
      };
      sections.push(section);
      continue;
    }
    if (!section) continue;
    section.lastPage = Math.max(section.lastPage, node.page);
    if (node.kind === 'article') {
      section.articles.push({
        number: node.number,
        title: node.title,
        headingText: `${node.number} ${node.title}`,
        page: node.page,
      });
    }
  }
  return sections;
}

/** 表の復元結果を集計する。gfm と verbatim の合計が表ブロック数と一致することを検査側が見る。 */
function tallyTables(outcomes) {
  return {
    tablesGfm: outcomes.filter((reason) => reason === 'restored').length,
    tablesList: outcomes.filter((reason) => reason === 'restored-standards-list').length,
    // 原本と照合して組み直した表・一覧（content/sources/standards/tables）
    tablesOverride: outcomes.filter((reason) => reason === 'restored-override').length,
    tablesVerbatim: outcomes.filter((reason) => !reason.startsWith('restored')).length,
  };
}

/** GFM にしなかった理由の内訳。「試したが落ちた」と「そもそも見ていない」を区別するため必ず残す。 */
function tallyReasons(outcomes) {
  const tally = {};
  for (const reason of outcomes) tally[reason] = (tally[reason] ?? 0) + 1;
  return tally;
}

function countNodes(chapter) {
  const stats = { sections: 0, articles: 0, clauses: 0, paragraphs: 0, items: 0, notes: 0, tables: 0, captions: 0 };
  for (const node of chapter.nodes) {
    if (node.role === 'heading') {
      if (node.kind === 'section') stats.sections += 1;
      else if (node.kind === 'article') stats.articles += 1;
      else stats.clauses += 1;
      continue;
    }
    if (node.type === 'table') stats.tables += 1;
    else if (node.type === 'caption') stats.captions += 1;
    else if (node.type === 'note') stats.notes += 1;
    else if (node.type === 'item') stats.items += 1;
    else stats.paragraphs += 1;
  }
  return stats;
}

// ---- 本体 ---------------------------------------------------------------

export function buildDocument(document, overrides, { write = true, verbatimTables = [] } = {}) {
  const analysis = analyzeDocument(document, overrides);
  const pages = loadDocumentPages(document);
  const pageText = new Map(pages.map((p) => [p.page, p.lines.join('\n')]));

  const canonicalCommon = overrides.canonical?.commonAgencyId ?? 'kinki';
  // 章の索引可否は文書の索引可否を継承する。同一原本を 10 機関が公開しているので、
  // role=common は canonical 機関だけを索引対象にする（src/lib/standards.ts と同じ方針）。
  const indexable = document.duplicateOf
    ? false
    : document.role !== 'common' || document.agencyId === canonicalCommon;
  const indexableReason = document.duplicateOf
    ? `duplicateOf=${document.duplicateOf}`
    : indexable
      ? 'canonical'
      : `canonical-common=${canonicalCommon}`;

  const outDir = join(ARTICLES_ROOT, document.agencyId, document.documentId);
  const chapterDir = join(outDir, 'chapters');
  if (write) {
    // 章が減ったときに古い .md が残らないよう chapters/ は毎回作り直す
    if (existsSync(chapterDir)) rmSync(chapterDir, { recursive: true });
    mkdirSync(chapterDir, { recursive: true });
  }

  // 大きすぎる章は節ページに分ける（基準は設定・切り出しは src/lib/standards-section-split.mjs）。
  // 判定はここだけで行い、サイトは manifest の splitBySection を読む。
  const splitThreshold = overrides.sectionPages?.minOutputBytes ?? Infinity;
  const tableOverrides = loadTableOverrides();
  const amendment = amendmentPagesOf(getCatalog(), overrides.documents?.[`${document.agencyId}/${document.documentId}`]?.amendments);

  const chapters = analysis.chapters.map((chapter) => {
    const tableOutcomes = [];
    const chapterTables = [];
    const amendmentPages = amendment?.byChapter.get(chapter.chapterId) ?? null;
    const rows = amendment?.rowsByChapter.get(chapter.chapterId) ?? [];
    const markdown = renderChapter(
      chapter, tableOutcomes, tableOverrides, chapterTables,
      amendmentPages ? renderAmendmentNote(amendment, amendmentPages, rows.length > 0) : null,
      rows.length ? { amendment, rows } : null,
    );
    verbatimTables.push(...chapterTables.map((table) => ({ ...table, document: `${document.agencyId}/${document.documentId}` })));
    const file = `chapters/${chapter.chapterId}.md`;
    if (write) writeMdxFile(join(outDir, file), markdown);
    const sourceText = chapter.sourcePages.map((page) => pageText.get(page)).join('\n');
    const outputBytes = Buffer.byteLength(markdown, 'utf8');
    const sections = summarizeChapter(chapter);
    const bodyless = chapter.nodes.length === 0;
    return {
      chapterId: chapter.chapterId,
      title: `第${chapter.bookNumber}編 ${chapter.bookTitle} 第${chapter.chapterNumber}章 ${chapter.chapterTitle}`,
      bookNumber: chapter.bookNumber,
      bookTitle: chapter.bookTitle,
      chapterNumber: chapter.chapterNumber,
      chapterTitle: chapter.chapterTitle,
      file,
      firstPage: chapter.firstPage,
      lastPage: chapter.lastPage,
      sourceParts: chapter.sourceParts,
      sourcePages: chapter.sourcePages,
      sourceSha256: sha256(sourceText),
      outputSha256: sha256(markdown),
      outputBytes,
      splitBySection: sections.length >= 2 && outputBytes >= splitThreshold,
      sections,
      stats: { ...countNodes(chapter), ...tallyTables(tableOutcomes) },
      tableOutcomes: tallyReasons(tableOutcomes),
      // 本文の無い章は中身が章名だけなので検索に載せない（読める状態は保つ）
      indexable: indexable && !bodyless,
      ...(bodyless ? { bodyless: true } : {}),
      ...(amendmentPages || rows.length
        ? {
            amendments: {
              document: `${amendment.source.agencyId}/${amendment.source.documentId}`,
              pages: amendmentPages ?? [],
              ...(rows.length ? { rows: rows.length } : {}),
            },
          }
        : {}),
      duplicateOf: document.duplicateOf ?? null,
      reviewStatus:
        analysis.reviewQueue.some((q) => q.page >= chapter.firstPage && q.page <= chapter.lastPage) ||
        analysis.rejects.some((q) => q.page >= chapter.firstPage && q.page <= chapter.lastPage)
          ? 'needs-review'
          : 'clean',
    };
  });

  const manifest = {
    version: 1,
    generator: 'scripts/build-standard-articles.mjs',
    agencyId: document.agencyId,
    agencyName: document.agencyName,
    documentId: document.documentId,
    documentTitle: document.title,
    documentRole: document.role,
    catalogSourceSha256: document.sourceSha256,
    pages: document.pages,
    bodyStart: analysis.bodyStart,
    frontMatter: {
      firstPage: analysis.frontMatter.firstPage,
      lastPage: analysis.frontMatter.lastPage,
      pageCount: analysis.frontMatter.pages.length,
      note: '表紙・目次。構造化の対象外（原典の逐語ページで参照する）。',
    },
    indexable,
    indexableReason,
    duplicateOf: document.duplicateOf ?? null,
    // 柱でなく本文中の見出しで章を切った文書（設定 chapterSource）。章の境目のページは前後の章が共有する
    ...(overrides.documents?.[`${document.agencyId}/${document.documentId}`]?.chapterSource === 'headings'
      ? { chapterSource: 'headings' }
      : {}),
    audit: {
      ...analysis.audit,
      chapters: chapters.length,
      assignedPages: chapters.reduce((sum, c) => sum + c.sourcePages.length, 0),
      removedRunningHeaders: analysis.removed.runningHeaders.length,
      removedPrintPageNumbers: analysis.removed.printPageNumbers.length,
      removedChapterFront: analysis.removed.chapterFront.length,
      dedentedPages: analysis.removed.dedents.length,
      tables: chapters.reduce((sum, c) => sum + c.stats.tables, 0),
      tablesGfm: chapters.reduce((sum, c) => sum + c.stats.tablesGfm, 0),
      tablesList: chapters.reduce((sum, c) => sum + c.stats.tablesList, 0),
      tablesOverride: chapters.reduce((sum, c) => sum + c.stats.tablesOverride, 0),
      tablesVerbatim: chapters.reduce((sum, c) => sum + c.stats.tablesVerbatim, 0),
    },
    tableOutcomes: chapters.reduce((tally, c) => {
      for (const [reason, count] of Object.entries(c.tableOutcomes)) {
        tally[reason] = (tally[reason] ?? 0) + count;
      }
      return tally;
    }, {}),
    removedSamples: {
      runningHeaders: analysis.removed.runningHeaders.slice(0, 3),
      printPageNumbers: analysis.removed.printPageNumbers.slice(0, 3),
      chapterFront: analysis.removed.chapterFront.slice(0, 6),
    },
    rejects: analysis.rejects,
    reviewQueue: analysis.reviewQueue,
    // 原本どおりと確かめて設定で受け入れた review と、柱の誤植の補正（どちらも設定 documents.* が理由を持つ）
    acceptedReview: analysis.acceptedReview,
    headerCorrections: analysis.removed.headerCorrections,
    chapters,
  };

  if (write) writeMdxFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  // --table-inventory=<path>: 版面のまま残った表を key ごとに束ねて書き出す（原本照合の作業台帳）
  const inventoryPath = args.find((a) => a.startsWith('--table-inventory='))?.split('=')[1] ?? null;
  const verbatimTables = [];
  const explicit = args.filter((a) => !a.startsWith('--'));
  const overrides = loadOverrides();
  const catalog = getCatalog();
  const targets = explicit.length > 0 ? explicit : (overrides.build?.documents ?? []);

  if (targets.length === 0) {
    console.error(`生成対象がゼロ件。${datasetPath('config.standards-structure')} の build.documents を確認する。`);
    process.exitCode = 2;
    return;
  }

  let failed = 0;
  for (const target of targets) {
    const [agencyId, documentId] = target.split('/');
    const document = catalog.documents.find(
      (d) => d.agencyId === agencyId && d.documentId === documentId,
    );
    if (!document) {
      console.error(`✗ ${target}: catalog.json に存在しない`);
      failed += 1;
      continue;
    }
    const manifest = buildDocument(document, overrides, { write: !check, verbatimTables });
    const a = manifest.audit;
    console.log(
      `${check ? '(check) ' : ''}${target}: 章 ${a.chapters} / 本文 ${a.bodyPages}p ` +
        `(前付け ${a.frontMatterPages}p) / 行 割当 ${a.assignedLines} + 除去 ${a.removedLines} ` +
        `= ${a.bodyLineTotal}（未割当 ${a.unassignedLines}） / 表 ${a.tables}（GFM ${a.tablesGfm} / 基準類の一覧 ${a.tablesList} / 原本照合 ${a.tablesOverride} / 版面保持 ${a.tablesVerbatim}） / rejects ${manifest.rejects.length} ` +
        `/ review ${manifest.reviewQueue.length} / indexable ${manifest.indexable}（${manifest.indexableReason}）`,
    );
    if (a.unassignedLines !== 0 || manifest.rejects.length > 0) failed += 1;
  }
  if (inventoryPath) {
    // 同じ表（key が同じ）を持つ文書・章を seenIn に束ねる。先頭の出現を代表にする
    const byKey = new Map();
    for (const table of verbatimTables) {
      const entry = byKey.get(table.key);
      const seen = `${table.document} ${table.chapterId} p${table.pages.join(',')}`;
      if (entry) entry.seenIn.push(seen);
      else byKey.set(table.key, { ...table, seenIn: [seen] });
    }
    writeFileSync(inventoryPath, `${JSON.stringify([...byKey.values()], null, 2)}\n`);
    console.log(`版面のまま残った表: ${verbatimTables.length} 件（key ${byKey.size} 種類）→ ${inventoryPath}`);
  }
  if (failed > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

export { renderChapter, summarizeChapter };

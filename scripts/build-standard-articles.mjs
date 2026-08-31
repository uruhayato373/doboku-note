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
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import { tryGfmTable } from './lib/standards-table.mjs';
import { pathToFileURL } from 'node:url';
import {
  ARTICLES_ROOT,
  analyzeDocument,
  getCatalog,
  loadDocumentPages,
  loadOverrides,
  patterns,
} from './lib/standards-structure.mjs';

const { RE_TABLE_CAPTION, RE_FIGURE_CAPTION } = patterns;

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex');

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

const formatPages = (pages) =>
  pages.length === 0 ? '' : pages.length === 1 ? `${pages[0]}` : `${pages[0]}-${pages[pages.length - 1]}`;

function renderChapter(chapter, tableOutcomes = []) {
  // 章記事は next-mdx-remote で MDX としてコンパイルする（<SourceRef> を解決するため）。
  // MDX は HTML コメントを受け付けないので、注記は MDX コメント {/* */} で書く。
  const lines = [
    '{/* 自動生成: scripts/build-standard-articles.mjs。直接編集しない。',
    '    原典（逐語文字起こし）は content/site/standards-library/ 側が真実源。 */}',
    '',
  ];
  const push = (block) => { lines.push(block, ''); };
  // 原典には条を持たない節がある（第1編第3章第1節 適用は項が節へ直付け）。そのまま H2→H4 に
  // すると見出しレベルが飛ぶので、条が無い節の項は H3 へ繰り上げる。入れ子の深さは変わらない。
  let sectionHasArticle = false;

  for (const node of chapter.nodes) {
    if (node.role === 'heading') {
      if (node.kind === 'section') {
        sectionHasArticle = false;
        push(`## 第${node.number}節 ${escapeInline(node.title)}`);
      } else if (node.kind === 'article') {
        sectionHasArticle = true;
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

      const restored = body.length ? tryGfmTable(body) : { ok: false, reason: 'empty-layout' };
      tableOutcomes.push(restored.reason);
      if (caption.length) push(`**${escapeInline(caption.map((l) => l.trim()).join(' '))}**`);

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
    tablesVerbatim: outcomes.filter((reason) => reason !== 'restored').length,
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

export function buildDocument(document, overrides, { write = true } = {}) {
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

  const chapters = analysis.chapters.map((chapter) => {
    const tableOutcomes = [];
    const markdown = renderChapter(chapter, tableOutcomes);
    const file = `chapters/${chapter.chapterId}.md`;
    if (write) writeMdxFile(join(outDir, file), markdown);
    const sourceText = chapter.sourcePages.map((page) => pageText.get(page)).join('\n');
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
      outputBytes: Buffer.byteLength(markdown, 'utf8'),
      sections: summarizeChapter(chapter),
      stats: { ...countNodes(chapter), ...tallyTables(tableOutcomes) },
      tableOutcomes: tallyReasons(tableOutcomes),
      indexable,
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
    chapters,
  };

  if (write) writeMdxFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const explicit = args.filter((a) => !a.startsWith('--'));
  const overrides = loadOverrides();
  const catalog = getCatalog();
  const targets = explicit.length > 0 ? explicit : (overrides.build?.documents ?? []);

  if (targets.length === 0) {
    console.error('生成対象がゼロ件。.claude/config/standards-structure.json の build.documents を確認する。');
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
    const manifest = buildDocument(document, overrides, { write: !check });
    const a = manifest.audit;
    console.log(
      `${check ? '(check) ' : ''}${target}: 章 ${a.chapters} / 本文 ${a.bodyPages}p ` +
        `(前付け ${a.frontMatterPages}p) / 行 割当 ${a.assignedLines} + 除去 ${a.removedLines} ` +
        `= ${a.bodyLineTotal}（未割当 ${a.unassignedLines}） / 表 ${a.tables}（GFM ${a.tablesGfm} / 版面保持 ${a.tablesVerbatim}） / rejects ${manifest.rejects.length} ` +
        `/ review ${manifest.reviewQueue.length} / indexable ${manifest.indexable}（${manifest.indexableReason}）`,
    );
    if (a.unassignedLines !== 0 || manifest.rejects.length > 0) failed += 1;
  }
  if (failed > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

export { renderChapter, summarizeChapter };

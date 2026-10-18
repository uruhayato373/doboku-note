#!/usr/bin/env node
/**
 * standards-amendments.mjs — 地方の訂正・追加表（中国地方整備局版）を原本のページ画像から組み直す作業の道具。
 * 形と規則は scripts/lib/standards-amendments.mjs の冒頭。流れは /standards-table-rebuild の「訂正・追加表」の節。
 *
 *   npm run standards-amendments -- sheets   --document chugoku/local --pages 2-62 --size 7 [--qa]
 *       作業票（ページ画像の絶対パス・版面・書き出し先）を .tmp/standards-amendments/batches/ に書く
 *   npm run standards-amendments -- validate --document chugoku/local [--pages 2-8]
 *       ページの形と、版面と JSON の文字の多重集合の一致を検査する（1 件でも ✗ なら exit 1。対象 0 件は exit 2）
 *   npm run standards-amendments -- review   --document chugoku/local --pages 2-8 --status approved --note "…"
 *       照合の結果を review に記録する（approved は文字が一致するページだけ）
 *   npm run check-standards-amendments（= standards-amendments check）
 *       設定 documents.*.amendments の全文書について、【…関係】の全ページが承認済みで文字が一致し、
 *       組み直した行が漏れなく章記事に差し込まれていることを検査する（quality:audit・CI）
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { ARTICLES_ROOT, getCatalog, loadDocumentPages, loadOverrides } from './lib/standards-structure.mjs';
import { resolveVaultRoot } from './lib/drive-vault.mjs';
import {
  amendmentChapterOf, amendmentDir, amendmentScopeByChapter, compareChars, loadAmendmentPages, pageFileName, pageStrings,
  resolveAmendmentEntries, validatePageShape,
} from './lib/standards-amendments.mjs';

const WORK_ROOT = join(REPO_ROOT, '.tmp', 'standards-amendments');
const args = parseCliArgs({
  document: { type: 'string', default: 'chugoku/local' },
  pages: { type: 'string' },
  size: { type: 'integer', default: 7 },
  qa: { type: 'boolean' },
  status: { type: 'string' },
  note: { type: 'string', default: '' },
  by: { type: 'string', default: 'qa' },
});
const command = args._[0];

const die = (message, code = 1) => {
  console.error(`[standards-amendments] ✗ ${message}`);
  process.exit(code);
};

function parsePages(spec, all) {
  if (!spec) return all;
  const out = [];
  for (const piece of spec.split(',')) {
    const [a, b] = piece.split('-').map(Number);
    for (let p = a; p <= (b || a); p += 1) out.push(p);
  }
  return out.filter((p) => all.includes(p));
}

const [agencyId, documentId] = args.document.split('/');
const document = getCatalog().documents.find((d) => d.agencyId === agencyId && d.documentId === documentId);
if (!document) die(`catalog に ${args.document} が無い`);
const layoutByPage = new Map(loadDocumentPages(document).map((p) => [p.page, p.lines.join('\n')]));
const allPages = [...layoutByPage.keys()];
const pages = parsePages(args.pages, allPages);
const dir = amendmentDir(args.document);

const readPage = (page) => {
  const file = join(dir, pageFileName(page));
  return existsSync(file) ? { file, data: JSON.parse(readFileSync(file, 'utf8')) } : { file, data: null };
};

/** 1 ページを検査して { ok, problems } を返す。 */
function checkPage(page) {
  const { data } = readPage(page);
  if (!data) return { ok: false, problems: ['JSON が無い'] };
  const problems = validatePageShape(data, { page });
  const chars = compareChars(layoutByPage.get(page), pageStrings(data));
  if (!chars.ok) {
    if (chars.missing) problems.push(`不足（版面にあって JSON に無い）: ${chars.missing}`);
    if (chars.extra) problems.push(`余分（JSON にあって版面に無い）: ${chars.extra}`);
  }
  return { ok: problems.length === 0, problems, data };
}

if (command === 'sheets') {
  // ページ画像は Drive vault の原本 PDF と同名のフォルダ `{原本の basename}/pages`（build-standards-page-images が作る）。
  // catalog の sourceFile は Drive 上の PDF 名（`local__…pdf`）。manifest が無い枝でも引けるよう、名前で探す
  const vault = resolveVaultRoot();
  if (!vault.root) die(`Drive vault が見えない（${vault.reason}）。ページ画像を開けない`, 2);
  const standardsDir = join(vault.root, '原資料PDF', '共通仕様書');
  const folderName = document.sourceFile.replace(/\.pdf$/i, '');
  const pagesDir = readdirSync(standardsDir)
    .map((agencyName) => join(standardsDir, agencyName, folderName, 'pages'))
    .find((dirPath) => existsSync(dirPath));
  if (!pagesDir) die(`ページ画像のフォルダ ${folderName}/pages が見つからない。npm run build-standards-page-images -- --agency ${agencyId} --role all`, 2);
  const imageOf = (page) => join(pagesDir, `p${String(page).padStart(4, '0')}.jpg`);
  const missingImages = pages.filter((page) => !existsSync(imageOf(page)));
  if (missingImages.length) die(`ページ画像が無い: p${missingImages.join(', p')}`, 2);
  const outDir = join(WORK_ROOT, 'batches');
  mkdirSync(outDir, { recursive: true });
  let n = 0;
  for (let i = 0; i < pages.length; i += args.size) {
    n += 1;
    const chunk = pages.slice(i, i + args.size);
    const name = `${args.qa ? 'qa' : 'b'}${String(n).padStart(2, '0')}`;
    const lines = [
      `# ${args.qa ? '照合' : '組み直し'}の作業票 ${name}（${args.document} p${chunk[0]}–${chunk[chunk.length - 1]}）`,
      '',
      `形と規則: scripts/lib/standards-amendments.mjs の冒頭。書き出し先: ${dir}/pNNNN.json`,
      `検査: npm run standards-amendments -- validate --document ${args.document} --pages ${chunk[0]}-${chunk[chunk.length - 1]}`,
      '',
    ];
    for (const page of chunk) {
      lines.push(`## p${page}`, '', `- 画像: ${imageOf(page)}`, `- JSON: ${join(dir, pageFileName(page))}`, '', '版面（pdftotext -layout・この文字だけを使う）:', '', '````text', layoutByPage.get(page), '````', '');
    }
    writeFileSync(join(outDir, `${name}.md`), `${lines.join('\n')}\n`);
    console.log(`${name}: p${chunk[0]}–${chunk[chunk.length - 1]}（${chunk.length} ページ）→ ${join(outDir, `${name}.md`)}`);
  }
} else if (command === 'validate') {
  if (pages.length === 0) die('対象ページが 0 件。検査不成立', 2);
  let bad = 0;
  let layoutChars = 0;
  const status = { draft: 0, approved: 0, rejected: 0 };
  for (const page of pages) {
    const result = checkPage(page);
    if (result.data?.review?.status) status[result.data.review.status] += 1;
    layoutChars += compareChars(layoutByPage.get(page), []).layoutChars;
    if (result.ok) {
      console.log(`  ✓ p${page}（行 ${result.data.entries.length}）`);
    } else {
      bad += 1;
      console.log(`  ✗ p${page}`);
      for (const problem of result.problems) console.log(`      ${problem}`);
    }
  }
  console.log(`[standards-amendments] 対象 ${pages.length} ページ / ✓ ${pages.length - bad} / ✗ ${bad} / 版面の文字 ${layoutChars} / review: draft ${status.draft}・approved ${status.approved}・rejected ${status.rejected}`);
  if (bad) process.exit(1);
} else if (command === 'review') {
  if (!['approved', 'rejected', 'draft'].includes(args.status)) die('--status approved|rejected|draft');
  if (pages.length === 0) die('対象ページが 0 件', 2);
  for (const page of pages) {
    const { file, data } = readPage(page);
    if (!data) die(`p${page}: JSON が無い`);
    if (args.status === 'approved') {
      const result = checkPage(page);
      if (!result.ok) die(`p${page}: 検査が通らないので承認できない（${result.problems.join(' / ')}）`);
    }
    data.review = { status: args.status, by: args.by, at: new Date().toISOString(), note: args.note || data.review?.note || '' };
    writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`  p${page}: ${args.status}`);
  }
} else if (command === 'check') {
  const targets = Object.entries(loadOverrides().documents ?? {}).filter(([, value]) => value.amendments);
  if (targets.length === 0) die('設定に amendments を持つ文書が 0 件。検査不成立', 2);
  const violations = [];
  let checkedPages = 0;
  let checkedRows = 0;
  for (const [target, { amendments }] of targets) {
    const [srcAgency, srcDocument] = amendments.document.split('/');
    const source = getCatalog().documents.find((d) => d.agencyId === srcAgency && d.documentId === srcDocument);
    const sourcePages = loadDocumentPages(source);
    const layout = new Map(sourcePages.map((p) => [p.page, p.lines.join('\n')]));
    const scope = [...new Set([...amendmentScopeByChapter(sourcePages).values()].flat())].sort((a, b) => a - b);
    const files = loadAmendmentPages(amendments.document);
    const byPage = new Map(files.map(({ data }) => [data.page, data]));
    for (const page of scope) {
      const data = byPage.get(page);
      checkedPages += 1;
      if (!data) { violations.push(`${amendments.document} p${page}: 組み直した JSON が無い`); continue; }
      if (data.review?.status !== 'approved') violations.push(`${amendments.document} p${page}: 承認されていない（${data.review?.status}）`);
      for (const problem of validatePageShape(data, { page })) violations.push(`${amendments.document} p${page}: ${problem}`);
      const chars = compareChars(layout.get(page), pageStrings(data));
      if (!chars.ok) violations.push(`${amendments.document} p${page}: 版面と文字が合わない（不足 ${chars.missing || 'なし'} / 余分 ${chars.extra || 'なし'}）`);
    }
    for (const page of byPage.keys()) if (!scope.includes(page)) violations.push(`${amendments.document} p${page}: 【…関係】の無いページの JSON がある`);
    // 差し込み: 章ごとの行数が manifest と章記事の実体の両方で一致する
    const { entries } = resolveAmendmentEntries(files.filter(({ data }) => scope.includes(data.page)));
    const expected = new Map();
    for (const entry of entries) expected.set(amendmentChapterOf(entry), (expected.get(amendmentChapterOf(entry)) ?? 0) + 1);
    const [agency, documentKey] = target.split('/');
    const manifest = JSON.parse(readFileSync(join(ARTICLES_ROOT, agency, documentKey, 'manifest.json'), 'utf8'));
    const chapterIds = new Set(manifest.chapters.map((c) => c.chapterId));
    for (const id of expected.keys()) if (!chapterIds.has(id)) violations.push(`${target}: 訂正・追加の行が当たる章 ${id} が章記事に無い`);
    for (const chapter of manifest.chapters) {
      const want = expected.get(chapter.chapterId) ?? 0;
      const recorded = chapter.amendments?.rows ?? 0;
      const text = readFileSync(join(ARTICLES_ROOT, agency, documentKey, chapter.file), 'utf8');
      // 行は `> **…**（[原本 p.N](…)）` で始まる（本文の `*` は逃がしてあるので行の見出しだけが当たる）
      const rendered = (text.match(/^> \*\*.+\*\*（\[原本 p\./gm) ?? []).length;
      checkedRows += rendered;
      if (recorded !== want || rendered !== want) {
        violations.push(`${target} ${chapter.chapterId}: 訂正・追加の行が 組み直し ${want} / manifest ${recorded} / 章記事 ${rendered}`);
      }
    }
  }
  console.log(`[check-standards-amendments] 文書 ${targets.length} / 【…関係】のページ ${checkedPages} を実検査 / 章記事に差し込まれた行 ${checkedRows}`);
  if (checkedPages === 0) die('検査したページが 0 件。検査不成立', 2);
  if (violations.length) {
    for (const v of violations.slice(0, 40)) console.error(`  ✗ ${v}`);
    if (violations.length > 40) console.error(`  … ほか ${violations.length - 40} 件`);
    die(`違反 ${violations.length} 件`);
  }
  console.log('[check-standards-amendments] ✓ 全ページ承認済み・文字一致・差し込み漏れなし');
} else {
  die('使い方: standards-amendments sheets|validate|review|check --document <機関/文書> [--pages 2-62]');
}

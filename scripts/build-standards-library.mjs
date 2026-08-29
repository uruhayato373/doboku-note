#!/usr/bin/env node

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join } from 'node:path';

const ROOT = process.cwd();
const SOURCE_ROOT = join(ROOT, '.tmp', 'mlit-national-transcription');
const OUTPUT_ROOT = join(SOURCE_ROOT, 'output');
const MASTER_MANIFEST = join(SOURCE_ROOT, '全国版_manifest.json');
const MASTER_QA = join(SOURCE_ROOT, '全国版_QAレポート.json');
const TARGET = join(ROOT, 'content', 'site', 'standards-library');
const STAGING = join(ROOT, '.tmp', 'standards-library-build');

function fail(message) {
  console.error(`[standards-library] ${message}`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

if (!existsSync(MASTER_MANIFEST) || !existsSync(MASTER_QA)) {
  fail('全国版の manifest / QA がありません。文字起こし最終成果物を先に復元してください。');
}

const master = readJson(MASTER_MANIFEST);
const qa = readJson(MASTER_QA);
if (!String(master.status).startsWith('PASS') || !String(qa.status).startsWith('PASS')) {
  fail(`QA が公開ゲートを満たしていません: manifest=${master.status}, qa=${qa.status}`);
}
if (master.totals?.replacementCharacters !== 0 || qa.checks?.partHashesMatched !== true) {
  fail('文字化けゼロまたは part hash 一致の検査を満たしていません。');
}

rmSync(STAGING, { recursive: true, force: true });
mkdirSync(STAGING, { recursive: true });

const unreadableByDoc = new Map();
for (const item of qa.unreadableRanges ?? []) {
  const key = `${item.agencyId}/${item.documentId}`;
  const rows = unreadableByDoc.get(key) ?? [];
  rows.push(item);
  unreadableByDoc.set(key, rows);
}

const catalogDocuments = [];
let copiedParts = 0;
let copiedBytes = 0;

for (const document of master.documents) {
  const manifestPath = join(OUTPUT_ROOT, document.agencyId, document.documentId, 'manifest.json');
  if (!existsSync(manifestPath)) fail(`文書 manifest がありません: ${manifestPath}`);
  const manifest = readJson(manifestPath);
  const manifestParts = manifest.transcription?.parts ?? manifest.parts;
  if (!Array.isArray(manifestParts)) fail(`part 一覧がありません: ${manifestPath}`);
  const parts = [];

  for (const [index, part] of manifestParts.entries()) {
    const sourceRelative = part.file ?? join('parts', part.name);
    const firstPage = part.firstPage ?? part.startPage;
    const lastPage = part.lastPage ?? part.endPage;
    const source = join(dirname(manifestPath), sourceRelative);
    const partSlug = `part-${String(index + 1).padStart(2, '0')}`;
    const target = join(STAGING, document.agencyId, document.documentId, `${partSlug}.md`);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);

    const actualSha = sha256(target);
    if (actualSha !== part.sha256) {
      fail(`コピー後 SHA-256 不一致: ${document.agencyId}/${document.documentId}/${partSlug}`);
    }
    copiedParts += 1;
    copiedBytes += part.bytes;
    parts.push({
      slug: partSlug,
      file: `${document.agencyId}/${document.documentId}/${partSlug}.md`,
      firstPage,
      lastPage,
      pageCount: part.pageCount ?? (lastPage - firstPage + 1),
      sha256: part.sha256,
      bytes: part.bytes,
    });
  }

  catalogDocuments.push({
    ...document,
    edition: manifest.transcription?.edition ?? null,
    sourceFile: manifest.source?.file ?? manifest.source?.fileName ?? null,
    parts,
    unreadableRanges: unreadableByDoc.get(`${document.agencyId}/${document.documentId}`) ?? [],
  });
}

if (copiedParts !== master.totals.parts) {
  fail(`part 数が一致しません: copied=${copiedParts}, expected=${master.totals.parts}`);
}

// Exact duplicate PDFs occur across bureaus. Keep every bureau landing page,
// but record one canonical transcription so raw part pages do not compete in
// search. Kinki is preferred when hashes are identical because it is the
// fully visually reviewed seed collection requested for this project.
const canonicalBySha = new Map();
for (const document of [...catalogDocuments].sort((a, b) => {
  if (a.agencyId === 'kinki') return -1;
  if (b.agencyId === 'kinki') return 1;
  return `${a.agencyId}/${a.documentId}`.localeCompare(`${b.agencyId}/${b.documentId}`);
})) {
  const canonical = canonicalBySha.get(document.sourceSha256);
  if (canonical) document.duplicateOf = canonical;
  else canonicalBySha.set(document.sourceSha256, `${document.agencyId}/${document.documentId}`);
}

const catalog = {
  schemaVersion: 1,
  asOf: master.asOf,
  generatedAt: master.generatedAt,
  status: master.status,
  scope: master.scope,
  totals: master.totals,
  agencies: master.agencies,
  documents: catalogDocuments,
  qa: {
    checks: qa.checks,
    errors: qa.errors,
    unreadableRanges: qa.unreadableRanges,
  },
  publication: {
    sourceAttribution: '各文書の発行機関・原典掲載ページを文書ページに表示',
    derivativeNotice: 'doboku-noteが検索・閲覧用にページ単位で文字起こしし、分冊・整形した二次利用物',
    license: '国土交通省ウェブサイト利用規約／公共データ利用規約（第1.0版）。個別の権利表示がある素材はその表示を優先',
    disclaimer: '正確性を保証するものではありません。契約・施工判断では発注機関が公開する最新版の原本を確認してください。',
  },
};

writeFileSync(join(STAGING, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
writeFileSync(
  join(STAGING, 'README.md'),
  `# 公共工事基準全文ライブラリ\n\n全国10機関・${master.totals.documents}文書・${master.totals.pages.toLocaleString('ja-JP')}ページの文字起こし公開用データです。\n\n- QA: ${master.status}\n- 分冊: ${master.totals.parts}\n- U+FFFD: ${master.totals.replacementCharacters}\n- 原本画質により一意に判読できない範囲: ${master.totals.unreadableRanges}\n- 原本PDFはGitに含めず、発行機関の原典URLをcatalog.jsonに保持します。\n`,
);

if (existsSync(TARGET)) rmSync(TARGET, { recursive: true, force: true });
renameSync(STAGING, TARGET);

console.log(`[standards-library] ✓ ${catalogDocuments.length}文書 / ${copiedParts}分冊 / ${(copiedBytes / 1024 / 1024).toFixed(1)} MiB`);
console.log(`[standards-library] output: ${TARGET}`);

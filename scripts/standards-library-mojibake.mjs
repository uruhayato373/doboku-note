#!/usr/bin/env node
/**
 * standards-library-mojibake.mjs — 全文ライブラリ（content/site/standards-library/）の文字化けしたページを、
 * 原本のページ画像から起こし直す道具と、その検査（DN-0767）。
 *
 * PDF 側のフォントの文字対応（ToUnicode）が壊れたページは、どの抽出器でもテキストが取れない（制御文字や
 * 無関係な記号の並びになる）。判定は scripts/lib/standards-mojibake.mjs。起こし直しは 2 つの独立した読みを
 * 突き合わせる: 機械の OCR（macOS Vision・scripts/lib/vision-ocr.swift）と、ページ画像を見たエージェントの目視。
 *
 *   npm run standards-library-mojibake -- scan                     文字化けしたページを文書ごとに数える
 *   npm run standards-library-mojibake -- ocr                      文字化けページを OCR（.tmp/standards-mojibake/ocr/）
 *   npm run standards-library-mojibake -- sheets --size 6          作業票（画像・OCR・書き出し先）を .tmp/standards-mojibake/batches/ へ
 *   npm run standards-library-mojibake -- validate [--batch b01]   起こした文が文字化けでなく、OCR と大きく食い違っていないか
 *   npm run standards-library-mojibake -- collect --batch-name <名> 作業の結果を visual-review.json（git）へ集める
 *   npm run standards-library-mojibake -- apply                    visual-review.json の起こし直しを分冊へ書き、catalog を更新する
 *   npm run check-standards-library                                 （= check）全ページの文字化け 0・catalog の分冊ハッシュ一致（CI）
 *
 * 起こした文の正本は content/sources/standards/{agency}/{document}/visual-review.json（add-standards-document と同じ形）。
 * 分冊のページは `<!-- extraction: visual-review; status: visual-transcribed; batch: … -->` の印で書く（既存の目視起こしと同じ）。
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { CONTENT_SOURCES_ROOT, REPO_ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { resolveVaultRoot } from './lib/drive-vault.mjs';
import { measureMojibake, splitLibraryPages } from './lib/standards-mojibake.mjs';

const LIBRARY_ROOT = join(SITE_CONTENT_ROOT, 'standards-library');
const CATALOG = join(LIBRARY_ROOT, 'catalog.json');
const WORK = join(REPO_ROOT, '.tmp', 'standards-mojibake');
const TAG = '[standards-library-mojibake]';
const args = parseCliArgs({
  size: { type: 'integer', default: 6 },
  batch: { type: 'string' },
  'batch-name': { type: 'string' },
  'min-similarity': { type: 'number', default: 0.8 },
});
const command = args._[0];
const die = (message, code = 1) => {
  console.error(`${TAG} ✗ ${message}`);
  process.exit(code);
};
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const catalog = () => JSON.parse(readFileSync(CATALOG, 'utf8'));
const pageKey = (doc, page) => `${doc.agencyId}-${doc.documentId}-p${String(page).padStart(4, '0')}`;
const reviewPath = (doc) => join(CONTENT_SOURCES_ROOT, 'standards', doc.agencyId, doc.documentId, 'visual-review.json');

/** 全文書の全ページを走査し、文字化けしたページを返す。 */
function scan() {
  const hits = [];
  let pages = 0;
  for (const doc of catalog().documents) {
    for (const part of doc.parts) {
      for (const page of splitLibraryPages(readFileSync(join(LIBRARY_ROOT, part.file), 'utf8'))) {
        pages += 1;
        const m = measureMojibake(page.text);
        if (m.garbled) hits.push({ doc, part, page: page.page, ...m });
      }
    }
  }
  return { hits, pages };
}

/** 文書のページ画像のフォルダ（Drive vault の原本 PDF と同名のフォルダ）。 */
function pagesDirOf(doc) {
  const vault = resolveVaultRoot();
  if (!vault.root) die(`Drive vault が見えない（${vault.reason}）`, 2);
  const root = join(vault.root, '原資料PDF', '共通仕様書');
  const folder = doc.sourceFile.replace(/\.pdf$/i, '');
  const found = readdirSync(root).map((agency) => join(root, agency, folder, 'pages')).find((dir) => existsSync(dir));
  if (!found) die(`${doc.agencyId}/${doc.documentId}: ページ画像が無い（${folder}/pages）。npm run build-standards-page-images`, 2);
  return found;
}
const imageOf = (doc, page) => join(pagesDirOf(doc), `p${String(page).padStart(4, '0')}.jpg`);

/** 文字の 2-gram の重なり（Dice 係数）。空白は除く。OCR と目視の食い違いの目安。 */
function similarity(a, b) {
  const grams = (text) => {
    const s = [...text.replace(/[\s　]/g, '')];
    const map = new Map();
    for (let i = 0; i < s.length - 1; i++) map.set(s[i] + s[i + 1], (map.get(s[i] + s[i + 1]) ?? 0) + 1);
    return map;
  };
  const x = grams(a);
  const y = grams(b);
  let common = 0;
  let total = 0;
  for (const [k, n] of x) { common += Math.min(n, y.get(k) ?? 0); total += n; }
  for (const n of y.values()) total += n;
  return total ? (2 * common) / total : 1;
}

if (command === 'scan') {
  const { hits, pages } = scan();
  const byDoc = new Map();
  for (const hit of hits) byDoc.set(`${hit.doc.agencyId}/${hit.doc.documentId}`, [...(byDoc.get(`${hit.doc.agencyId}/${hit.doc.documentId}`) ?? []), hit.page]);
  console.log(`${TAG} 全文ライブラリ ${pages} ページを実検査 / 文字化け ${hits.length} ページ`);
  for (const [key, list] of byDoc) console.log(`  ${key}: ${list.length}（p${list.join(', p')}）`);
} else if (command === 'ocr') {
  const { hits } = scan();
  if (!hits.length) { console.log(`${TAG} 文字化けページ 0。OCR するものが無い`); process.exit(0); }
  const outDir = join(WORK, 'ocr');
  mkdirSync(outDir, { recursive: true });
  // swift の起動（コンパイル）に 20 秒かかるので、一度だけ実行ファイルにする
  const bin = join(WORK, 'vision-ocr');
  if (!existsSync(bin)) execFileSync('swiftc', ['-O', '-o', bin, join(REPO_ROOT, 'scripts', 'lib', 'vision-ocr.swift')], { stdio: 'inherit' });
  const todo = hits.filter((hit) => !existsSync(join(outDir, `${pageKey(hit.doc, hit.page)}.txt`)));
  for (let i = 0; i < todo.length; i += 20) {
    const chunk = todo.slice(i, i + 20);
    const out = execFileSync(bin, chunk.map((hit) => imageOf(hit.doc, hit.page)), { encoding: 'utf8', maxBuffer: 1 << 26 });
    const blocks = out.split(/^=== /m).filter(Boolean);
    if (blocks.length !== chunk.length) die(`OCR の結果が ${blocks.length} 件（期待 ${chunk.length}）`);
    blocks.forEach((block, j) => writeFileSync(join(outDir, `${pageKey(chunk[j].doc, chunk[j].page)}.txt`), `${block.split('\n').slice(1).join('\n').trim()}\n`));
    console.log(`${TAG} OCR ${Math.min(i + 20, todo.length)}/${todo.length}`);
  }
  console.log(`${TAG} ✓ OCR 済み（${outDir}）`);
} else if (command === 'sheets') {
  const { hits } = scan();
  const outDir = join(WORK, 'batches');
  const pagesOut = join(WORK, 'pages');
  mkdirSync(outDir, { recursive: true });
  mkdirSync(pagesOut, { recursive: true });
  const index = [];
  for (let i = 0, n = 1; i < hits.length; i += args.size, n += 1) {
    const chunk = hits.slice(i, i + args.size);
    const name = `b${String(n).padStart(2, '0')}`;
    const lines = [`# 起こし直しの作業票 ${name}（${chunk.length} ページ）`, '', '手順: .tmp/standards-mojibake/WRITER.md', ''];
    for (const hit of chunk) {
      const key = pageKey(hit.doc, hit.page);
      lines.push(
        `## ${key}（${hit.doc.title} p${hit.page}）`, '',
        `- 画像: ${imageOf(hit.doc, hit.page)}`,
        `- OCR: ${join(WORK, 'ocr', `${key}.txt`)}`,
        `- 書き出し先（本文）: ${join(pagesOut, `${key}.txt`)}`,
        `- 書き出し先（注記・任意）: ${join(pagesOut, `${key}.note.txt`)}`, '',
      );
      index.push({ batch: name, key, agencyId: hit.doc.agencyId, documentId: hit.doc.documentId, page: hit.page });
    }
    writeFileSync(join(outDir, `${name}.md`), `${lines.join('\n')}\n`);
    console.log(`${name}: ${chunk.map((hit) => pageKey(hit.doc, hit.page)).join(' ')}`);
  }
  writeFileSync(join(WORK, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
} else if (command === 'validate') {
  const index = JSON.parse(readFileSync(join(WORK, 'index.json'), 'utf8')).filter((row) => !args.batch || row.batch === args.batch);
  if (!index.length) die('対象 0 ページ。検査不成立', 2);
  let bad = 0;
  for (const row of index) {
    const text = existsSync(join(WORK, 'pages', `${row.key}.txt`)) ? readFileSync(join(WORK, 'pages', `${row.key}.txt`), 'utf8') : null;
    const ocr = readFileSync(join(WORK, 'ocr', `${row.key}.txt`), 'utf8');
    const problems = [];
    if (text === null || !text.trim()) problems.push('起こした本文が無い');
    else {
      const m = measureMojibake(text);
      if (m.garbled) problems.push(`まだ文字化けの形（${m.sample}）`);
      if (/```|`{3,}/.test(text)) problems.push('本文にコードブロックの記号（```）がある');
      if (text.includes('�')) problems.push('U+FFFD がある');
      const s = similarity(text, ocr);
      // OCR は図の文字や読み順で揺れるので、閾値を下回っても理由を注記に書いてあれば通す（QA が画像で確かめる）
      const note = existsSync(join(WORK, 'pages', `${row.key}.note.txt`));
      if (s < args.minSimilarity && !note) problems.push(`OCR との一致が低い（${s.toFixed(2)}）。読み違いが無いか画像で確かめ、理由を .note.txt に書く`);
      if (!problems.length) console.log(`  ✓ ${row.key}（OCR との一致 ${s.toFixed(2)}）`);
    }
    if (problems.length) { bad += 1; console.log(`  ✗ ${row.key}: ${problems.join(' / ')}`); }
  }
  console.log(`${TAG} 対象 ${index.length} ページ / ✓ ${index.length - bad} / ✗ ${bad}`);
  if (bad) process.exit(1);
} else if (command === 'collect') {
  if (!args.batchName) die('--batch-name（visual-review.json に書く batch の名前）が要る');
  const index = JSON.parse(readFileSync(join(WORK, 'index.json'), 'utf8'));
  const byDoc = new Map();
  for (const row of index) {
    const text = readFileSync(join(WORK, 'pages', `${row.key}.txt`), 'utf8').replace(/\s+$/u, '');
    const notePath = join(WORK, 'pages', `${row.key}.note.txt`);
    const note = existsSync(notePath) ? readFileSync(notePath, 'utf8').trim() : '';
    const key = `${row.agencyId}/${row.documentId}`;
    if (!byDoc.has(key)) byDoc.set(key, []);
    byDoc.get(key).push({ page: row.page, text, note });
  }
  for (const [key, rows] of byDoc) {
    const doc = catalog().documents.find((d) => `${d.agencyId}/${d.documentId}` === key);
    const path = reviewPath(doc);
    const reviews = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
    for (const row of rows) {
      reviews[String(row.page)] = {
        status: 'visual-transcribed',
        batch: args.batchName,
        note: ['テキスト層の文字対応が壊れていて文字化けしていた（DN-0767）。ページ画像から起こし、macOS Vision の OCR と突き合わせ、別の QA が画像と照合', row.note].filter(Boolean).join('。'),
        text: row.text,
      };
    }
    const sorted = Object.fromEntries(Object.entries(reviews).sort(([a], [b]) => Number(a) - Number(b)));
    mkdirSync(join(CONTENT_SOURCES_ROOT, 'standards', doc.agencyId, doc.documentId), { recursive: true });
    writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`);
    console.log(`${TAG} ${key}: ${rows.length} ページを visual-review.json へ`);
  }
} else if (command === 'apply') {
  const cat = catalog();
  let replaced = 0;
  for (const doc of cat.documents) {
    const path = reviewPath(doc);
    if (!existsSync(path)) continue;
    const reviews = JSON.parse(readFileSync(path, 'utf8'));
    for (const part of doc.parts) {
      const file = join(LIBRARY_ROOT, part.file);
      let markdown = readFileSync(file, 'utf8');
      for (const page of splitLibraryPages(markdown)) {
        const review = reviews[String(page.page)];
        if (review?.status !== 'visual-transcribed' || !/DN-0767/.test(review.note ?? '')) continue;
        const fence = /`{3}/.test(review.text) ? '````' : '```';
        const block = `## PDF page ${page.page}\n\n<!-- extraction: visual-review; status: visual-transcribed; batch: ${review.batch} -->\n\n${fence}text\n${review.text}\n${fence}`;
        if (page.raw === block) continue;
        markdown = markdown.replace(page.raw, block);
        replaced += 1;
      }
      writeFileSync(file, markdown);
    }
    // 分冊のハッシュ・バイト数と、文書の目視ページ数・Markdown のバイト数を実体から数え直す
    let visual = 0;
    for (const part of doc.parts) {
      const buf = readFileSync(join(LIBRARY_ROOT, part.file));
      part.sha256 = sha256(buf);
      part.bytes = buf.length;
      visual += splitLibraryPages(buf.toString('utf8')).filter((page) => /extraction: visual-review/.test(page.marker)).length;
    }
    doc.markdownBytes = doc.parts.reduce((sum, part) => sum + part.bytes, 0);
    doc.visualReviewedPages = visual;
  }
  cat.totals.markdownBytes = cat.documents.reduce((sum, doc) => sum + doc.markdownBytes, 0);
  cat.totals.visualReviewedPages = cat.documents.reduce((sum, doc) => sum + doc.visualReviewedPages, 0);
  writeFileSync(CATALOG, `${JSON.stringify(cat, null, 2)}\n`);
  console.log(`${TAG} ✓ ${replaced} ページを書き換え、catalog の分冊ハッシュ・目視ページ数を実体から数え直した`);
} else if (command === 'check') {
  const { hits, pages } = scan();
  const mismatched = [];
  let parts = 0;
  for (const doc of catalog().documents) {
    for (const part of doc.parts) {
      parts += 1;
      const buf = readFileSync(join(LIBRARY_ROOT, part.file));
      if (sha256(buf) !== part.sha256 || buf.length !== part.bytes) mismatched.push(part.file);
    }
  }
  console.log(`${TAG} 全文ライブラリ ${pages} ページ・分冊 ${parts} を実検査 / 文字化け ${hits.length} ページ / catalog とハッシュが合わない分冊 ${mismatched.length}`);
  if (!pages || !parts) die('検査したページ・分冊が 0。検査不成立', 2);
  for (const hit of hits.slice(0, 20)) console.error(`  ✗ ${hit.doc.agencyId}/${hit.doc.documentId} p${hit.page}: 文字化け（範囲外の文字 ${hit.unexpected}/${hit.chars}）`);
  for (const file of mismatched.slice(0, 20)) console.error(`  ✗ ${file}: catalog の sha256・bytes と実体が違う（npm run standards-library-mojibake -- apply で数え直す）`);
  if (hits.length || mismatched.length) die(`文字化け ${hits.length} ページ・ハッシュ不一致 ${mismatched.length} 分冊`);
  console.log(`${TAG} ✓ 文字化け 0・catalog の分冊ハッシュは実体と一致`);
} else {
  die('使い方: standards-library-mojibake scan|ocr|sheets|validate|collect|apply|check');
}

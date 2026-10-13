#!/usr/bin/env node
/**
 * find-book-figure.mjs — 書籍の図（「図2.41」）が、どの書籍の PDF の何ページ（印字は何ページ）にあるかを書籍 OCR から引く（DN-0556）。
 * figure-crop-worker に切り出し直しの原典（PDF とページ）を渡すために、毎回 pdftotext と目で探していたのを 1 コマンドにする。
 *
 * Usage: node scripts/find-book-figure.mjs "図2.41" ["図2.42" …] [--book <書籍 id の一部>] [--json]
 *   OCR は Drive vault の 原資料PDF/書籍/<book>/ocr/*.md の「（図: 図X.Y 図名。…）」と直前のページ印 `<!-- p0122 印字:114 -->` から引く
 *   （OCR は市販書籍の図名を含み git に置けない）。--book は書籍フォルダ名に含まれる文字列で絞る。出力は常に JSON（worker に渡せる）。
 *   各クエリの status: found（1 件）/ multiple（複数の書籍・箇所に同じ図番号。--book で絞る）/ not-found
 *   pdf は書籍が 1 ファイルのときの原典（vault: パス）。複数ファイルの書籍は pdfCandidates に全部入れる（ページ印がどのファイルの p か OCR からは決まらない）
 * 終了コード: 0 = 全クエリが found か multiple / 1 = 引数不正・見つからないクエリがある / 2 = 検査不成立（Drive vault が無い・OCR を 1 冊も読めない）
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { isCliEntry } from './lib/cli-run.mjs';
import { resolveVaultRoot } from './lib/drive-vault.mjs';
import { figKey, parseOcrFigureEntries } from './lib/figure-references.mjs';
import { readJsonIf } from './lib/json-io.mjs';

/** 「図2.41」「2.41」「図 2．41」→ '2.41'。読めなければ null */
export function queryKey(q) {
  const m = String(q).match(/(\d+)\s*[.．]\s*(\d+)/);
  return m ? figKey(m[1], m[2]) : null;
}

/** vault の書籍フォルダ（ocr/ に .md があるもの）を列挙する */
export function loadBooks(vaultRoot, { book = null } = {}) {
  const base = join(vaultRoot, '原資料PDF', '書籍');
  if (!existsSync(base)) return [];
  const books = [];
  for (const dir of readdirSync(base).sort()) {
    if (book && !dir.includes(book)) continue;
    const ocrDir = join(base, dir, 'ocr');
    if (!existsSync(ocrDir)) continue;
    const files = readdirSync(ocrDir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
    if (files.length === 0) continue;
    const manifest = readJsonIf(join(base, dir), 'book-manifest.json');
    const pdfs = (manifest?.sourceFiles ?? []).map((s) => `vault:原資料PDF/書籍/${dir}/${s.path}`);
    books.push({ id: dir.split('__')[0], dir, pdfs, files: files.map((name) => ({ name, text: readFileSync(join(ocrDir, name), 'utf8') })) });
  }
  return books;
}

/** クエリごとに { query, key, status, matches } を返す */
export function findFigures(queries, books) {
  const index = new Map();
  for (const b of books) {
    for (const f of b.files) {
      for (const e of parseOcrFigureEntries(f.text)) {
        if (!index.has(e.key)) index.set(e.key, []);
        index.get(e.key).push({
          book: b.id, bookDir: b.dir, ocrFile: f.name, line: e.line,
          ...(b.pdfs.length === 1 ? { pdf: b.pdfs[0] } : { pdfCandidates: b.pdfs }),
          page: e.page, printedPage: e.printed, name: e.name, description: e.description,
        });
      }
    }
  }
  return queries.map((query) => {
    const key = queryKey(query);
    const matches = key ? index.get(key) ?? [] : [];
    return { query, key, status: !key || matches.length === 0 ? 'not-found' : matches.length === 1 ? 'found' : 'multiple', matches };
  });
}

export async function run(argv = process.argv.slice(2), { vaultRoot = undefined } = {}) {
  const flags = parseCliArgs({ book: { type: 'string' }, json: { type: 'boolean' } }, argv);
  const queries = flags._;
  if (queries.length === 0 || queries.some((q) => !queryKey(q))) {
    console.error('usage: find-book-figure.mjs "図2.41" ["図2.42" …] [--book <書籍名の一部>]（図番号は 図X.Y の形）');
    return 1;
  }
  let root = vaultRoot;
  if (root === undefined) {
    const v = resolveVaultRoot();
    if (!v.root) { console.error(`✗ 検査不成立: ${v.reason}`); return 2; }
    root = v.root;
  }
  const books = loadBooks(root, { book: flags.book });
  if (books.length === 0) { console.error(`✗ 検査不成立: 書籍 OCR を 1 冊も読めない（${flags.book ? `--book ${flags.book} に当たる ` : ''}原資料PDF/書籍/*/ocr/*.md が vault に無い）`); return 2; }
  const results = findFigures(queries, books);
  console.log(JSON.stringify({ booksSearched: books.length, results }, null, 2));
  const by = (s) => results.filter((r) => r.status === s).length;
  console.error(`[find-book-figure] 書籍 ${books.length} 冊の OCR を検索・クエリ ${results.length} 件（見つかった ${by('found')}・複数一致 ${by('multiple')}・見つからない ${by('not-found')}）`);
  return by('not-found') ? 1 : 0;
}

if (isCliEntry(import.meta.url)) {
  run().then((code) => { process.exitCode = code; }, (e) => { console.error(e?.stack || String(e)); process.exitCode = 1; });
}

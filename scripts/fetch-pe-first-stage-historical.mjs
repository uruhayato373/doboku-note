#!/usr/bin/env node
// 日本技術士会の平成23〜30年度PDFを一時領域へ取得し、固定SHA-256とページ数を検証する。
// 原典はgitへ入れず、OCR・目視突合の入力だけを再現可能にする。
// 固定した原典の一覧（URL・SHA-256・ページ数）は過去問の在庫台帳（data/pastexams/inventory.json）の
// pe-first-stage の files[]（sha256・pages を付けたもの）。別の設定ファイルには写さない。

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { datasetPath } from './lib/datasets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, '.tmp/pe1-historical-sources');

/** 令和・平成の年度ラベル（西暦 2011〜2018 → h23〜h30）。取得するのは平成23〜30年度 */
const heiseiKey = (year) => `h${year - 1988}`;
const SUBJECT_BY_SECTION = { '基礎科目': 'basic', '適性科目': 'aptitude', '専門科目 09 建設部門': 'construction' };

/**
 * 在庫台帳から固定した原典（sha256・pages を持つ pe-first-stage のファイル）を取り出す。
 * @returns {{ year: string, subject: string, file: string, url: string, sha256: string, pages: number }[]}
 */
export function historicalSources(inventory) {
  const years = inventory?.exams?.['pe-first-stage']?.years;
  if (!Array.isArray(years)) throw new Error('在庫台帳に pe-first-stage の years が無い');
  const sources = [];
  for (const y of years) {
    for (const f of y.files ?? []) {
      if (!f.sha256) continue;
      if (!f.sourceUrl || !Number.isInteger(f.pages)) throw new Error(`${y.year} ${f.file}: sha256 を持つのに sourceUrl か pages が無い`);
      if (f.kind === 'answer') {
        sources.push({ year: 'h23-h30', subject: 'answers', file: 'h23-h30-answers.pdf', url: f.sourceUrl, sha256: f.sha256, pages: f.pages });
        continue;
      }
      const part = /^専門科目 (\d{2})\b/u.exec(f.section ?? '')?.[1];
      const subject = SUBJECT_BY_SECTION[f.section] ?? (part ? `specialty-${part}` : null);
      if (!subject) throw new Error(`${y.year} ${f.file}: 科目を決められない（section=${f.section}）`);
      sources.push({ year: heiseiKey(y.year), subject, file: `${heiseiKey(y.year)}-${subject}.pdf`, url: f.sourceUrl, sha256: f.sha256, pages: f.pages });
    }
  }
  // 出力先のファイル名が重なると、片方がもう片方を黙って上書きして検証だけ通る
  const names = sources.map((s) => s.file);
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  if (dup.length) throw new Error(`出力ファイル名が重複している: ${[...new Set(dup)].join('・')}（科目の名前の付け方を足す）`);
  // 年度の古い順（合冊の正答は最後）。台帳は新しい年度が先なので並べ直す
  const order = (s) => (s.year === 'h23-h30' ? 'z' : s.year);
  return sources.sort((a, b) => order(a).localeCompare(order(b)));
}

async function main() {
  const requestedYear = process.argv.find((arg) => /^h(?:2[3-9]|30)$/u.test(arg));
  const inventory = JSON.parse(readFileSync(resolve(ROOT, datasetPath('pastexams.inventory')), 'utf8'));
  const all = historicalSources(inventory);
  if (all.length === 0) {
    console.error('[pe1-historical] 在庫台帳に sha256 を付けた原典が 1 件も無い（検査不成立）');
    process.exitCode = 2;
    return;
  }
  mkdirSync(OUT, { recursive: true });

  // 年度を指定したときはその年度の問題だけ（合冊の正答は全年度分の取得でだけ）
  const sources = all.filter((s) => (requestedYear ? s.year === requestedYear : true));

  let failed = 0;
  for (const source of sources) {
    const response = await fetch(source.url);
    if (!response.ok) throw new Error(`${source.file}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const isPdf = bytes.subarray(0, 5).toString('ascii') === '%PDF-';
    if (!isPdf || sha256 !== source.sha256) {
      console.error(`[FAIL] ${source.file}: pdf=${isPdf} sha256=${sha256}`);
      failed += 1;
      continue;
    }
    const destination = resolve(OUT, source.file);
    writeFileSync(destination, bytes);
    let pages = null;
    try {
      const info = execFileSync('pdfinfo', [destination], { encoding: 'utf8' });
      pages = Number(info.match(/^Pages:\s+(\d+)/mu)?.[1]);
    } catch {
      // pdfinfoが無い環境でもSHA検証は成立する。
    }
    if (pages !== null && pages !== source.pages) {
      console.error(`[FAIL] ${source.file}: pages=${pages} expected=${source.pages}`);
      failed += 1;
      continue;
    }
    console.log(`[PASS] ${source.year}/${source.subject}: ${source.file} sha256=${sha256.slice(0, 12)} pages=${pages ?? 'unchecked'}`);
  }

  console.log(`[pe1-historical] ${sources.length - failed}/${sources.length} verified -> ${OUT}`);
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

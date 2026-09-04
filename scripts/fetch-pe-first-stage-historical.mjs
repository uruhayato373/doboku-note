#!/usr/bin/env node
// 日本技術士会の平成25〜30年度PDFを一時領域へ取得し、固定SHA-256とページ数を検証する。
// 原典はgitへ入れず、OCR・目視突合の入力だけを再現可能にする。

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = resolve(ROOT, '.claude/config/pe-first-stage-historical-sources.json');
const OUT = resolve(ROOT, '.tmp/pe1-historical-sources');
const requestedYear = process.argv.find((arg) => /^h(?:2[5-9]|30)$/u.test(arg));
const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
mkdirSync(OUT, { recursive: true });

const sources = [];
for (const [year, subjects] of Object.entries(config.years)) {
  if (requestedYear && year !== requestedYear) continue;
  for (const [subject, source] of Object.entries(subjects)) sources.push({ year, subject, ...source });
}
if (!requestedYear) sources.push({ year: 'h23-h30', subject: 'answers', ...config.answerSource });

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
if (failed) process.exit(1);

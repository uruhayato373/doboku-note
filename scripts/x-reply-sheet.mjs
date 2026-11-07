#!/usr/bin/env node
/**
 * x-reply-sheet.mjs
 *
 * 返信の下書きから確認画面を作る。入力は .tmp/x-outreach/round.json、出力は同じ場所の index.html。
 * round.json の形: { items: [{ id, user, url, kind, dept, why, check, text }] }
 * 候補の件数は candidates.json から読む。どちらも個人の投稿を含むので Git に入れない。
 *
 * exit: 0 作成 / 1 下書きが無い
 * Usage: npm run x-reply-sheet
 */
import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './lib/json-io.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const DIR = path.join(REPO_ROOT, '.tmp', 'x-outreach');
const ROUND = path.join(DIR, 'round.json');
const CANDIDATES = path.join(DIR, 'candidates.json');
const TEMPLATE = path.join(REPO_ROOT, 'scripts', 'assets', 'x-reply-sheet.html');

if (!fs.existsSync(ROUND)) {
  console.error(`下書きがありません: ${path.relative(REPO_ROOT, ROUND)}`);
  process.exitCode = 1;
} else {
  const round = readJson(REPO_ROOT, path.relative(REPO_ROOT, ROUND));
  const collected = fs.existsSync(CANDIDATES) ? readJson(REPO_ROOT, path.relative(REPO_ROOT, CANDIDATES)) : {};
  const data = { collectedAt: collected.collectedAt ?? new Date().toISOString(), counts: collected.counts ?? {}, items: round.items };
  const json = JSON.stringify(data).replaceAll('<', '\\u003c');
  const html = fs.readFileSync(TEMPLATE, 'utf8').replace('__DATA__', () => json);
  fs.writeFileSync(path.join(DIR, 'index.html'), html);
  console.log(`確認画面を作りました（${round.items.length} 件）: .tmp/x-outreach/index.html`);
}

#!/usr/bin/env node
/**
 * note-meta-to-txt.mjs
 * _meta.yaml を SoT 一本化先の note掲載文.txt（機械ブロック付き正準形）へ変換する移行ツール。
 * 既に note掲載文.txt があるディレクトリはスキップ（既存は価格散文フォールバックで機械パース可）。
 * 文字数超過は警告のみ（自動トリムしない＝note-meta-lint で人手是正）。_meta.yaml の削除は別手順。
 *
 *   npm run note-meta-to-txt            # _metaのみのdirを一括変換（dry-run表示）
 *   npm run note-meta-to-txt -- --write # 実際に note掲載文.txt を書き出す
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { glob } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { generateNoteText, checkLimits } from './lib/note-meta.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

function blockScalar(lines, key) {
  let i = lines.findIndex((l) => new RegExp('^' + key + ':\\s*\\|\\s*$').test(l));
  if (i < 0) return '';
  const out = [];
  for (i = i + 1; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.trim() === '') { out.push(''); continue; }
    if (/^\s{2,}/.test(ln)) out.push(ln.replace(/^ {2}/, '')); else break;
  }
  return out.join('\n').replace(/\n+$/, '').trim();
}

function pricePremise(setPrice, articlePrice) {
  if (!setPrice || setPrice === '0') return '無料';
  if (articlePrice) return `単品 ¥${articlePrice}／セット ¥${Number(setPrice).toLocaleString()}`;
  return `¥${Number(setPrice).toLocaleString()}`;
}

const metas = [];
for await (const f of glob('content/note/**/_meta.yaml', { cwd: ROOT })) metas.push(f);
metas.sort();

let done = 0, skipped = 0, warned = 0;
for (const rel of metas) {
  const dir = dirname(join(ROOT, rel));
  const txtPath = join(dir, 'note掲載文.txt');
  const name = rel.split(/[\\/]/).slice(-2, -1)[0];
  if (existsSync(txtPath)) { skipped++; continue; }
  const meta = readFileSync(join(ROOT, rel), 'utf-8');
  const lines = meta.split(/\r?\n/);
  const title = (lines.find((l) => /^title:/.test(l)) || '').match(/"(.+)"/)?.[1] || '';
  const description = blockScalar(lines, 'description');
  const appealPoint = blockScalar(lines, 'appealPoint');
  const setPrice = (meta.match(/^setPrice:\s*(\d+)/m) || [])[1] || '';
  const articlePrice = (meta.match(/^articlePrice:\s*(\d+)/m) || [])[1] || '';
  const subtitle = name.replace(/^[^-]*-/, '').replace(/-/g, ' ');
  const m = { subtitle, title, price: pricePremise(setPrice, articlePrice), description, appealPoint, setPrice, articlePrice };
  const v = checkLimits(m);
  const txt = generateNoteText(m);
  const flag = v.length ? `  ⚠ ${v.join(' / ')}` : '';
  if (v.length) warned++;
  console.log(`${WRITE ? '書込' : 'dry'}: ${name}  (T${title.length} set¥${setPrice} art¥${articlePrice || '-'})${flag}`);
  if (WRITE) writeFileSync(txtPath, txt, 'utf-8');
  done++;
}
console.log(`\n変換対象 ${done} / スキップ(既存txt) ${skipped} / 文字数要是正 ${warned}`);
console.log(WRITE ? '書き出し完了。note-meta-lint で再検査 → _meta.yaml 削除へ。' : '※ --write で実書き出し');

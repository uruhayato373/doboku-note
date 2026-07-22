#!/usr/bin/env node
/**
 * note-price-sweep.mjs
 * ---------------------------------------------------------------------------
 * 1マガジン分の記事 frontmatter `price:` を一括スイープする（note 公開前の単品価格設定）。
 * note 公開パイプライン Step1（価格スイープ）の確立済みツール。BK マガジンは梱包時 `price: 1980`
 * で生成されるため、公開前に単品価格（既定 ¥500）へ揃える。
 *
 * 設計: frontmatter の price 行のみを行内置換（**CRLF 保持**）。本文・他フィールドは不変。
 *   既定 dry（変更プレビュー）／--commit で実書き込み。書き込み後は `git add <dir>` → commit は呼び側。
 *
 * 使い方:
 *   node scripts/note-price-sweep.mjs --dir <magazineDir>                    # dry（対象と変更件数）
 *   node scripts/note-price-sweep.mjs --dir <magazineDir> --commit           # 実書き込み（既定 1980→500）
 *   node scripts/note-price-sweep.mjs --dir <magazineDir> --from 1980 --to 500 --commit
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const getArg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const DIR = getArg('--dir');
const FROM = getArg('--from', '1980');
const TO = getArg('--to', '500');
const COMMIT = argv.includes('--commit');
if (!DIR) { console.error('--dir <magazineDir> required'); process.exit(1); }
const abs = join(ROOT, DIR);
if (!existsSync(abs)) { console.error('dir not found: ' + abs); process.exit(1); }

// 再帰 walk（globSync は Node22+ のため使わない）。article.md と型別 article-<type>.md の両方を対象。
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/^article(-[^/]+)?\.md$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = walk(abs);
const re = new RegExp(`^(price:[ \\t]*)${FROM}\\b`, 'm');
let hit = 0;
for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  if (!re.test(raw)) continue;
  hit++;
  if (COMMIT) writeFileSync(f, raw.replace(re, `$1${TO}`));
}
console.log(`[note-price-sweep] ${DIR}: ${files.length} article / price ${FROM}→${TO} 対象 ${hit} 件 ${COMMIT ? '（書込済）' : '（dry・--commit で書込）'}`);
process.exit(0);

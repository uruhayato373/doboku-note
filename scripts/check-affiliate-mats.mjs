#!/usr/bin/env node
// アフィリエイト A8 mat の整合ゲート。
//
// 背景: GKS 等の転職 mat は本文インライン `<CareerAffiliate href>` で約 90 MDX に直書きされる。
// mat 変更時の取りこぼし・タイポ・未申告の新規 mat が
// 機械検知されないため（既存 check-* にアフィリ用は無かった）、SSOT 許可リスト
// src/config/affiliate-mats.json と src/** ・ content/site/** の a8mat= を突合する。
//
// 判定:
//   - 許可リストに無い mat が出現 → ERROR（exit 1）。タイポ or 未申告の新規案件。
//   - expiresAt が過去日の mat が src/MDX に出現 → WARN（exit 0）。失効 creative の配置放置リマインド。
//   - プレースホルダ（XXXX 等、A8 mat 形式 "AAAA+BBBB+CCCC+DDDD" に合致しない）→ 無視。
//
// 使い方:
//   node scripts/check-affiliate-mats.mjs            # src/ + content/site 全体
//   node scripts/check-affiliate-mats.mjs --staged   # git staged の該当ファイルのみ（pre-commit 用）

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { todayJst } from './lib/jst-date.mjs';

const STAGED = process.argv.includes('--staged');
const REGISTRY = 'src/config/affiliate-mats.json';

if (!existsSync(REGISTRY)) {
  console.error(`[check-affiliate-mats] ${REGISTRY} が無いため検証をスキップ`);
  process.exit(0);
}

const registry = JSON.parse(readFileSync(REGISTRY, 'utf8')).mats;
const known = new Map(registry.map((m) => [m.mat, m]));
const today = todayJst(); // YYYY-MM-DD

// A8 mat 形式: 英数を + で 4 連結（例 4B3VR8+F0LMU2+4R40+TSBE9）。XXXX 等の単一トークンは除外。
const MAT_RE = /a8mat=([A-Z0-9]+(?:\+[A-Z0-9]+){3})/g;
const SCAN_DIRS = ['src', 'content/site'];
const SCAN_EXT = /\.(ts|tsx|mjs|mts|js|jsx|md|mdx|json)$/;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (SCAN_EXT.test(e)) out.push(p.split('\\').join('/'));
  }
  return out;
}

let files;
if (STAGED) {
  const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
    encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  files = staged.filter(
    (f) => existsSync(f) && SCAN_EXT.test(f) && SCAN_DIRS.some((d) => f.startsWith(d + '/')),
  );
} else {
  files = SCAN_DIRS.flatMap((d) => walk(d));
}

const unknown = []; // { file, mat }  src/ で許可リスト外
const mdxRaw = []; // { file, mat }  content/site に生 mat 直書き（禁止）
const expiredHits = new Set(); // mat
const seenKnown = new Set();

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const isMdx = file.startsWith('content/site');
  for (const m of text.matchAll(MAT_RE)) {
    const mat = m[1];
    // MDX 本文に生 mat 直書きは禁止（preset コンポーネント経由のみ）。既知/未知を問わず ERROR。
    if (isMdx) mdxRaw.push({ file, mat });
    if (known.has(mat)) {
      seenKnown.add(mat);
      const entry = known.get(mat);
      if (entry.expiresAt && entry.expiresAt < today) expiredHits.add(mat);
    } else if (!isMdx) {
      unknown.push({ file, mat });
    }
  }
}

// レポート
if (expiredHits.size > 0) {
  console.warn('[check-affiliate-mats] ⚠ 期限切れ(expiresAt 経過)の mat が配置されています:');
  for (const mat of expiredHits) {
    const e = known.get(mat);
    console.warn(`  - ${mat} (${e.label}) expiresAt=${e.expiresAt}${e.note ? ' … ' + e.note : ''}`);
  }
}

if (mdxRaw.length > 0) {
  console.error(
    `[check-affiliate-mats] ✗ MDX 本文(content/site)に生 a8mat 直書きが ${mdxRaw.length} 件あります（禁止）:`,
  );
  for (const u of mdxRaw) console.error(`  - ${u.mat}  (${u.file})`);
  console.error(
    '  → MDX は preset コンポーネント経由にする（CareerAffiliate href / サイドバーは SidebarAdBanner）。',
  );
}

if (unknown.length > 0) {
  console.error(
    `[check-affiliate-mats] ✗ 許可リスト(${REGISTRY})に無い mat が ${unknown.length} 件見つかりました:`,
  );
  for (const u of unknown) console.error(`  - ${u.mat}  (${u.file})`);
  console.error(
    '  → 正規の新規案件なら affiliate-mats.json に追加、タイポなら mat を修正してください。',
  );
}

if (mdxRaw.length > 0 || unknown.length > 0) {
  process.exit(1);
}

const scope = STAGED ? 'staged' : `${files.length} ファイル`;
console.log(
  `[check-affiliate-mats] ✓ ${scope} の a8mat は全て許可リストに存在（既知 ${seenKnown.size}/${known.size} 種が出現）`,
);
process.exit(0);

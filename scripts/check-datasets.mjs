#!/usr/bin/env node
/**
 * check-datasets.mjs — 設定（config/）と記録（data/）の台帳（scripts/lib/datasets.mjs）と実物の整合を検査する。
 *
 *   1. git 管理下の config/・data/ の全ファイルが、ちょうど 1 つのデータセットに当たる（未宣言・重なりは違反）
 *   2. 宣言したデータセットにファイルがある（手元だけ local・未着手 planned を除く）。local に git 管理のファイルは無い
 *      （planned に CI のボットが初めて書いたときは警告だけにする。無関係な PR を赤くしない）
 *   3. id・種類・領域が正しい（id の重複・KINDS に無い種類・domains.json に無い領域は違反）
 *   4. 型（zod）のあるデータセットは、全ファイルが型に合う
 * 検査したファイル数を出し、1 件も読めなければ検査不成立（exit 2）。違反は exit 1。
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AREAS, DATASETS, KINDS, listAreaFiles, matchFiles, validateFiles } from './lib/datasets.mjs';
import { loadDomains } from './lib/domains.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

const files = Object.keys(AREAS).flatMap((area) => listAreaFiles(ROOT, area, { tracked: true }));
const { byId, unmatched, ambiguous } = matchFiles(files);
for (const f of unmatched) errors.push(`${f}: 台帳（scripts/lib/datasets.mjs）に当たるデータセットが無い`);
for (const a of ambiguous) errors.push(`${a.file}: 複数のデータセットに当たる（${a.ids.join('・')}）`);

const domainIds = new Set(loadDomains(ROOT).domains.map((d) => d.id));
const seen = new Set();
for (const x of DATASETS) {
  if (seen.has(x.id)) errors.push(`${x.id}: id が重複している`);
  seen.add(x.id);
  if (!/^[a-z0-9]+(\.[a-z0-9-]+)+$/.test(x.id)) errors.push(`${x.id}: id は「取得元.データセット」（英小文字・数字・ハイフン）`);
  if (!(x.kind in KINDS)) errors.push(`${x.id}: 種類 ${x.kind} は KINDS に無い`);
  if (!domainIds.has(x.domain)) errors.push(`${x.id}: 領域 ${x.domain} は domains.json に無い`);
  const n = byId.get(x.id)?.length ?? 0;
  if (x.local && n > 0) errors.push(`${x.id}: 手元だけ（local）のはずが git 管理に ${n} ファイルある（.gitignore を確かめる）`);
  if (x.planned && n > 0) warnings.push(`${x.id}: ファイルが入ったので planned を外してよい`);
  if (!x.local && !x.planned && n === 0) errors.push(`${x.id}: 宣言だけでファイルが無い（${x.path}）`);
}

let validated = 0;
const typed = DATASETS.filter((x) => x.schema);
for (const x of typed) {
  const r = validateFiles(ROOT, x, byId.get(x.id) ?? []);
  validated += r.checked;
  for (const e of r.errors) errors.push(`${e.file}: 型（${x.id}）に合わない — ${e.message}`);
}

const count = (pred) => DATASETS.filter(pred).length;
console.log(
  `[check-datasets] 設定とデータ ${files.length} ファイル / データセット ${DATASETS.length}（型あり ${typed.length}・手元だけ ${count((x) => x.local)}・未着手 ${count((x) => x.planned)}）を実検査 / 型の検査 ${validated} ファイル / 違反 ${errors.length} 件`,
);
if (files.length === 0) {
  console.error('✗ 検査不成立: config/・data/ のファイルを 1 件も読めなかった');
  process.exit(2);
}
for (const w of warnings) console.log(`  ! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('[check-datasets] ✓ 台帳と実物は整合（全ファイルがちょうど 1 つのデータセットに当たり、型のあるものは型に合う）');

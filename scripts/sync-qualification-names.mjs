#!/usr/bin/env node
/**
 * sync-qualification-names.mjs — registry（qualification-registry.json）の正式名を、名前を書き込んで使うファイル
 * （src/config/categories.json・home-exam-cards.json・tags.json の資格の項目）へ書く。
 *
 *   npm run sync-qualification-names            # 書き換える
 *   npm run sync-qualification-names -- --check # 食い違いがあれば exit 1（書かない）
 *
 * 書き込み先と照合の実装は scripts/lib/qualification-ssot.mjs の DERIVED_FILES / syncDerivedNames（check-qualification-ssot と同じ）。
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DERIVED_FILES, syncDerivedNames } from './lib/qualification-ssot.mjs';
import { loadRegistry } from './lib/qualification-registry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const diffs = syncDerivedNames(ROOT, loadRegistry(ROOT), { write: !check });
const P = '[sync-qualification-names]';
console.log(`${P} 書き込み先 ${DERIVED_FILES.length} ファイルを照合 / registry と違う項目 ${diffs.length} 件${check ? '' : '（書き換えた）'}`);
for (const d of diffs) console.log(`${P} ${d.file} ${d.slug}: 「${d.current}」→「${d.want}」`);
if (check && diffs.length) process.exitCode = 1;

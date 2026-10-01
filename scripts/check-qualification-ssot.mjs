#!/usr/bin/env node
/**
 * check-qualification-ssot.mjs — 資格の名前・並び順が qualification-registry.json だけにあるかを検査する。
 *
 *   node scripts/check-qualification-ssot.mjs          # 違反があれば exit 1
 *   node scripts/check-qualification-ssot.mjs --json   # 管理画面・他スクリプト向け
 *
 * 設定（.claude/config・.claude/knowledge・src/config の JSON）の写し、書き込み先（DERIVED_FILES）と registry の食い違い、
 * コードの資格 id（または別名）→ 日本語の対応表を 1 件でも見つけたら止める。判定は scripts/lib/qualification-ssot.mjs。
 * 検査した件数を必ず出し、0 件なら検査不成立（exit 1）にする（CLAUDE.md §9）。
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditQualificationSsot, ALLOW_PATH, ALLOW_MARKER } from './lib/qualification-ssot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const r = auditQualificationSsot(ROOT);
const failed = r.config.violations.length + r.derived.diffs.length + r.code.hits.length;
const empty = r.config.files === 0 || r.code.files === 0;

if (process.argv.includes('--json')) {
  const { registry, ...rest } = r;
  process.stdout.write(`${JSON.stringify({ ...rest, qualifications: registry.qualifications.length }, null, 2)}\n`);
  process.exitCode = failed || empty ? 1 : 0;
} else {
  const P = '[check-qualification-ssot]';
  console.log(`${P} 資格 ${r.registry.qualifications.length} 件・照合する id ${r.ids.length} 種（別名 ${r.aliases.length}）/ 設定 ${r.config.files}・書き込み先 ${r.derived.files}・コード ${r.code.files} ファイルを実検査`);
  console.log(`${P} 設定の写し ${r.config.violations.length} 件（許可 ${r.config.allowed.length} 件＝${ALLOW_PATH}）/ 書き込み先の食い違い ${r.derived.diffs.length} 件 / コードの対応表 ${r.code.hits.length} 件`);
  for (const v of r.config.violations) console.error(`${P} ✗ ${v.file} ${v.path} — 名前を消して qualification:（registry の資格 id か group id）で指す`);
  for (const d of r.derived.diffs) console.error(`${P} ✗ ${d.file} ${d.slug}: 「${d.current}」≠ registry「${d.want}」— npm run sync-qualification-names`);
  for (const h of r.code.hits) console.error(`${P} ✗ ${h.file}:${h.line} ${h.text} — 名前は qualification-names.mjs（サイトは src/lib/qualification-names.ts）で引く。資格名でない日本語なら行末か直前の行に「${ALLOW_MARKER} <理由>」`);
  if (empty) {
    console.error(`${P} 検査不成立: 対象ファイルが 0 件`);
    process.exitCode = 1;
  } else if (failed) {
    process.exitCode = 1;
  } else {
    console.log(`${P} ✓ 資格の名前は registry だけにある（写し・食い違い・直書き 0 件）`);
  }
}

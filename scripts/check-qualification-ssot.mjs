#!/usr/bin/env node
/**
 * check-qualification-ssot.mjs — 資格の名前・並び順が qualification-registry.json だけにあるかを検査する。
 *
 *   node scripts/check-qualification-ssot.mjs          # 違反があれば exit 1
 *   node scripts/check-qualification-ssot.mjs --json   # 管理画面・他スクリプト向け
 *
 * 設定（.claude/config/**.json）に資格名の写しがある、またはコードの資格 id → 日本語の対応表が
 * 基準（qualification-ssot-baseline.json）より増えたら止める。判定は scripts/lib/qualification-ssot.mjs。
 * 検査した件数を必ず出し、0 件なら検査不成立（exit 1）にする（CLAUDE.md §9）。
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditQualificationSsot, ALLOW_PATH, BASELINE_PATH } from './lib/qualification-ssot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const r = auditQualificationSsot(ROOT);

if (process.argv.includes('--json')) {
  const { registry, ...rest } = r;
  process.stdout.write(`${JSON.stringify({ ...rest, qualifications: registry.qualifications.length }, null, 2)}\n`);
  process.exitCode = r.config.violations.length || r.code.over.length ? 1 : 0;
} else {
  const P = '[check-qualification-ssot]';
  const debt = Object.values(r.code.counts).reduce((a, b) => a + b, 0);
  console.log(`${P} 資格 ${r.registry.qualifications.length} 件・ファミリー含む id ${r.ids.length} 種 / 設定 ${r.config.files} ファイル・コード ${r.code.files} ファイルを実検査`);
  console.log(`${P} 設定: 写し ${r.config.violations.length} 件（許可 ${r.config.allowed.length} 件＝${ALLOW_PATH}）/ コード: 対応表 ${debt} 件・${Object.keys(r.code.counts).length} ファイル（基準 ${BASELINE_PATH}）`);
  for (const v of r.config.violations) console.error(`${P} ✗ ${v.file} ${v.path} — 資格の名前は qualification-registry.json から引く（id だけを書く）`);
  for (const o of r.code.over) console.error(`${P} ✗ ${o.file} 資格 id → 日本語の対応表 ${o.count} 件（基準 ${o.baseline}）— 名前は qualification-registry.mjs の qualificationLabel / qualificationShortLabel で引く`);
  for (const u of r.code.under) console.log(`${P} ↓ ${u.file} ${u.baseline} → ${u.count} 件。${BASELINE_PATH} の件数を下げる`);
  if (r.config.files === 0 || r.code.files === 0) {
    console.error(`${P} 検査不成立: 対象ファイルが 0 件`);
    process.exitCode = 1;
  } else if (r.config.violations.length || r.code.over.length) {
    process.exitCode = 1;
  } else {
    console.log(`${P} ✓ 資格の名前は registry だけにある（既存の負債は基準以下）`);
  }
}

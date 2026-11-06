#!/usr/bin/env node
/**
 * 資格ごとの競合の立ち位置（台帳 config.competitor-positions）を実データと照合する（外部通信なし）。
 * 市場の検索で目立つ相手の見落とし・空きの主張の崩れ・文章への観測値の写し・年間の枠の参照切れを止める。
 * exit: 0 違反なし / 1 違反あり / 2 検査不成立（立ち位置または市場の検索が 0 件）
 */
import { parseCliArgs } from './lib/cli-args.mjs';
import { loadCompetitorPositionsAudit } from './lib/competitor-positions.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const args = parseCliArgs({ json: { type: 'boolean' } });
const { audit, planAudit, market } = loadCompetitorPositionsAudit(REPO_ROOT);
const errors = [...audit.errors, ...planAudit.errors];
const pending = [...audit.pending, ...planAudit.pending];

if (args.json) console.log(JSON.stringify({ ...audit, stanceIds: [...audit.stanceIds], errors, pending }, null, 2));
else {
  const held = audit.probes.filter((p) => p.ok).length;
  console.log(`check-competitor-positions: 立ち位置 ${audit.positions} / 主張の確認 ${audit.probes.length}（成立 ${held}）/ 検索の項目 ${audit.probes.reduce((n, p) => n + p.checked, 0)}`);
  for (const line of errors) console.error(`  違反: ${line}`);
  for (const line of audit.warnings) console.log(`  要対応: ${line}`);
  for (const line of pending) console.log(`  判断待ち: ${line}`);
}
if (!market || audit.positions === 0) process.exitCode = 2;
else if (errors.length) process.exitCode = 1;

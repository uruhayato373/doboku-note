#!/usr/bin/env node
/**
 * check-issue-map.mjs — 事業イシューマップ（config/issue-map.json）のファイルをまたぐ整合を見る。
 * 指標 id が business-direction.json に、DN が backlog か dispatch-log の完了に、競合が competitors.json にあること。
 * --due: 週次レビューが読む「更新の番の判定」（カードが閉じた・時期を過ぎた）を出す。残すものはレポートの「## イシューマップ」に
 * 同じ見出し（overall A1・A2 の形）と行き先を書く。放置は check-weekly-review が止める。
 * exit 0＝整合／1＝不整合か検査不成立（検査対象 0 件）
 */
import { parseCliArgs } from './lib/cli-args.mjs';
import { dueJudgments, issueMapProblems } from './lib/issue-map.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const { due } = parseCliArgs({ due: { type: 'boolean' } });
const { doc, index, problems, checked } = issueMapProblems(ROOT);

console.log(`[check-issue-map] マップ ${checked.maps} / サブイシュー ${checked.leaves} / 指標の参照 ${checked.metrics} / DN の参照 ${checked.dns} / 競合の参照 ${checked.competitors} を検査 / 不整合 ${problems.length} 件`);
for (const p of problems) console.log(`  ✗ ${p}`);

if (due) {
  const rows = dueJudgments(doc, index, todayJst());
  console.log(`[check-issue-map] 更新の番の判定 ${rows.length} 件`);
  for (const r of rows) console.log(`  - ${r.key}: ${r.reason} — ${r.picture}`);
}

if (checked.leaves === 0 || checked.metrics === 0 || checked.dns === 0) {
  console.error('[check-issue-map] 検査対象が 0 件（検査不成立）');
  process.exitCode = 1;
} else if (problems.length) {
  process.exitCode = 1;
}

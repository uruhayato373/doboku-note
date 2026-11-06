#!/usr/bin/env node
/**
 * X・Instagram の年間の枠と実体を照合する（外部通信なし）。YouTube は check-youtube-plan。
 * 計画にない投稿・枠の超過・販売の超過・週の上限超え・時期の外を止める。
 * exit: 0 違反なし / 1 違反あり / 2 検査不成立（枠 0 件）
 */
import { parseCliArgs } from './lib/cli-args.mjs';
import { loadChannelPlanAudit } from './lib/channel-plan.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const args = parseCliArgs({ json: { type: 'boolean' } });
const { x, instagram, youtubeMetrics } = loadChannelPlanAudit(REPO_ROOT);
const audits = [['X', x], ['Instagram', instagram]];

if (args.json) console.log(JSON.stringify({ x, instagram, youtubeMetrics }, null, 2));
else for (const [label, a] of audits) {
  console.log(`check-channel-plan ${label}: 枠 ${a.slots} / 枠の本数 ${a.planned} / 週の上限の合計 ${a.capacity} / 対象 ${a.targets} 本 / 照合 ${a.checked} 本 / 違反 ${a.errors.length} 件 / 要対応 ${a.warnings.length} 件 / 判断待ち ${a.pending.length} 件`);
  if (a.targets === 0) console.log('  投稿の照合は 0 本（枠の検査の開始日より後の投稿がまだ無い）。枠そのものの検査だけが動いた');
  for (const line of a.errors) console.error(`  違反: ${line}`);
  for (const line of a.warnings) console.log(`  要対応: ${line}`);
  for (const line of a.pending) console.log(`  判断待ち: ${line}`);
}
if (!args.json) {
  for (const line of youtubeMetrics.errors) console.error(`  違反: ${line}`);
  for (const line of youtubeMetrics.warnings) console.log(`  要対応: ${line}`);
  for (const line of youtubeMetrics.pending) console.log(`  判断待ち: ${line}`);
}
if (audits.some(([, a]) => a.slots === 0)) process.exitCode = 2;
else if (audits.some(([, a]) => a.errors.length) || youtubeMetrics.errors.length) process.exitCode = 1;

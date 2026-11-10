#!/usr/bin/env node
/**
 * 通常動画の年間の枠と公開台帳を照合する（外部通信なし）。
 * 計画にない動画・枠の超過・週の上限超え・時期の外を止める。
 * exit: 0 違反なし / 1 違反あり / 2 検査不成立（対象 0 件）
 * --inventory で資格×型×状態の棚卸しを出す。--json で結果をそのまま出す。
 * --due は台本待ち・内容QAで止まった行の確認期限（ready）の超過だけを見て、あれば exit 1（週次の ops・DN-1069）。
 */
import { parseCliArgs } from './lib/cli-args.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { scriptQueue } from './lib/youtube-longform-audit.mjs';
import { loadPlanAudit } from './lib/youtube-longform-plan.mjs';

const args = parseCliArgs({ inventory: { type: 'boolean' }, json: { type: 'boolean' }, due: { type: 'boolean' } });
const { plan, audit, inventory, publications } = loadPlanAudit(REPO_ROOT);

// --due は台本待ち・内容QAで止まった行のうち確認期限（ready）を過ぎたものだけを見る。壁時計に依存するので週次の ops（DN-1069）
if (args.due) {
  const queue = scriptQueue(plan, publications);
  const overdue = queue.filter((r) => r.overdue);
  console.log(`check-youtube-plan --due: 台本待ち ${queue.filter((r) => r.state === 'script').length} 本・QA で停止 ${queue.filter((r) => r.state === 'qa-blocked').length} 本を検査 / 確認期限の超過 ${overdue.length} 本`);
  for (const r of overdue) console.log(`  [超過] ${r.id}（${r.state === 'script' ? '台本待ち' : 'QA で停止'}）ready ${r.ready}・公開目標 ${r.target}：${r.title}`);
  process.exit(plan.entries.length === 0 ? 2 : overdue.length ? 1 : 0);
}

if (args.json) console.log(JSON.stringify({ audit, inventory }, null, 2));
else {
  console.log(`check-youtube-plan: 対象 ${audit.targets} 本 / 照合 ${audit.checked} 本 / 枠 ${audit.slots} / 枠の本数 ${audit.planned} / 週の上限の合計 ${audit.capacity} / 違反 ${audit.errors.length} 件 / 要対応 ${audit.warnings.length} 件 / 採否待ち ${audit.pending.length} 枠`);
  for (const line of audit.errors) console.error(`  違反: ${line}`);
  for (const line of audit.warnings) console.log(`  要対応: ${line}`);
  for (const line of audit.pending) console.log(`  採否待ち: ${line}`);
  if (args.inventory) {
    console.log('資格\t型\t公開済み\t予約済み\t在庫\t未制作\t停止');
    for (const r of inventory) console.log([r.exam, r.type, r.published, r.scheduled, r.stock, r.unbuilt, r.stopped].join('\t'));
  }
}
// 計画の作り直し中だけ、対象 0 本を認める。期限を過ぎたら検査不成立に戻す
const { rebuildUntil } = plan.cycle;
if (audit.targets === 0 && rebuildUntil && todayJst() <= rebuildUntil) console.log(`  判断待ち: 計画の作り直し中（期限 ${rebuildUntil}）。動画の行はまだ無い`);
else if (audit.targets === 0) process.exitCode = 2;
else if (audit.errors.length) process.exitCode = 1;

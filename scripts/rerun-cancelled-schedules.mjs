#!/usr/bin/env node
/**
 * rerun-cancelled-schedules.mjs — 共通の concurrency group で待機中に取り消された定期実行を再実行する（DN-0750）
 * ---------------------------------------------------------------------------
 * develop へ書き込むワークフローは `group: develop-git-write` を共有している。GitHub は同じ group の
 * 待機中の run を 1 件しか残さないので、新しい run が並ぶと古い待機分はジョブが始まらないまま cancelled になる。
 * 2026-10-09 の gsc-auto-review はこれで週次の記録が 1 回欠け、check-workflow-health が 13 日後に赤で気づいた。
 * 判定は scripts/lib/cancelled-schedule-runs.mjs。再実行した run もまた同じ group に並ぶ。
 *
 * CLI:
 *   node scripts/rerun-cancelled-schedules.mjs            # 下見（再実行しない）
 *   node scripts/rerun-cancelled-schedules.mjs --commit   # 再実行する（.github/workflows/rerun-cancelled-schedules.yml）
 *   node scripts/rerun-cancelled-schedules.mjs --lookback-hours 48
 * exit: 0 = 検査できた（再実行 0 件も含む）/ 1 = 再実行に失敗 / 2 = 検査不成立（対象 0 本・run を 1 本も取れない）
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isSharedGroupSchedule, selectRerunTargets } from './lib/cancelled-schedule-runs.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const TAG = '[rerun-cancelled-schedules]';
const args = parseCliArgs({ commit: { type: 'boolean' }, 'lookback-hours': { type: 'number', default: 30 } });
const COMMIT = args.commit;
const LOOKBACK = args.lookbackHours;

const gh = (ghArgs) => execFileSync('gh', ghArgs, { cwd: ROOT, encoding: 'utf8', timeout: 60_000, maxBuffer: 32 * 1024 * 1024 });

const dir = join(ROOT, '.github/workflows');
const workflows = readdirSync(dir).filter((f) => f.endsWith('.yml') && isSharedGroupSchedule(readFileSync(join(dir, f), 'utf8')));
if (workflows.length === 0) { console.error(`${TAG} 共通 group の定期ワークフローが 0 本。検査不成立`); process.exit(2); }

let inspected = 0, failedReads = 0, reran = 0, rerunFailures = 0;
for (const wf of workflows) {
  let runs;
  try { runs = JSON.parse(gh(['run', 'list', '--workflow', wf, '--limit', '10', '--json', 'databaseId,event,conclusion,status,attempt,createdAt'])); }
  catch (err) { failedReads++; console.error(`${TAG} ${wf}: run を取れない（${String(err.message).slice(0, 80)}）`); continue; }
  inspected++;
  // ジョブ数は取り消された定期実行の候補だけ調べる（gh の呼び出しを減らす）
  for (const run of runs) {
    run.jobCount = run.event === 'schedule' && run.conclusion === 'cancelled'
      ? JSON.parse(gh(['run', 'view', String(run.databaseId), '--json', 'jobs'])).jobs.length
      : null;
  }
  for (const run of selectRerunTargets(runs, { lookbackHours: LOOKBACK })) {
    console.log(`${TAG} ${wf}: run ${run.databaseId}（${run.createdAt}）は待機中に取り消された${COMMIT ? ' → 再実行する' : '（下見）'}`);
    if (!COMMIT) continue;
    try { gh(['run', 'rerun', String(run.databaseId)]); reran++; }
    catch (err) { rerunFailures++; console.error(`${TAG} ${wf}: run ${run.databaseId} を再実行できない（${String(err.message).slice(0, 80)}）`); }
  }
}
console.log(`${TAG} 共通 group の定期ワークフロー ${workflows.length} 本 / run を実検査 ${inspected} 本 / 取得失敗 ${failedReads} 本 / 再実行 ${reran} 件${COMMIT ? '' : '（下見のため 0）'}`);
if (inspected === 0) process.exit(2);
if (rerunFailures > 0) process.exit(1);

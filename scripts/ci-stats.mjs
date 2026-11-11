#!/usr/bin/env node
// ci-stats — GitHub Actions の直近の実行を数える（成功・取消・失敗、所要時間、develop が赤だった時間、落ちた検査）。
//
//   npm run ci:stats                    # 直近 200 件
//   npm run ci:stats -- --limit 500     # 件数を変える
//   npm run ci:stats -- --failures      # develop で落ちた実行のログから、落ちた検査の id も数える（実行 1 件ごとに gh を呼ぶ）
//
// 読み手: CI・pre-commit・デプロイの構成を変えた人が、変更の前後を同じ数え方で比べる。
// exit: 0 集計できた / 2 検査不成立（gh が使えない・実行が 0 件）
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { parseCliArgs } from './lib/cli-args.mjs';
import { failedCheckIds, gateTimeline, summarizeRuns } from './lib/ci-stats.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const GATE = 'Pre-merge check (quality audit + build)';
const args = parseCliArgs({ limit: { type: 'integer', default: 200 }, failures: { type: 'boolean' } });

function gh(ghArgs) {
  return spawnSync('gh', ghArgs, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

const list = gh(['run', 'list', '--limit', String(args.limit), '--json', 'databaseId,workflowName,event,headBranch,status,conclusion,createdAt,startedAt,updatedAt']);
if (list.status !== 0) {
  console.error(`[ci-stats] 検査不成立: gh run list が失敗: ${(list.stderr || '').trim().slice(-300)}`);
  process.exitCode = 2;
} else {
  const runs = JSON.parse(list.stdout);
  if (!runs.length) {
    console.error('[ci-stats] 検査不成立: 実行が 0 件');
    process.exitCode = 2;
  } else {
    const fmt = (n) => (n == null ? '-' : n.toFixed(1));
    console.log(`[ci-stats] 実行 ${runs.length} 件（${runs.at(-1).createdAt} 〜 ${runs[0].createdAt}）`);
    for (const g of summarizeRuns(runs)) {
      const parts = Object.entries(g.conclusions).map(([k, v]) => `${k} ${v}`).join(' / ');
      console.log(`  ${String(g.total).padStart(4)}  ${g.key}  ${parts}  成功の中央値 ${fmt(g.medianMin)} 分・最大 ${fmt(g.maxMin)} 分`);
    }

    const t = gateTimeline(runs, { workflowName: GATE });
    console.log(`[ci-stats] develop のゲート ${t.total} 回: 成功 ${t.count.success} / 取消 ${t.count.cancelled} / 失敗 ${t.count.failure} / その他 ${t.count.other}`);
    console.log(`[ci-stats] develop が赤だった時間: ${fmt(t.redMin)} 分${t.openRed ? '（最後の実行が赤のまま）' : ''}（${t.from ?? '-'} 〜 ${t.to ?? '-'}）`);

    if (args.failures && t.failed.length) {
      const byCheck = new Map();
      let unread = 0;
      for (const id of t.failed) {
        const log = gh(['run', 'view', String(id), '--log-failed']);
        const ids = log.status === 0 ? failedCheckIds(log.stdout) : [];
        if (!ids.length) unread += 1;
        for (const check of ids) byCheck.set(check, (byCheck.get(check) || 0) + 1);
      }
      console.log(`[ci-stats] 落ちた検査（失敗 ${t.failed.length} 回のうち検査名を読めた ${t.failed.length - unread} 回。読めない実行は build の失敗かログの取得失敗）`);
      for (const [check, n] of [...byCheck].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${check}`);
    }
  }
}

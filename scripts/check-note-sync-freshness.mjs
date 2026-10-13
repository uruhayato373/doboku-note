#!/usr/bin/env node
// note の記事単位の同期（Mac の launchd note-sync・日曜 3:00）が止まっていないかを、同期の記録で見る。
// 反映待ち・止まっている記事の判定は check-note-sync（CI の note-sync-live.yml）の担当で、ここは「Mac が回っているか」だけ。
//
// なぜ: 同期の記録（data/note/sync-log.json）の古さは週次レビューの手順書に「8 日より古ければ launchd が止まっている」と
// 文で書いてあるだけで、機械の検査が無かった（2026-10-10 の data/ の SSOT 見直し）。10/4 の週次の同期は Google Drive の
// 本体アプリが止まっていて配布 PDF を取り寄せられず失敗していたが、CI からは「反映待ちが残っている」としか見えなかった。
//
// 判定:
//   data/note/sync-log.json の runs[] のうち最新の startedAt（台帳 note.sync-log）
//     → 記録が無い／startedAt が読めない／台帳 note.sync-log の freshness.failDays（8 日）超前 は FAIL
//   ファイルが壊れている（JSON として読めない）は exit 2（止まっているのと、検査できないのを分ける）
//
// 使い方:
//   node scripts/check-note-sync-freshness.mjs [--json]
//   npm run check-note-sync-freshness
//
// exit: 0=OK, 1=FAIL, 2=検査不成立

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetPath, freshnessDays } from './lib/datasets.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const TAG = '[check-note-sync-freshness]';
const JSON_OUT = process.argv.includes('--json');

/**
 * 純関数。同期の記録から判定を返す（テスト対象）。
 * @param {{ runs?: { startedAt?: string, finishedAt?: string }[] } | null} log
 * @param {number} nowUtcMs
 * @param {{ maxAgeDays?: number }} [opts]
 */
export function assessNoteSyncFreshness(log, nowUtcMs, { maxAgeDays = freshnessDays('note.sync-log', 'failDays') } = {}) {
  const runs = Array.isArray(log?.runs) ? log.runs : [];
  const times = runs.map((r) => Date.parse(r?.startedAt ?? '')).filter(Number.isFinite);
  const inspected = { runs: runs.length, latestStartedAt: times.length ? new Date(Math.max(...times)).toISOString() : null, maxAgeDays };
  if (!runs.length) return { status: 'FAIL', reasons: ['同期の記録が 1 件も無い（Mac の launchd note-sync が一度も動いていない）'], inspected };
  if (!times.length) return { status: 'FAIL', reasons: ['同期の記録の startedAt が読めない'], inspected };
  const ageDays = (nowUtcMs - Math.max(...times)) / 86_400_000;
  if (ageDays > maxAgeDays) {
    return {
      status: 'FAIL',
      reasons: [`最後の同期が ${Math.floor(ageDays)} 日前（上限 ${maxAgeDays} 日）。Mac の launchd note-sync が止まっている（npm run note-sync:install -- --status・~/Library/Logs/doboku-note/note-sync.log）`],
      inspected,
    };
  }
  return { status: 'OK', reasons: [], inspected };
}

const isMain = process.argv[1] && process.argv[1].split('\\').join('/').endsWith('check-note-sync-freshness.mjs');

if (isMain) {
  const rel = datasetPath('note.sync-log');
  let log = null;
  try {
    if (existsSync(join(ROOT, rel))) log = JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
  } catch (error) {
    console.error(`${TAG} ✗ 検査不成立: ${rel} を読めない（${error.message}）`);
    process.exit(2);
  }
  const r = assessNoteSyncFreshness(log, Date.now());
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ check: 'note-sync-freshness', ...r }, null, 2) + '\n');
  } else {
    console.log(`${TAG} 記録 ${r.inspected.runs} 件を実検査 / 最新 ${r.inspected.latestStartedAt ?? 'なし'}（上限 ${r.inspected.maxAgeDays} 日）`);
    if (r.status === 'OK') console.log(`${TAG} ✓ Mac の同期は回っている`);
    else for (const reason of r.reasons) console.error(`${TAG} ✗ ${reason}`);
  }
  process.exitCode = r.status === 'FAIL' ? 1 : 0;
}

#!/usr/bin/env node
/**
 * check-search-triage.mjs — 検索改善の週次の処置が残っていないか（運用アラート・依存ゼロ）。
 * ---------------------------------------------------------------------------
 * 判定は scripts/lib/search-opportunities.mjs の triage（受け皿外・旧 URL・誘導の見直し・改善の記録の無い実験・判定待ち・
 * 本番に入らない改善）。週次レビューは npm run search-improvement -- triage --check --weekly を完了条件にして要処置を 0 にする。
 * これはその抜けを拾う安全網: quality-audit の ops 区分の cadence weekly（土曜の週次レビューが quality:audit:weekly で回す・DN-0847。依存ゼロに保つ）。
 * 壁時計（旧 URL・誘導の期限）に依存するので ci には入れない。
 * exit: 0 要処置なし / 1 要処置あり / 2 GSC の検索語×ページ集計が無い（検査不成立）
 * ---------------------------------------------------------------------------
 */
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { buildSearchOpportunities } from './lib/search-opportunities.mjs';

const TAG = '[check-search-triage]';
const r = buildSearchOpportunities(ROOT, { maxCandidates: Infinity });
if (!r.period) {
  console.error(`${TAG} GSC の検索語×ページ集計が無い — 検査不成立`);
  process.exit(2);
}
const action = r.triage.filter((t) => t.status === 'action');
const total = r.clusters.reduce((s, c) => s + c.candidateTotal, 0);
console.log(`${TAG} 候補 ${total} 件・検索改善の実験 ${r.experiments.length} 件を検査（GSC ${r.period.startDate}〜${r.period.endDate}）/ 要処置 ${action.length} / 観察中 ${r.triage.length - action.length}`);
for (const t of action) console.log(`  ✗ [${t.clusterLabel}] ${t.page}: ${t.action}`);
if (action.length) console.log(`${TAG} 週次レビューで処置する（npm run search-improvement -- triage --check --weekly が完了条件）`);
process.exitCode = action.length ? 1 : 0;

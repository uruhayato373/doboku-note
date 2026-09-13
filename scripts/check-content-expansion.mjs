#!/usr/bin/env node
import { expansionReport } from './lib/content-expansion.mjs';
try {
  const report = expansionReport(process.cwd());
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    const s = report.summary;
    console.log(`[content-expansion] 教材 ${s.reviewedSources}/${s.expectedSources} / 論点 ${s.units} / 要作業・未確認 ${s.pending} / 原典待ち ${s.blocked} / 再確認 ${s.stale}`);
    for (const issue of report.issues) console.error(`  [FAIL] ${issue}`);
    for (const source of report.sources) console.log(`  ${source.title}: ${source.units.length} 論点`);
    console.log(report.productionComplete ? '確認した制作範囲は充足。公開・効果は既存の配信台帳と事業レビューで確認。' : '未完了があります。教材の対応づけ・制作・公開・効果を区別してください。');
  }
  if (report.issues.length || (process.argv.includes('--complete') && !report.productionComplete)) process.exitCode = 1;
} catch (error) { console.error(`[content-expansion] 検査不成立: ${error.message}`); process.exitCode = 2; }

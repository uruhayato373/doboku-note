#!/usr/bin/env node
import { expansionReport } from './lib/content-expansion.mjs';
const LINKED = process.argv.includes('--linked');
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
  // --linked: backlogIds を持つ論点（カードが担当している論点）に要作業・原典待ち・再確認が残れば赤。
  // backlog の [検証:check-content-expansion:linked] 用。無印は台帳の構造検査なので常に緑になり完了判定に使えない（DN-0340）
  const linked = report.units.filter((u) => (u.backlogIds ?? []).length > 0);
  const linkedOpen = linked.filter((u) => u.pending || u.sourceWaiting || u.stale);
  if (LINKED) {
    if (!linked.length) { console.error('[content-expansion] 検査不成立: backlogIds を持つ論点が 0 件'); process.exitCode = 2; }
    else console.log(`[content-expansion] backlog 担当の論点 ${linked.length} 件 / 未完了 ${linkedOpen.length} 件（${[...new Set(linked.flatMap((u) => u.backlogIds))].join(' ')}）`);
  }
  if (process.exitCode !== 2 && (report.issues.length || (process.argv.includes('--complete') && !report.productionComplete) || (LINKED && linkedOpen.length))) process.exitCode = 1;
} catch (error) { console.error(`[content-expansion] 検査不成立: ${error.message}`); process.exitCode = 2; }

#!/usr/bin/env node
/** E2E CI の JSON report を読み、対象0・未実行・スキップを成功扱いしない。 */
import { pathToFileURL } from 'node:url';
import { parseCliArgs } from './lib/cli-args.mjs';
import { readJson } from './lib/json-io.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

export function checkE2EExecution(report) {
  const tests = [];
  const walk = (suite) => {
    for (const child of suite.suites ?? []) walk(child);
    for (const spec of suite.specs ?? []) tests.push(...spec.tests ?? []);
  };
  walk(report);
  const counts = { targets: tests.length, executed: 0, skipped: 0, failed: 0, notExecuted: 0 };
  const issues = [];
  for (const test of tests) {
    const last = test.results?.at(-1);
    if (test.status === 'skipped' || last?.status === 'skipped') counts.skipped++;
    else if (!last) counts.notExecuted++;
    else {
      counts.executed++;
      if (last.status !== 'passed') counts.failed++;
    }
  }
  if (!counts.targets) issues.push('検査対象が0件');
  if (counts.skipped) issues.push(`適用対象のスキップ ${counts.skipped} 件`);
  if (counts.notExecuted) issues.push(`実行結果なし ${counts.notExecuted} 件`);
  if (counts.failed) issues.push(`成功していない検査 ${counts.failed} 件`);
  if (report.errors?.length) issues.push(`Playwrightの実行エラー ${report.errors.length} 件`);
  const stats = report.stats;
  const total = stats && ['expected', 'unexpected', 'flaky', 'skipped'].reduce((sum, key) => sum + stats[key], 0);
  if (total !== counts.targets) issues.push('レポートの集計と検査明細の件数が不一致');
  return { ...counts, issues, ok: issues.length === 0 };
}

function main() {
  try {
    const args = parseCliArgs({ report: { type: 'string', default: '.tmp/e2e-report.json' } });
    const result = checkE2EExecution(readJson(REPO_ROOT, args.report));
    console.log(`check-e2e-execution: 対象 ${result.targets} / 実行 ${result.executed} / スキップ ${result.skipped} / 未実行 ${result.notExecuted} / 失敗 ${result.failed}`);
    for (const issue of result.issues) console.error(`  ${issue}`);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(`check-e2e-execution: 検査不成立: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

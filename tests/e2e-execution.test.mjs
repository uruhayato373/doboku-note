import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { CHECKS } from '../scripts/quality-audit.mjs';
import { checkE2EExecution } from '../scripts/check-e2e-execution.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const fixture = () => ({ stats: { expected: 2, unexpected: 0, flaky: 0, skipped: 0 }, suites: [{ specs: [{ tests: [
  { projectName: 'desktop-chromium', status: 'expected', results: [{ status: 'passed' }] },
  { projectName: 'mobile-chromium', status: 'expected', results: [{ status: 'passed' }] },
] }] }] });

test('実行明細2件が両方成功したときだけ成功とする', () => {
  assert.deepEqual(checkE2EExecution(fixture()), { targets: 2, executed: 2, skipped: 0, failed: 0, notExecuted: 0, issues: [], ok: true });
});

test('対象0・スキップ・結果なし・失敗・壊れた集計を偽PASSにしない', () => {
  assert.equal(checkE2EExecution({ suites: [], stats: { expected: 0, unexpected: 0, flaky: 0, skipped: 0 } }).ok, false);
  for (const status of ['skipped', 'failed', 'timedOut', 'interrupted']) {
    const r = fixture(); r.suites[0].specs[0].tests[0] = { status: status === 'skipped' ? 'skipped' : 'unexpected', results: [{ status }] };
    assert.equal(checkE2EExecution(r).ok, false, status);
  }
  const missing = fixture(); missing.suites[0].specs[0].tests[0].results = [];
  assert.equal(checkE2EExecution(missing).notExecuted, 1);
  const broken = fixture(); broken.stats.expected = 3;
  assert.equal(checkE2EExecution(broken).ok, false);
  const error = fixture(); error.errors = [{ message: 'global setup failed' }];
  assert.equal(checkE2EExecution(error).ok, false);
});

test('Playwrightの実収集でa11yは両project同範囲、mobile専用はモバイルだけに配分する', () => {
  const report = JSON.parse(execFileSync(process.execPath, [join(ROOT, 'node_modules/@playwright/test/cli.js'), 'test', '--list', '--reporter=json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
  const files = new Map();
  const walk = (suite) => {
    for (const child of suite.suites ?? []) walk(child);
    for (const spec of suite.specs ?? []) for (const t of spec.tests) {
      const key = `${t.projectName}/${spec.file}`;
      files.set(key, [...files.get(key) ?? [], spec.title]);
    }
  };
  walk(report);
  const desktopA11y = files.get('desktop-chromium/a11y.spec.ts') ?? [];
  const mobileA11y = files.get('mobile-chromium/a11y.spec.ts') ?? [];
  assert.ok(desktopA11y.length > 0, 'a11yが1件も収集されていない');
  assert.deepEqual(mobileA11y, desktopA11y);
  assert.equal(files.has('desktop-chromium/mobile.spec.ts'), false);
  assert.ok(files.get('mobile-chromium/mobile.spec.ts')?.length > 0, 'mobile専用検査が消失');
});

test('CIでstandards-dataの生成漏れをスキップせず、生成とE2E実行結果ゲートを配線する', () => {
  const previous = process.env.CI;
  try { process.env.CI = 'true'; assert.equal(CHECKS.find((c) => c.id === 'standards-data').skip(), null); }
  finally { if (previous === undefined) delete process.env.CI; else process.env.CI = previous; }
  const ci = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8').split('\n  build:')[0];
  assert.ok(ci.indexOf('npm run build-standards-data') > 0);
  assert.ok(ci.indexOf('npm run build-standards-data') < ci.indexOf('run: npm run quality:audit:ci'));
  const e2e = readFileSync(join(ROOT, '.github/workflows/e2e.yml'), 'utf8');
  assert.match(e2e, /PLAYWRIGHT_JSON_OUTPUT_NAME: \.tmp\/e2e-report\.json/);
  assert.match(e2e, /run: npm run test:e2e -- --reporter=line,html,json/);
  assert.match(e2e, /name: Check E2E execution coverage\n\s+if: always\(\)\n\s+run: npm run check-e2e-execution/);
});


test('JSONレポートが存在しないCLI実行も失敗にする', () => {
  assert.throws(() => execFileSync(process.execPath, [join(ROOT, 'scripts/check-e2e-execution.mjs'), '--report', '.tmp/nonexistent-e2e-execution-report.json'], { cwd: ROOT, stdio: 'pipe' }), (error) => error.status === 1 && String(error.stderr).includes('検査不成立'));
});

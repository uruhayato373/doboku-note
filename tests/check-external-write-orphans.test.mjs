// DN-0225: check-external-write-orphans が run ログの取得失敗（社内プロキシの 407 等）を数えずに
// 「✓ 痕跡なし」exit 0 を返していた偽 PASS の回帰テスト。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgeScan } from '../scripts/check-external-write-orphans.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'check-external-write-orphans.mjs');

test('judgeScan: 対象 0 件は exit 0 だが「未検査」と明示する', () => {
  const v = judgeScan({ targetRuns: 0, scanned: 0, fetchFailed: 0, findings: 0 });
  assert.equal(v.exitCode, 0);
  assert.equal(v.verdict, 'no-targets');
  assert.match(v.message, /対象 0 件/);
  assert.match(v.message, /未検査/);
  assert.doesNotMatch(v.message, /✓/);
});

test('judgeScan: 全件取得して痕跡なしは exit 0（clean）', () => {
  const v = judgeScan({ targetRuns: 9, scanned: 9, fetchFailed: 0, findings: 0 });
  assert.equal(v.exitCode, 0);
  assert.equal(v.verdict, 'clean');
  assert.match(v.message, /実検査 9 本/);
});

test('judgeScan: 痕跡ありは exit 1（取得失敗が混じっても検出を優先し、未検査数も示す）', () => {
  const clean = judgeScan({ targetRuns: 3, scanned: 3, fetchFailed: 0, findings: 1 });
  assert.equal(clean.exitCode, 1);
  assert.equal(clean.verdict, 'findings');
  const mixed = judgeScan({ targetRuns: 3, scanned: 2, fetchFailed: 1, findings: 1 });
  assert.equal(mixed.exitCode, 1);
  assert.match(mixed.message, /1\/3 本は取得失敗/);
});

test('judgeScan: 一部取得失敗は exit 2（検査不成立 N/M）— 2026-09-14 の 5/9 再現', () => {
  const v = judgeScan({ targetRuns: 9, scanned: 4, fetchFailed: 5, findings: 0 });
  assert.equal(v.exitCode, 2);
  assert.equal(v.verdict, 'inconclusive-partial');
  assert.match(v.message, /検査不成立（5\/9 取得失敗）/);
});

test('judgeScan: 全件取得失敗は exit 2 で部分失敗と区別する', () => {
  const v = judgeScan({ targetRuns: 4, scanned: 0, fetchFailed: 4, findings: 0 });
  assert.equal(v.exitCode, 2);
  assert.equal(v.verdict, 'inconclusive-all');
  assert.match(v.message, /4\/4 取得失敗＝全件/);
});

// 実スクリプトを偽 gh（PATH 先頭）で走らせ、ログ取得失敗が exit 2 になることを end-to-end で確認する
test('CLI: run ログ取得が Proxy Authentication Required で落ちた run があると exit 2', { skip: process.platform === 'win32' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'orphans-gh-'));
  try {
    const now = new Date().toISOString();
    const runs = [
      { databaseId: 101, conclusion: 'failure', createdAt: now, url: 'https://example.invalid/101' },
      { databaseId: 102, conclusion: 'failure', createdAt: now, url: 'https://example.invalid/102' },
      { databaseId: 103, conclusion: 'success', createdAt: now, url: 'https://example.invalid/103' },
    ];
    const fakeGh = `#!/usr/bin/env node
const a = process.argv.slice(2);
if (a[0] === '--version') { console.log('gh version 0.0.0-fake'); process.exit(0); }
if (a[0] === 'run' && a[1] === 'list') { console.log(${JSON.stringify(JSON.stringify(runs))}); process.exit(0); }
if (a[0] === 'run' && a[1] === 'view' && a[2] === '101') { console.log('build\\tstep\\tcommit failed'); process.exit(0); }
if (a[0] === 'run' && a[1] === 'view') { console.error('error connecting to api.github.com: Proxy Authentication Required'); process.exit(1); }
process.exit(1);
`;
    const ghPath = join(dir, 'gh');
    writeFileSync(ghPath, fakeGh);
    chmodSync(ghPath, 0o755);

    const r = spawnSync(process.execPath, [SCRIPT, '--json'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    });
    assert.equal(r.status, 2, `stdout=${r.stdout}\nstderr=${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert.equal(out.targetRuns, 2);
    assert.equal(out.runsScanned, 1);
    assert.equal(out.fetchFailed, 1);
    assert.equal(out.verdict, 'inconclusive-partial');
    assert.match(out.fetchFailures[0].reason, /Proxy Authentication Required/);

    const text = spawnSync(process.execPath, [SCRIPT], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    });
    assert.equal(text.status, 2);
    assert.match(text.stdout, /対象 2 本・実検査 1 本・取得失敗 1 本/);
    assert.match(text.stderr, /検査不成立（1\/2 取得失敗）/);
    assert.doesNotMatch(text.stdout + text.stderr, /✓ 外部成功/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// x-publish-scheduled.test.mjs — x-publish-scheduled.mjs（承認済みキューの CI 自動投稿）の回帰テスト。
// fake ledger / liveReader / publisher / verifyLive / fs を注入し、Playwright・child_process・
// 実ファイル書き込みには一切触れない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { run, queueItemHash } from '../scripts/x-publish-scheduled.mjs';
import { WRITE_PLAN_HASH_ENV } from '../scripts/lib/ci-write-gate.mjs';

const NOW = '2026-09-21T07:15:00+09:00';

function makeRoot() {
  return mkdtempSync(join(tmpdir(), 'x-publish-scheduled-'));
}

function okGuard() {
  return () => ({ ok: true, detail: 'x-schedule-guard OK / check-x-review OK' });
}

const DUE_TWEET = { draft: '099-sample', key: '1', title: '見出し', text: '本文サンプルテキストです', status: 'scheduled', scheduledAt: NOW, kind: 'post', mediaSha256: [] };

function baseDeps(overrides = {}) {
  const calls = { publisher: 0, appendPostedLog: 0 };
  const deps = {
    root: makeRoot(),
    argv: ['--commit', '--now', NOW],
    runGuardScripts: okGuard(),
    loadLedgerFn: () => [DUE_TWEET],
    liveReader: async () => ({ ok: true, todayCount: 0, accountState: 'ok' }),
    publisher: async () => { calls.publisher++; return { ok: true }; },
    verifyLive: async () => ({ ok: true, url: 'https://x.com/doboku373/status/1' }),
    appendPostedLogFn: () => { calls.appendPostedLog++; },
    fsImpl: { existsSync: () => false, mkdirSync: () => {}, writeFileSync: () => {} },
    log: () => {},
    // --commit は plan-x job が渡す plan hash（キュー項目の sha256）と一致するときだけ。既定は一致させておく。
    env: { [WRITE_PLAN_HASH_ENV]: queueItemHash(DUE_TWEET) },
    ...overrides,
  };
  return { deps, calls };
}

test('対象0件なら exit0 で no-due', async () => {
  const { deps } = baseDeps({ loadLedgerFn: () => [] });
  const { exitCode, summary } = await run(deps);
  assert.equal(exitCode, 0);
  assert.equal(summary.result, 'no-due');
});

test('kill switch / guard スクリプトが赤なら gate-red で exit0（ledger を読みにいかない）', async () => {
  let ledgerCalled = false;
  const { deps } = baseDeps({
    runGuardScripts: async () => ({ ok: false, detail: 'x-schedule-guard --queue rc=1' }),
    loadLedgerFn: () => { ledgerCalled = true; return [DUE_TWEET]; },
  });
  const { exitCode, summary } = await run(deps);
  assert.equal(exitCode, 0);
  assert.equal(summary.result, 'gate-red');
  assert.equal(ledgerCalled, false);
});

test('頻度ゲートで block（例: per-day 超過）なら exit0 で notice ログ', async () => {
  const logs = [];
  const postedToday1 = { draft: 'd1', key: '1', status: 'posted', postedAt: NOW, kind: 'post', mediaSha256: [] };
  const postedToday2 = { draft: 'd2', key: '1', status: 'posted', postedAt: NOW, kind: 'post', mediaSha256: [] };
  const { deps, calls } = baseDeps({
    loadLedgerFn: () => [DUE_TWEET, postedToday1, postedToday2],
    liveReader: async () => ({ ok: true, todayCount: 2, accountState: 'ok' }), // 台帳当日2件=live2件（mismatchなし）。上限2に対し+候補1件=3で per-day block
    log: (msg) => logs.push(msg),
  });
  const { exitCode, summary } = await run(deps);
  assert.equal(exitCode, 0);
  assert.equal(summary.result, 'gate-block');
  assert.ok(summary.rules.includes('per-day'));
  assert.ok(logs.some((l) => typeof l === 'string' && l.includes('::notice::')));
  assert.equal(calls.publisher, 0);
});

test('ledger-live-mismatch なら exit3 で PAUSED は作成しない', async () => {
  let pausedWritten = false;
  const { deps } = baseDeps({
    loadLedgerFn: () => [DUE_TWEET, { draft: 'd', key: 'k', status: 'posted', postedAt: NOW, kind: 'post', mediaSha256: [] }],
    liveReader: async () => ({ ok: true, todayCount: 0, accountState: 'ok' }), // 台帳1 vs live0 → mismatch
    fsImpl: {
      existsSync: () => false,
      mkdirSync: () => {},
      writeFileSync: () => { pausedWritten = true; },
    },
  });
  const { exitCode, summary } = await run(deps);
  assert.equal(exitCode, 3);
  assert.equal(summary.result, 'manual');
  assert.ok(summary.rules.includes('ledger-live-mismatch'));
  assert.equal(pausedWritten, false);
});

test('account-state 異常なら exit3 で PAUSED を作成する', async () => {
  let pausedWritten = false;
  let pausedContent = null;
  const { deps } = baseDeps({
    liveReader: async () => ({ ok: true, todayCount: 0, accountState: 'locked' }),
    fsImpl: {
      existsSync: () => false,
      mkdirSync: () => {},
      writeFileSync: (_p, content) => { pausedWritten = true; pausedContent = content; },
    },
  });
  const { exitCode, summary } = await run(deps);
  assert.equal(exitCode, 3);
  assert.equal(summary.result, 'manual');
  assert.ok(summary.rules.includes('account-state'));
  assert.equal(pausedWritten, true);
  assert.ok(String(pausedContent).includes('account-state'));
});

test('allow + --commit で publisher が1回だけ呼ばれ appendPostedLog される', async () => {
  const { deps, calls } = baseDeps();
  const { exitCode, summary } = await run(deps);
  assert.equal(exitCode, 0);
  assert.equal(summary.result, 'posted');
  assert.equal(calls.publisher, 1);
  assert.equal(calls.appendPostedLog, 1);
});

test('allow だが --commit 無しなら投稿せず dry-run-allow', async () => {
  const { deps, calls } = baseDeps({ argv: ['--now', NOW] });
  const { exitCode, summary } = await run(deps);
  assert.equal(exitCode, 0);
  assert.equal(summary.result, 'dry-run-allow');
  assert.equal(calls.publisher, 0);
});

test('live 検証失敗なら exit1', async () => {
  const { deps, calls } = baseDeps({
    verifyLive: async () => ({ ok: false, detail: '本文先頭20文字が一致しない' }),
  });
  const { exitCode, summary } = await run(deps);
  assert.equal(exitCode, 1);
  assert.equal(summary.result, 'verify-failed');
  assert.equal(calls.publisher, 1);
  assert.equal(calls.appendPostedLog, 0);
});

test('publisher 失敗（rc != 0）なら exit2 で appendPostedLog されない', async () => {
  const { deps, calls } = baseDeps({
    publisher: async () => { calls.publisher++; return { ok: false, detail: 'publish-x.ts rc=1' }; },
  });
  const { exitCode, summary } = await run(deps);
  assert.equal(exitCode, 2);
  assert.equal(summary.result, 'publish-failed');
  assert.equal(calls.appendPostedLog, 0);
});

test('台帳が読めない（例外）なら exit2 precondition-error', async () => {
  const { deps } = baseDeps({
    loadLedgerFn: () => { throw new Error('ENOENT'); },
  });
  const { exitCode, summary } = await run(deps);
  assert.equal(exitCode, 2);
  assert.equal(summary.result, 'precondition-error');
});

test('--now 指定でテスト用の現在時刻を固定できる', async () => {
  const { deps } = baseDeps({ argv: ['--commit', '--now', NOW] });
  const { exitCode, summary } = await run(deps);
  assert.equal(exitCode, 0);
  assert.equal(summary.result, 'posted');
});

test('--plan-only は候補選定と plan hash だけ返し、liveReader（Playwright）を呼ばない', async () => {
  let liveCalled = false;
  const { deps } = baseDeps({ argv: ['--plan-only', '--now', NOW], liveReader: async () => { liveCalled = true; return { ok: true, todayCount: 0, accountState: 'ok' }; } });
  const { exitCode, summary } = await run(deps);
  assert.equal(exitCode, 0);
  assert.equal(summary.result, 'plan');
  assert.equal(summary.planHash, queueItemHash(DUE_TWEET));
  assert.equal(summary.draft, '099-sample');
  assert.equal(liveCalled, false);
});

test('--commit で plan hash が無い / 一致しないと exit2 で何もしない（キュー内容が plan 後に変わった）', async () => {
  for (const env of [{}, { [WRITE_PLAN_HASH_ENV]: 'f'.repeat(64) }]) {
    const { deps, calls } = baseDeps({ env });
    const { exitCode, summary } = await run(deps);
    assert.equal(exitCode, 2);
    assert.equal(summary.result, 'plan-hash-mismatch');
    assert.equal(calls.publisher, 0);
  }
  // text が変われば hash も変わる
  assert.notEqual(queueItemHash(DUE_TWEET), queueItemHash({ ...DUE_TWEET, text: '別の本文' }));
});

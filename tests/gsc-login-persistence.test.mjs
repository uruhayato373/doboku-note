// Google ログインの維持（DN-0293・2026-09-25）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lastCommitRunAt, decideIndexingRun } from '../scripts/lib/gsc-local-routine.mjs';
import { gscLoginLine } from '../scripts/check-gsc-login.mjs';

test('未ログインで送れなかった回は「前回の送信」に数えない', () => {
  const runs = [
    { mode: 'commit', status: 'ok', collectedAt: '2026-09-17T06:53:24Z' },
    { mode: 'commit', status: 'not-signed-in', collectedAt: '2026-09-24T13:35:51Z' },
  ];
  assert.equal(lastCommitRunAt(runs).toISOString(), '2026-09-17T06:53:24.000Z');
  const d = decideIndexingRun({ runs, hasPriorityList: true, now: new Date('2026-09-24T20:20:00Z') });
  assert.equal(d.run, true);
});

test('gscLoginLine: not-signed-in のときだけ再ログインを促す', () => {
  assert.match(gscLoginLine({ status: 'not-signed-in', collectedAt: '2026-09-24T13:35:51Z' }), /google-console:login/);
  assert.equal(gscLoginLine({ status: 'ok' }), null);
  assert.equal(gscLoginLine(null), null);
});

test('Google の画面ログインは CI で使わない（Google が Mac 側のログインまで失効させる・2026-09-21 実測）', () => {
  const reg = JSON.parse(readFileSync(new URL('../.claude/config/playwright-auth-profiles.json', import.meta.url), 'utf8'));
  const g = reg.services?.google;
  assert.ok(g, 'registry に google が無い');
  // ci ブロックは無く、画面 CSV の収集 script は collectors（エージェントのセッションでは拒否・土曜の Mac 収集と運営者だけ）
  assert.equal('ci' in g, false);
  assert.deepEqual(g.collectors, ['scripts/fetch-gsc-ui-csv.mjs', 'scripts/fetch-ga4-ui-csv.mjs']);
});

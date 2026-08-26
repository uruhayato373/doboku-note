import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// .bin/tsx は Windows では拡張子なしの sh スクリプトで execFileSync できない（ENOENT）。
// JS エントリを node で直接叩く（shell 不要・OS 非依存）。パターンは tests/backlog-parity.test.mjs に合わせる。
const TSX_CLI = join(ROOT, 'node_modules/tsx/dist/cli.mjs');

/**
 * deriveStatus は tools/admin-app/src/lib/todo.ts の export（.ts）なので tsx 経由で呼ぶ。
 * UI・CLI・Agent が同じ状態導出ルールを再実装しないための唯一の実装（DN-0093 順5）。
 */
function deriveStatus(opts) {
  const out = execFileSync(
    process.execPath,
    [TSX_CLI,
      '-e',
      `import { deriveStatus } from './tools/admin-app/src/lib/todo.ts';
       process.stdout.write(JSON.stringify(deriveStatus(${JSON.stringify(opts)})));`,
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 },
  );
  return JSON.parse(out);
}

test('deriveStatus: wipが最優先でIN_PROGRESSになる（weekly/monthly/planが全部trueでも勝つ）', () => {
  assert.equal(deriveStatus({ wip: true, inWeekly: true, inMonthly: true, hasPlan: true }), 'IN_PROGRESS');
});

test('deriveStatus: wipでなければweeklyがmonthlyより優先されTHIS_WEEKになる', () => {
  assert.equal(deriveStatus({ wip: false, inWeekly: true, inMonthly: true, hasPlan: true }), 'THIS_WEEK');
});

test('deriveStatus: monthlyのみならTHIS_MONTHになる', () => {
  assert.equal(deriveStatus({ wip: false, inWeekly: false, inMonthly: true, hasPlan: true }), 'THIS_MONTH');
});

test('deriveStatus: weekly/monthlyどちらでもなくplanがあればPLANNEDになる', () => {
  assert.equal(deriveStatus({ wip: false, inWeekly: false, inMonthly: false, hasPlan: true }), 'PLANNED');
});

test('deriveStatus: 全てfalseならBACKLOGになる', () => {
  assert.equal(deriveStatus({ wip: false, inWeekly: false, inMonthly: false, hasPlan: false }), 'BACKLOG');
});

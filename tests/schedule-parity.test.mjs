import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectScheduleEvents } from '../scripts/lib/schedule-events.mjs';
import { todayJst } from '../scripts/lib/jst-date.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// .bin/tsx は Windows では拡張子なしの sh スクリプトで execFileSync できない（ENOENT）。
// JS エントリを node で直接叩く（shell 不要・OS 非依存。tests/backlog-parity.test.mjs と同じ手法）。
const TSX_CLI = join(ROOT, 'node_modules/tsx/dist/cli.mjs');

/**
 * admin `/schedule` アダプタ（tools/admin-app/src/lib/schedule.ts）が、
 * scripts/lib/schedule-events.mjs の collectScheduleEvents と同じイベントを見ていることを固定する。
 *
 * 守りたい事故: schedule.ts はフィルタと型付けだけのアダプタで、写像ロジックを持たない設計
 * （パーサ二重実装禁止・CLAUDE.md「全体の制約」）。それでも import パス（`../../../../scripts/lib/...`
 * の階層数）を1つ間違えるだけで admin だけが壊れる、というズレは起きうる。
 *
 * ルート tsconfig.json の exclude に `tools/**` があり `npm run type-check` は schedule.ts を
 * 見ないため、この import パス切れを検出できるのはこのテストだけ（tests/backlog-parity.test.mjs
 * と同じ構図）。
 */

function scheduleBoardCountsBySource(month) {
  const out = execFileSync(
    process.execPath,
    [TSX_CLI,
      '-e',
      // tsx の -e eval は CJS 出力になり得るため top-level await は使わない（async IIFE で回避）。
      `import { scheduleBoard } from './tools/admin-app/src/lib/schedule.ts';
       (async () => {
         const board = await scheduleBoard(${JSON.stringify(month)});
         const counts = {};
         for (const e of board.events) counts[e.sourceId] = (counts[e.sourceId] ?? 0) + 1;
         process.stdout.write(JSON.stringify(counts));
       })();`,
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  return JSON.parse(out);
}

test('admin の scheduleBoard が collectScheduleEvents の月フィルタ結果とソース別件数で一致する', async () => {
  const month = todayJst().slice(0, 7);
  const fromAdmin = scheduleBoardCountsBySource(month);

  const result = await collectScheduleEvents(ROOT);
  const monthEvents = result.events.filter((e) => e.date.startsWith(month));
  const fromLib = {};
  for (const e of monthEvents) fromLib[e.sourceId] = (fromLib[e.sourceId] ?? 0) + 1;

  assert.ok(Object.keys(fromLib).length > 0, `検査対象が0件（${month}にイベントが無い＝検査不成立の疑い）`);
  assert.deepEqual(
    fromAdmin,
    fromLib,
    `ソース別件数が不一致（import パス切れの疑い）:\n  admin: ${JSON.stringify(fromAdmin)}\n  lib  : ${JSON.stringify(fromLib)}`,
  );
});

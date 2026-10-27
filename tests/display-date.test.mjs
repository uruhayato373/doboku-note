// 画面の日付の整形は src/lib/display-date.ts だけ（2026-10-27 に 5 か所の別実装を集約）。ビルド環境のタイムゾーンで日付をずらさない。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { loadTsModule } from './lib/load-ts.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

test('formatDotDate・formatJaDate: 日付だけはそのまま、時刻つきは日本時間の暦日にする', async () => {
  const { formatDotDate, formatJaDate } = await loadTsModule('src/lib/display-date.ts');
  assert.equal(formatDotDate('2026-10-07'), '2026.10.07');
  assert.equal(formatDotDate('2026-10-26T20:00:00Z'), '2026.10.27', 'UTC 20 時は日本時間で翌日');
  assert.equal(formatDotDate('2026-10-26T10:00:00+09:00'), '2026.10.26');
  assert.equal(formatJaDate('2026-01-05'), '2026年1月5日');
  for (const bad of ['', null, undefined, 'not-a-date']) assert.equal(formatDotDate(bad), null, String(bad));
});

test('src で年月日を getMonth()+1 から組み立てない（display-date.ts を使う）', () => {
  let out = '';
  try {
    out = execFileSync('git', ['grep', '-n', '-E', 'getMonth\\(\\) \\+ 1', '--', ':(glob)src/**'], { cwd: REPO_ROOT, encoding: 'utf8' });
  } catch (e) {
    if (e.status !== 1) throw e; // 1 = 一致なし
  }
  assert.deepEqual(out.split('\n').filter(Boolean), [], '日付の整形は src/lib/display-date.ts の formatDotDate・formatJaDate を使う');
});

// 管理画面の金額・数の整形は tools/admin-app/src/lib/format.ts（yen・num）を使い、画面ごとに同じ意味の関数を書き直さない。
// 2026-10-27 にアフィリエイト画面・検索戦略画面の写しを外した。形が違う整形（千円単位・前置きの空白つき）だけを理由つきで許す。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const ALLOWED = new Map([
  ['tools/admin-app/src/app/affiliate/programs/page.tsx', '報酬を前置きの空白つきで後ろに足す（無いときは空文字）'],
  ['tools/admin-app/src/app/strategy/market/page.tsx', '千円単位の ¥…k 表記'],
]);

test('管理画面のページで yen・num を定義し直さない（format.ts を import する）', () => {
  let out = '';
  try {
    out = execFileSync('git', ['grep', '-n', '-E', '^const (yen|num) = ', '--', ':(glob)tools/admin-app/src/app/**'], { cwd: REPO_ROOT, encoding: 'utf8' });
  } catch (e) {
    if (e.status !== 1) throw e;
  }
  const outside = out.split('\n').filter(Boolean).map((l) => l.replace(/\\/g, '/')).filter((l) => !ALLOWED.has(l.split(':')[0]));
  assert.deepEqual(outside, [], 'tools/admin-app/src/lib/format.ts の yen・num を使う');
});

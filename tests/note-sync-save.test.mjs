// note-sync の保存段（DN-0763）: 1 回だけ再試行し、落ちたら理由（出力の末尾）を返す
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastLines, runWithRetry } from '../scripts/lib/note-sync-save.mjs';

test('一時的な失敗は 2 回目で通り、理由を残さない', () => {
  const results = [{ status: 1, out: 'Unknown system error -11\n' }, { status: 0, out: 'ok\n' }];
  const r = runWithRetry(() => results.shift());
  assert.deepEqual([r.status, r.attempts, r.reason], [0, 2, '']);
});

test('2 回とも落ちたら最後の出力の末尾 1 行を理由にする', () => {
  let calls = 0;
  const r = runWithRetry(() => { calls += 1; return { status: 1, out: 'copy a\n✗ ETIMEDOUT: vault\n\n' }; });
  assert.equal(calls, 2);
  assert.equal(r.status, 1);
  assert.equal(r.reason, '✗ ETIMEDOUT: vault');
});

test('出力が空でも exit コードを理由にする', () => {
  assert.equal(runWithRetry(() => ({ status: 3, out: '' })).reason, 'exit 3');
  assert.deepEqual(lastLines('a\n\nb\nc\n', 2), ['b', 'c']);
});

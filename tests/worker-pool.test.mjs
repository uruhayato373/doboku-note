import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runPool } from '../scripts/lib/worker-pool.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('結果は入力順で返る（完了順ではない）', async () => {
  const items = [30, 5, 20, 1];
  const res = await runPool(items, 4, async (ms) => { await sleep(ms); return ms * 2; });
  assert.deepEqual(res.map((r) => r.value), [60, 10, 40, 2]);
});

test('同時実行数が concurrency を超えない', async () => {
  let running = 0;
  let peak = 0;
  await runPool(Array.from({ length: 12 }, (_, i) => i), 3, async () => {
    running += 1;
    peak = Math.max(peak, running);
    await sleep(5);
    running -= 1;
  });
  assert.equal(peak, 3);
});

test('1 件の reject が他を止めず、失敗は ok:false で返る', async () => {
  const res = await runPool([1, 2, 3], 2, async (x) => {
    if (x === 2) throw new Error('boom');
    return x;
  });
  assert.equal(res[0].ok, true);
  assert.equal(res[1].ok, false);
  assert.match(res[1].error.message, /boom/);
  assert.equal(res[2].ok, true);
});

test('onSettled は完了ごとに index と累計を受け取り、shouldStop で新規取得を止める', async () => {
  const seen = [];
  let stop = false;
  const res = await runPool([1, 2, 3, 4, 5, 6], 1, async (x) => x, {
    onSettled: (i, r, done) => { seen.push([i, done]); if (done === 3) stop = true; },
    shouldStop: () => stop,
  });
  assert.deepEqual(seen, [[0, 1], [1, 2], [2, 3]]);
  assert.equal(res.filter(Boolean).length, 3);
});

test('空配列でも落ちない', async () => {
  assert.deepEqual(await runPool([], 4, async () => 1), []);
});

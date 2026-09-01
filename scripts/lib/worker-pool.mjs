/**
 * worker-pool.mjs — 依存ゼロの固定並列ワーカープール。
 *
 * なぜ要るか: PSI（44 計測）と URL Inspection（1,468 URL）が無待機の直列 for で回っていて、
 * それぞれ timeout-minutes 20 / 120 に当たって cancelled になった（2026-09-01）。
 * p-limit 等を足さず、asset-offload.mjs と同じカーソル方式で書く。
 *
 * 契約:
 *   - 結果は **入力順** の配列で返す（呼び出し側の [k/N] や checkpoint が index で扱える）
 *   - 1 件の reject は他を止めない。各要素は { ok: true, value } | { ok: false, error }
 *   - onSettled(index, result, doneCount) で進捗と部分保存のフックを渡せる
 *   - shouldStop() が true を返したらワーカーは新規取得をやめる（SIGINT の flush 用）
 */
export async function runPool(items, concurrency, fn, { onSettled, shouldStop } = {}) {
  const n = Math.max(1, Math.floor(Number(concurrency) || 1));
  const results = new Array(items.length);
  let cursor = 0;
  let done = 0;

  async function worker() {
    for (;;) {
      if (shouldStop && shouldStop()) return;
      const i = cursor;
      if (i >= items.length) return;
      cursor += 1;
      let result;
      try {
        result = { ok: true, value: await fn(items[i], i) };
      } catch (error) {
        result = { ok: false, error };
      }
      results[i] = result;
      done += 1;
      if (onSettled) await onSettled(i, result, done);
    }
  }

  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()));
  return results;
}

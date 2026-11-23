/**
 * sleep.mjs — 待機の共通部品（依存ゼロ）。各スクリプトで `const sleep = (ms) => new Promise(...)` を書き直さない
 * （53 ファイルに写しがあった。tests/script-helpers-ratchet.test.mjs が自前の定義の増加を止める）。
 */

/** ms ミリ秒待つ（非同期）。 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** ms ミリ秒、スレッドを止めて待つ（同期。非同期にできない CLI の再試行間隔用）。 */
export const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

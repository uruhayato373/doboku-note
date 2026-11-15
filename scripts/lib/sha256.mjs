/**
 * sha256.mjs — sha256 の 16 進ダイジェストを求める共通の補助関数（依存ゼロ）。
 *
 * なぜ要るか: `createHash('sha256').update(x).digest('hex')` を各スクリプトが小さな関数に包んで書き写していた
 * （2026-11-06 の冗長コード監査で 39 か所・DN-1022）。新しいコードはここから import する。
 * 既存の定義は触るときに移す（一括では置き換えない）。
 *
 * - sha256Hex(data): 文字列（UTF-8）または Buffer / TypedArray の sha256。
 * - sha256File(path): ファイル全体を読んでの sha256。巨大ファイルを 1 度にメモリへ載せたくないときは
 *   ストリーム版（asset-inbox-push.mjs の sha256Stream）を使う。
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

export function sha256File(path) {
  return sha256Hex(readFileSync(path));
}

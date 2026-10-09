/**
 * media-serve.mjs — /media ルートの応答の判定（純関数）。ファイルを開く前に、状態・ヘッダー・読む範囲を決める。
 *   409  実体の大きさが台帳の bytes と違う（Drive の未復元ファイルは stat が仮サイズを返す）
 *   416  Range が実体の外
 *   206  Range の範囲
 *   200  全体
 */
import { parseRange } from './http-range.mjs';

/**
 * @param {{ size: number, expectedBytes: number|null, rangeHeader: string|null, mime: string }} p
 * @returns {{ status: 409, body: string } | { status: 416|206|200, headers: Record<string,string>, start: number, end: number }}
 */
export function servePlan({ size, expectedBytes, rangeHeader, mime }) {
  if (expectedBytes !== null && size !== expectedBytes) {
    return { status: 409, body: '要復元: npm run media -- pull --work <exam>/<work> --commit' };
  }
  const headers = { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
  const range = parseRange(rangeHeader, size);
  if (range === 'unsatisfiable') return { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` }, start: 0, end: -1 };
  let status = 200;
  let start = 0;
  let end = size - 1;
  if (range) {
    status = 206;
    start = range.start;
    end = range.end;
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }
  headers['Content-Length'] = String(size === 0 ? 0 : end - start + 1);
  return { status, headers, start, end };
}

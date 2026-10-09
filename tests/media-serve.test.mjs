import assert from 'node:assert/strict';
import { test } from 'node:test';
import { servePlan } from '../scripts/lib/media-serve.mjs';

const base = { size: 1000, expectedBytes: null, rangeHeader: null, mime: 'video/mp4' };

test('servePlan: 実体の大きさが台帳の bytes と違えば 409（要復元）', () => {
  const r = servePlan({ ...base, expectedBytes: 5000 });
  assert.equal(r.status, 409);
  assert.match(r.body, /media -- pull/);
  assert.equal(servePlan({ ...base, expectedBytes: 1000 }).status, 200);
});

test('servePlan: Range なしは 200・全体、範囲ありは 206 と Content-Range、範囲外は 416', () => {
  const full = servePlan(base);
  assert.deepEqual([full.status, full.start, full.end, full.headers['Content-Length']], [200, 0, 999, '1000']);
  assert.equal(full.headers['Accept-Ranges'], 'bytes');
  const part = servePlan({ ...base, rangeHeader: 'bytes=0-99' });
  assert.deepEqual([part.status, part.headers['Content-Range'], part.headers['Content-Length']], [206, 'bytes 0-99/1000', '100']);
  const over = servePlan({ ...base, rangeHeader: 'bytes=5000-' });
  assert.equal(over.status, 416);
  assert.equal(over.headers['Content-Range'], 'bytes */1000');
});

test('servePlan: 空ファイルは Content-Length 0', () => {
  assert.equal(servePlan({ ...base, size: 0 }).headers['Content-Length'], '0');
});

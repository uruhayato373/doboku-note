// 手元と台帳が違うとき、どちらが新しいかで案内を分ける（DN-0770 の事故・2026-11-24）。
// 手元が古いのに「local-newer → --force で上げる」と案内され、直した vault の版 27 件を古い版で上書きした。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { driftDirection } from '../scripts/lib/drive-vault.mjs';

test('台帳の最後の書き込みより手元が古ければ vault-newer（--force で上げない）', () => {
  const entry = { syncedAt: '2026-09-30T11:44:08.892Z', verifiedAt: '2026-10-29T05:41:52.380Z' };
  assert.equal(driftDirection(Date.parse('2026-09-07T13:00:00Z'), entry), 'vault-newer');
  assert.equal(driftDirection(Date.parse('2026-11-20T00:00:00Z'), entry), 'local-newer');
});

test('verifiedAt が無ければ syncedAt で比べ、どちらも無ければ判断しない', () => {
  assert.equal(driftDirection(Date.parse('2026-11-04T00:00:00Z'), { syncedAt: '2026-11-14T00:00:00Z' }), 'vault-newer');
  assert.equal(driftDirection(Date.parse('2026-11-04T00:00:00Z'), {}), 'unknown');
});

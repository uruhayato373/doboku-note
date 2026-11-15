import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyExternalLink, summarizeExternalLinks } from '../scripts/lib/external-link-results.mjs';
const ok = { status: 200, ok: true };
test('404・410・DNS 不在だけを切れとして分類する', () => {
  for (const result of [{ status: 404 }, { status: 410 }, { error: 'ENOTFOUND' }, { error: 'ENODATA' }]) assert.equal(classifyExternalLink(result), 'broken');
  for (const result of [{ status: 403 }, { status: 429 }, { status: 503 }, { error: 'TIMEOUT' }, { error: 'fetch failed' }, { error: 'ECONNRESET' }, { error: 'EAI_AGAIN' }]) assert.equal(classifyExternalLink(result), 'inconclusive');
  assert.equal(classifyExternalLink(ok), 'ok');
});
test('対象・実検査・切れ・不成立の件数と終了コード', () => {
  assert.deepEqual(summarizeExternalLinks([ok, ok, ok, ok, { status: 403 }]), { target: 5, checked: 4, broken: 0, inconclusive: 1, ok: 4, exitCode: 0 });
  assert.equal(summarizeExternalLinks([ok, { status: 429 }]).exitCode, 2);
  assert.equal(summarizeExternalLinks([{ status: 404 }, { status: 429 }]).exitCode, 1);
  assert.equal(summarizeExternalLinks([]).exitCode, 2);
  assert.equal(summarizeExternalLinks([ok], 2).exitCode, 2);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_META_KEYS, metaHash, fmTitle, titleHash } from '../scripts/lib/note-republish-hash.mjs';
import { classifySync } from '../scripts/lib/note-sync-plan.mjs';

const doc = (extra) => `---\nnotePricing: paid\nprice: 1480\nnoteId: "n123"\n${extra}---\n# 見出し\n本文\n`;

test('題名は meta に入れない（価格・境界は人が反映して止める／題名は同期が自動で反映する別トラック）', () => {
  assert.ok(!LIVE_META_KEYS.includes('title'));
  assert.equal(metaHash(doc('title: "A"\n')), metaHash(doc('title: "B"\n')));
  assert.notEqual(titleHash(doc('title: "A"\n')), titleHash(doc('title: "B"\n')));
});

test('fmTitle は引用符を外し、CRLF でも読む。無ければ空', () => {
  assert.equal(fmTitle('---\r\ntitle: "A｜B"\r\nprice: 1\r\n---\r\n# x'), 'A｜B');
  assert.equal(fmTitle("---\ntitle: 'x \"y\"'\n---\n"), 'x "y"');
  assert.equal(fmTitle('---\nprice: 1\n---\n# 見出し'), '');
});

test('公開した結果の欄（noteId など）は meta ハッシュに入らない', () => {
  assert.equal(metaHash(doc('')), metaHash(doc('').replace('n123', 'n999')));
});

test('題名のずれは止めずに title 部品として同期する／価格のずれは止める', () => {
  const base = { bodyReason: null, assetDrift: false, tagDrift: false, metaDrift: false, coverReason: null, abort: null, imageMissing: [], pdfPending: false, pdfLocal: false };
  const t = classifySync({ ...base, titleDrift: true });
  assert.equal(t.status, 'ready');
  assert.deepEqual(t.parts, ['title']);
  assert.equal(classifySync({ ...base, titleDrift: true, metaDrift: true }).blocker, 'meta');
});

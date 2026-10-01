import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_META_KEYS, metaHash } from '../scripts/lib/note-republish-hash.mjs';

const doc = (extra) => `---\nnotePricing: paid\nprice: 1480\nnoteId: "n123"\n${extra}---\n# 見出し\n本文\n`;

test('題名（title）は live を変えるメタとして meta ハッシュに入る', () => {
  assert.ok(LIVE_META_KEYS.includes('title'));
  assert.notEqual(metaHash(doc('title: "A"\n')), metaHash(doc('title: "B"\n')));
});

test('title を足す前のキーで測れば、title を足しても値は変わらない（足す前に同期済みだったかの判定）', () => {
  const before = LIVE_META_KEYS.filter((k) => k !== 'title');
  assert.equal(metaHash(doc(''), before), metaHash(doc('title: "A"\n'), before));
  assert.equal(metaHash(doc(''), before), metaHash(doc('')));
});

test('公開した結果の欄（noteId など）は meta ハッシュに入らない', () => {
  assert.equal(metaHash(doc('')), metaHash(doc('').replace('n123', 'n999')));
});

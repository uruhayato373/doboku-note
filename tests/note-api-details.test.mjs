import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchNoteDetails } from '../scripts/lib/note-api.mjs';

test('ブラウザ経路は本文とタグ名を保持し、読み取りURLへ渡す', async () => {
  const data = { key: 'n123456789abc', status: 'published', price: 0, body: '<p>本文</p>', hashtag_notes: [{ hashtag: { name: '#転職' } }], eyecatch: 'cover' };
  const page = { evaluate: async (_fn, url) => {
    assert.equal(url, 'https://note.com/api/v3/notes/n123456789abc');
    return { json: { data }, error: null };
  } };
  assert.deepEqual(await fetchNoteDetails(data.key, { page }), { data, error: null });
});

test('取得不能や不完全な応答を空の記事として成功扱いしない', async () => {
  for (const result of [
    { json: null, error: 'HTTP 404' },
    { json: null, error: 'non-json response' },
    { json: { data: {} }, error: null },
  ]) {
    const checked = await fetchNoteDetails('n123456789abc', { page: { evaluate: async () => result } });
    assert.equal(checked.data, null);
    assert.ok(checked.error);
  }
  const thrown = await fetchNoteDetails('n123456789abc', { page: { evaluate: async () => { throw new Error('offline'); } } });
  assert.equal(thrown.data, null);
  assert.equal(thrown.error, 'offline');
});

test('不正なキーでは外部にアクセスしない', async () => {
  await assert.rejects(fetchNoteDetails('../settings', { page: { evaluate: async () => assert.fail('must not call') } }), /Invalid note key/);
});

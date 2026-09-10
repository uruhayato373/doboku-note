import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadInstagramImagesInOrder } from '../scripts/lib/instagram-image-upload.mjs';

function fixture({ existing = [], reverse = false } = {}) {
  let paths = [...existing], pending;
  const events = [];
  const page = {
    getByRole(_role, { name }) {
      if (name === '写真を削除') return {
        count: async () => paths.length,
        evaluateAll: async () => [...paths],
      };
      return { first: () => ({ click: async () => {} }) };
    },
    waitForEvent: async () => ({ setFiles: async file => {
      assert.equal(pending, undefined, '次の画像は前の処理が完了するまで送らない');
      pending = file; events.push(`send:${file}`);
    } }),
    waitForFunction: async () => {
      paths.push(`/photos/${pending}`);
      if (reverse) paths.reverse();
      events.push(`ready:${pending}`); pending = undefined;
    },
  };
  return { page, events };
}

test('waits for each upload and records the source-to-remote order', async () => {
  const { page, events } = fixture();
  const result = await uploadInstagramImagesInOrder(page, ['cover.png', 'body.png', 'cta.png']);
  assert.deepEqual(events, ['send:cover.png', 'ready:cover.png', 'send:body.png', 'ready:body.png', 'send:cta.png', 'ready:cta.png']);
  assert.deepEqual(result.map(r => r.remotePath), ['/photos/cover.png', '/photos/body.png', '/photos/cta.png']);
});

test('stops if Meta inserts a subsequent image ahead of the cover', async () => {
  const { page, events } = fixture({ reverse: true });
  await assert.rejects(uploadInstagramImagesInOrder(page, ['cover.png', 'body.png', 'cta.png']), /並び順/);
  assert.equal(events.includes('send:cta.png'), false);
});

test('does not append another copy to an existing media list', async () => {
  const { page, events } = fixture({ existing: ['/photos/cover.png'] });
  await assert.rejects(uploadInstagramImagesInOrder(page, ['cover.png']), /画像が残っています/);
  assert.deepEqual(events, []);
});

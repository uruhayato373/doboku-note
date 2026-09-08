import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { channelInventory } from '../scripts/lib/youtube-channel-inventory.mjs';
import { createEnvelopeKeys, sealReport, openReport } from '../scripts/lib/youtube-rollout-envelope.mjs';
const expected = { id: 'UCHRnXPqoc0Hls8nXiK_ZYqA', title: 'doboku-note' };
function mock({ wrongChannel = false, missing = false, repeated = false, empty = false } = {}) {
  let pages = 0;
  return { channels: { list: async () => ({ data: { items: [{ id: wrongChannel ? 'wrong' : expected.id, snippet: { title: expected.title }, contentDetails: { relatedPlaylists: { uploads: 'uploads' } } }] } }) },
    playlistItems: { list: async () => { pages++; return { data: { pageInfo: { totalResults: empty ? 0 : 2 },
      items: empty ? [] : [{ contentDetails: { videoId: pages === 1 ? 'hJYV_U0qKvA' : '8qhSsq9-x6k' } }], ...(pages === 1 || repeated ? { nextPageToken: 'next' } : {}) } }; } },
    videos: { list: async ({ id }) => ({ data: { items: missing ? [] : id.split(',').map(id => ({ id, snippet: { channelId: expected.id } })) } }) } };
}
test('uploadsを全ページ取得し詳細の被覆を検証する', async () => {
  const result = await channelInventory(mock(), expected);
  assert.equal(result.checked, 2); assert.equal(result.complete, true);
});
test('別口座・空集合・ページ循環・詳細欠落は検査不成立', async () => {
  for (const opts of [{ wrongChannel: true }, { missing: true }, { repeated: true }, { empty: true }]) await assert.rejects(channelInventory(mock(opts), expected));
});
test('公開CI向けレポートは手元の秘密鍵でだけ復号でき、改ざんを拒否する', () => {
  const keys = createEnvelopeKeys(), value = { privateTitle: '非公開タイトル', checked: 2 };
  const encrypted = sealReport(value, keys.publicKey);
  assert.ok(!JSON.stringify(encrypted).includes(value.privateTitle));
  assert.deepEqual(openReport(encrypted, keys.privateKey), value);
  assert.throws(() => openReport(encrypted, createEnvelopeKeys().privateKey));
  assert.throws(() => openReport({ ...encrypted, tag: Buffer.alloc(16).toString('base64') }, keys.privateKey));
});
test('棚卸しモードは概要欄同期jobと排他で、artifactは暗号文だけ', () => {
  const wf = yaml.load(readFileSync(new URL('../.github/workflows/sync-yt-descriptions.yml', import.meta.url), 'utf8'));
  assert.equal(wf.on.workflow_dispatch.inputs.operation.default, 'descriptions');
  assert.equal(wf.jobs.sync.if, "inputs.operation == 'descriptions' || inputs.operation == ''");
  const job = wf.jobs['thumbnail-inventory'];
  assert.equal(job.if, "inputs.operation == 'thumbnail-inventory'");
  assert.ok(job.steps.find(s => s.run?.includes('--mode inventory')));
  assert.equal(job.steps.find(s => s.uses?.startsWith('actions/upload-artifact@')).with.path, '.tmp/youtube-rollout-export/*.enc.json');
});

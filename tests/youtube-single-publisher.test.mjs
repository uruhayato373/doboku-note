import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadRegistry, approvalHash, approvalParts } from '../scripts/lib/content-registry.mjs';
import { upsertWorks, upsertPublications, upsertMedia } from '../scripts/lib/content-registry-write.mjs';
import { approvalState } from '../scripts/lib/media-review.mjs';
import { longformInputHash } from '../scripts/lib/longform-render-integrity.mjs';
import { readJson, writeJson } from '../scripts/lib/json-io.mjs';
import { publishYoutubePublication, singlePublishPlan } from '../scripts/lib/youtube-revision-publisher.mjs';
import { writeVisualStandardFixture } from './helpers/youtube-visual-standard.mjs';

const EXAM = 'pe-first-stage', WORK = 'single-fixture', PUB = `${EXAM}/${WORK}/youtube.longform`;
const DEF = `content/sns/video-packs/${EXAM}/${WORK}`;
const NOW = Date.parse('2026-10-26T00:00:00Z'), SLOT = '2026-10-30T20:00:00+09:00';
const sha = value => createHash('sha256').update(value).digest('hex');

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'youtube-single-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'config'), { recursive: true });
  for (const name of ['content-registry', 'youtube-formats', 'youtube-production-disclosure', 'utm-templates']) {
    copyFileSync(join(REPO_ROOT, `config/${name}.json`), join(root, `config/${name}.json`));
  }
  const channel = readJson(root, 'config/youtube-formats.json').channel;
  const disclosure = readJson(root, 'config/youtube-production-disclosure.json');
  writeJson(root, `${DEF}/video-pack.json`, { exam: EXAM, packId: WORK, outputs: { longform: true, shorts: 0 } });
  const coverDigest = sha(Buffer.from('single-cover'));
  writeVisualStandardFixture(root, DEF, { path: `.tmp/media/${EXAM}/${WORK}/youtube.longform/cover.${coverDigest.slice(0, 8)}.png`, sha256: coverDigest });
  const media = {};
  for (const role of ['video', 'cover']) {
    const data = Buffer.from(`single-${role}`), digest = sha(data);
    const path = `.tmp/media/${EXAM}/${WORK}/youtube.longform/${role}.${digest.slice(0, 8)}.${role === 'video' ? 'mp4' : 'png'}`;
    mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), data);
    media[role] = { id: `${PUB}/${role}`, role, type: role === 'video' ? 'video/mp4' : 'image/png', sha256: digest, bytes: data.length,
      store: { tier: 'drive', path }, provenance: { kind: 'render', by: 'fixture', ...(role === 'video' ? { renderInputSha256: longformInputHash(join(root, DEF)) } : {}) },
      ...(role === 'video' ? { durationSec: 10 } : { width: 1920, height: 1080 }) };
  }
  upsertMedia(root, EXAM, Object.values(media));
  writeJson(root, `${DEF}/youtube.json`, { schemaVersion: 1, channel, longform: { key: 'longform', title: '初回動画',
    description: `${disclosure.authorityNotice}\nutm_source=youtube&utm_medium=video&utm_campaign=${WORK}`,
    tags: ['学習'], publishAt: SLOT, r2Key: `video/render/${WORK}/video.mp4`, thumbnailR2Key: `video/render/${WORK}/cover.png`,
    sha256: media.video.sha256, thumbnailSha256: media.cover.sha256 }, shorts: [] });
  upsertWorks(root, EXAM, [{ id: WORK, kind: 'video-pack', definition: DEF, qa: { avg: 3, blocks: 0, at: '2026-10-26', by: 'fixture' } }]);
  upsertPublications(root, 'youtube', EXAM, [{ id: PUB, work: WORK, account: 'youtube:main', format: 'longform', status: 'rendered',
    copy: `${DEF}/youtube.json#longform`, publishAt: SLOT, media: { video: media.video.id, cover: media.cover.id } }]);
  const reg = loadRegistry(root), pub = reg.publications.find(p => p.id === PUB), byId = new Map(reg.media.map(m => [m.id, m]));
  const state = approvalState(root, pub, byId);
  upsertPublications(root, 'youtube', EXAM, [{ ...pub,
    review: { visual: { status: 'approved', by: 'user', at: new Date(NOW).toISOString(), digest: state.visual.current } },
    approval: { by: 'user', at: new Date(NOW).toISOString(), contentSha256: approvalHash(approvalParts(root, pub, byId)) } }]);
  return { root, channel };
}

test('初回通常動画は承認・素材SHA・日時を検査し、入力変更なら停止する', t => {
  const { root } = fixture(t);
  const plan = singlePublishPlan(root, PUB, NOW);
  assert.deepEqual(plan.blockers, []);
  assert.match(plan.marker, /^dn-single-/);
  const input = readJson(root, `${DEF}/youtube.json`);
  input.longform.title = '承認後の別題名'; writeJson(root, `${DEF}/youtube.json`, input);
  assert.ok(singlePublishPlan(root, PUB, NOW).blockers.includes('current-approval-missing'));
});

test('POP表紙または図解本文の指定を外した通常動画は投稿計画で止める', t => {
  const { root } = fixture(t);
  const storyboard = readJson(root, `${DEF}/storyboard.json`);
  delete storyboard.imageDesign.coverRevision;
  writeJson(root, `${DEF}/storyboard.json`, storyboard);
  assert.throws(() => singlePublishPlan(root, PUB, NOW), /POP表紙/);
});

test('アップロード応答を失ってもR2 intentから同じ動画を二重投入しない', async t => {
  const { root, channel } = fixture(t), journalState = { value: null };
  const journal = { async load() { return journalState.value; }, async save(record) { journalState.value = structuredClone(record); } };
  let inserts = 0;
  const youtube = {
    channels: { list: async () => ({ data: { items: [{ id: channel.id, snippet: { title: channel.title }, contentDetails: { relatedPlaylists: { uploads: 'uploads' } } }] } }) },
    playlistItems: { list: async () => ({ data: { pageInfo: { totalResults: 1 }, items: [{ contentDetails: { videoId: 'existing001' } }] } }) },
    videos: {
      list: async () => ({ data: { items: [{ id: 'existing001', snippet: { channelId: channel.id, tags: [] }, status: { privacyStatus: 'public' } }] } }),
      insert: async () => { inserts++; throw new Error('応答不明'); },
    },
  };
  const expect = singlePublishPlan(root, PUB, NOW).digest;
  const run = () => publishYoutubePublication(root, { pubId: PUB, phase: 'upload', commit: true, expect }, { youtube, journal, now: () => NOW });
  await assert.rejects(run(), /upload結果不明/);
  await assert.rejects(run(), /upload結果不明/);
  assert.equal(inserts, 1);
  assert.equal(journalState.value.delivery.inputSha256, expect);
});

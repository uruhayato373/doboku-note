import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, copyFileSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadRegistry, approvalHash, approvalParts } from '../scripts/lib/content-registry.mjs';
import { upsertWorks, upsertPublications, upsertMedia, publicationWriteSession } from '../scripts/lib/content-registry-write.mjs';
import { prepareYoutubeRevision } from '../scripts/lib/registry-youtube-revision.mjs';
import { publishYoutubeRevision, revisionPublishPlan } from '../scripts/lib/youtube-revision-publisher.mjs';
import { longformInputHash } from '../scripts/lib/longform-render-integrity.mjs';
import { approvalState } from '../scripts/lib/media-review.mjs';
import { readJson, writeJson } from '../scripts/lib/json-io.mjs';
import { RegistryPublications } from '../scripts/lib/dataset-schemas-content.mjs';

const EXAM = 'civil-construction-2', WORK = 'revision-fixture', OLD = `${EXAM}/${WORK}/youtube.longform`, NEW = `${OLD}.diagram-led`;
const DEF = `content/sns/video-packs/${EXAM}/${WORK}`, NOW = Date.parse('2026-10-21T00:00:00Z'), SLOT = '2026-10-25T20:00:00+09:00';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const rowOf = (root, id = NEW) => loadRegistry(root).publications.find(p => p.id === id);
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'revision-publisher-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'config'), { recursive: true });
  for (const name of ['content-registry', 'youtube-formats', 'youtube-production-disclosure', 'utm-templates']) copyFileSync(join(REPO_ROOT, `config/${name}.json`), join(root, `config/${name}.json`));
  const channel = readJson(root, 'config/youtube-formats.json').channel;
  const disclosure = readJson(root, 'config/youtube-production-disclosure.json');
  writeJson(root, `${DEF}/video-pack.json`, { exam: EXAM, packId: WORK, outputs: { longform: true, shorts: 0 } });
  writeJson(root, `${DEF}/storyboard.json`, { scenes: [] });
  writeJson(root, `${DEF}/youtube.json`, { longform: { title: '同じ題名', description: `${disclosure.authorityNotice}\nutm_source=youtube&utm_medium=video&utm_campaign=${WORK}`, tags: ['学習'] } });
  upsertWorks(root, EXAM, [{ id: WORK, kind: 'video-pack', definition: DEF, qa: { avg: 3, blocks: 0, at: '2026-10-21', by: 'fixture' } }]);
  upsertPublications(root, 'youtube', EXAM, [{ id: OLD, work: WORK, format: 'longform', account: 'youtube:main', status: 'published',
    copy: `${DEF}/youtube.json#longform`, approval: { by: 'user', contentSha256: null, grandfathered: true },
    platform: { id: 'oldvid00001', privacy: 'public', evidence: { kind: 'test', ref: 'original' } } }]);
  const buffers = {};
  for (const role of ['video', 'cover', 'subtitles']) {
    const bytes = buffers[role] = Buffer.from(`new-${role}`), sha256 = sha(bytes);
    const ext = { video: 'mp4', cover: 'png', subtitles: 'ass' }[role];
    const path = `.tmp/media/${EXAM}/${WORK}/work/candidate-${role}.${sha256.slice(0, 8)}.${ext}`;
    mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), bytes);
    upsertMedia(root, EXAM, [{ id: `${EXAM}/${WORK}/work/candidate-${role}`, role: `candidate-${role}`, type: { video: 'video/mp4', cover: 'image/png', subtitles: 'text/x-ssa' }[role],
      sha256, bytes: bytes.length, store: { tier: 'drive', path }, provenance: { kind: 'render', by: 'fixture', ...(role === 'video' ? { renderInputSha256: longformInputHash(join(root, DEF)) } : {}) },
      ...(role === 'video' ? { durationSec: 10 } : role === 'cover' ? { width: 1920, height: 1080 } : {}) }]);
  }
  const options = { pubId: OLD, variant: 'diagram-led', publishAt: SLOT, now: NOW };
  const dry = prepareYoutubeRevision(root, options); prepareYoutubeRevision(root, { ...options, commit: true, expect: dry.digest });
  approveFixture(root);
  return { root, channel, disclosure, buffers };
}
function approveFixture(root, id = NEW) {
  const reg = loadRegistry(root), row = reg.publications.find(p => p.id === id), media = new Map(reg.media.map(m => [m.id, m]));
  const state = approvalState(root, row, media);
  upsertPublications(root, 'youtube', EXAM, [{ ...row, status: 'approved', review: { visual: { status: 'approved', by: 'user', at: new Date(NOW).toISOString(), digest: state.visual.current } },
    approval: { by: 'user', at: new Date(NOW).toISOString(), contentSha256: approvalHash(approvalParts(root, row, media)) } }]);
}
function shortFixture(t) {
  const f = fixture(t), oldId = `${EXAM}/${WORK}/youtube.short.point`, id = `${oldId}-diagram-led`;
  writeJson(f.root, `${DEF}/short-copy.json`, { title: '短い説明', description: `${f.disclosure.authorityNotice}\nutm_source=youtube&utm_medium=video&utm_campaign=${WORK}`, tags: ['学習'] });
  f.buffers.video = Buffer.from('short-video');
  upsertPublications(f.root, 'youtube', EXAM, [{ id: oldId, work: WORK, format: 'short', variant: 'point', account: 'youtube:main',
    status: 'draft', copy: `${DEF}/short-copy.json`, relatedTo: OLD }]);
  for (const role of ['video', 'cover', 'subtitles', 'recipe']) {
    const bytes = role === 'recipe' ? Buffer.from(JSON.stringify({ verifiedOutput: { sha256: sha(f.buffers.video) } })) : f.buffers[role];
    const path = `.tmp/short-${role}`; writeFileSync(join(f.root, path), bytes);
    upsertMedia(f.root, EXAM, [{ id: `${EXAM}/${WORK}/work/candidate-point-${role}`, role: `candidate-point-${role}`, type: 'application/octet-stream',
      sha256: sha(bytes), bytes: bytes.length, store: { tier: 'drive', path }, provenance: { kind: 'render', by: 'fixture' },
      ...(role === 'video' ? { durationSec: 10 } : role === 'cover' ? { width: 1080, height: 1920 } : {}) }]);
  }
  const options = { pubId: oldId, variant: 'point-diagram-led', relatedTo: NEW, publishAt: SLOT, now: NOW };
  const dry = prepareYoutubeRevision(f.root, options); prepareYoutubeRevision(f.root, { ...options, commit: true, expect: dry.digest });
  approveFixture(f.root, id);
  return { ...f, id, width: 1080, height: 1920 };
}
function mockYoutube(f) {
  const db = new Map([['oldvid00001', { id: 'oldvid00001', snippet: { title: '同じ題名', channelId: f.channel.id }, status: { privacyStatus: 'public' } }]]);
  const calls = { insert: 0, update: 0, thumbnail: 0, read: 0 };
  const mode = {};
  const consume = async stream => { const chunks = []; for await (const c of stream) chunks.push(c); return Buffer.concat(chunks); };
  const youtube = {
    channels: { list: async () => { calls.read++; return { data: { items: [{ id: mode.wrongChannel ? 'wrong-channel' : f.channel.id, snippet: { title: f.channel.title }, contentDetails: { relatedPlaylists: { uploads: 'uploads' } } }] } }; } },
    playlistItems: { list: async () => ({ data: { items: [...db.keys()].map(videoId => ({ contentDetails: { videoId } })), pageInfo: { totalResults: db.size } } }) },
    videos: {
      list: async ({ id }) => { calls.read++; const ids = Array.isArray(id) ? id : id.split(','); return { data: { items: structuredClone(ids.map(x => db.get(x)).filter(Boolean)) } }; },
      insert: async (args, options) => {
        calls.insert++; assert.equal(options.retry, false); assert.equal(args.requestBody.status.privacyStatus, 'private'); assert.equal(args.requestBody.status.publishAt, undefined);
        assert.deepEqual(await consume(args.media.body), f.buffers.video);
        if (mode.rejectUpload) throw new Error('mock rejection');
        const id = 'newvid00001';
        db.set(id, { id, snippet: { ...args.requestBody.snippet, channelId: f.channel.id },
          status: { ...args.requestBody.status, uploadStatus: mode.pending ? 'uploaded' : 'processed' }, processingDetails: { processingStatus: mode.pending ? 'processing' : 'succeeded' },
          contentDetails: { duration: 'PT10S' }, fileDetails: { fileSize: String(f.buffers.video.length), durationMs: '10000', videoStreams: [{ widthPixels: f.width ?? 1920, heightPixels: f.height ?? 1080 }], audioStreams: [{}] } });
        if (mode.afterInsert) mode.afterInsert();
        if (mode.lostUpload) throw new Error('lost response');
        return { data: { id: mode.oldIdResponse ? 'oldvid00001' : id } };
      },
      update: async (args, options) => {
        calls.update++; assert.equal(options.retry, false); assert.equal(args.part, 'status'); assert.equal(args.requestBody.id, 'newvid00001');
        const v = db.get(args.requestBody.id);
        if (!mode.rejectSchedule) Object.assign(v.status, args.requestBody.status);
        if (mode.wrongSchedule) v.status.publishAt = '2026-10-26T00:00:00Z';
        if (mode.lostSchedule || mode.rejectSchedule) throw new Error('schedule outcome unknown');
        return { data: structuredClone(v) };
      },
    },
    thumbnails: { set: async (args, options) => {
      calls.thumbnail++; assert.equal(options.retry, false); assert.deepEqual(await consume(args.media.body), f.buffers.cover);
      const thumbnails = { high: { url: 'https://example.test/new-thumbnail.png' } };
      db.get(args.videoId).snippet.thumbnails = thumbnails;
      if (mode.afterThumbnail) mode.afterThumbnail();
      if (mode.lostThumbnail) throw new Error('lost thumbnail response');
      return { data: { items: [thumbnails] } };
    } },
  };
  return { youtube, db, calls, mode };
}
const execute = async (f, api, phase = 'upload', id = NEW) => publishYoutubeRevision(f.root, { pubId: id, phase, commit: true, expect: revisionPublishPlan(f.root, id, NOW).digest }, { youtube: api.youtube, now: () => NOW });

test('dry-runはAPIに触れず、旧公開ID・未承認・別SHAを外部操作前に止める', async t => {
  const f = fixture(t), api = mockYoutube(f), old = rowOf(f.root, OLD);
  const before = readFileSync(join(f.root, 'content/registry/publications/youtube/civil-construction-2.json'));
  const result = await publishYoutubeRevision(f.root, { pubId: NEW }, { youtube: new Proxy({}, { get() { throw new Error('API touched'); } }), now: () => NOW });
  assert.equal(result.dryRun, true); assert.equal(result.externalActions, 0); assert.equal(result.checkedMedia, 3);
  assert.deepEqual(readFileSync(join(f.root, 'content/registry/publications/youtube/civil-construction-2.json')), before);
  await assert.rejects(publishYoutubeRevision(f.root, { pubId: OLD }), /改訂公開ID/);
  upsertPublications(f.root, 'youtube', EXAM, [{ ...rowOf(f.root), approval: undefined }]);
  await assert.rejects(execute(f, api), /approval/); assert.equal(api.calls.read, 0);
  const input = readJson(f.root, rowOf(f.root).copy); writeFileSync(join(f.root, input.localFile), 'modified');
  assert.throws(() => revisionPublishPlan(f.root, NEW, NOW), /SHA/);
  assert.deepEqual(rowOf(f.root, OLD), old);
});

test('新IDだけへ非公開/予約/実査結果を保存し、同名旧版と旧入力を保持、再実行で二重投稿しない', async t => {
  const f = fixture(t), api = mockYoutube(f), old = rowOf(f.root, OLD), input = readFileSync(join(f.root, `${DEF}/youtube.json`));
  assert.equal((await execute(f, api)).result, 'private-ready');
  assert.equal(rowOf(f.root).platform.id, 'newvid00001'); assert.equal(rowOf(f.root).status, 'uploaded_private');
  assert.equal((await execute(f, api, 'schedule')).result, 'scheduled-verified');
  assert.equal(rowOf(f.root).publishAt, SLOT); assert.equal(rowOf(f.root).status, 'scheduled');
  await execute(f, api, 'schedule'); await execute(f, api, 'verify');
  assert.equal(api.calls.insert, 1); assert.equal(api.calls.thumbnail, 1); assert.equal(api.calls.update, 1);
  api.db.get('newvid00001').status.privacyStatus = 'public';
  const later = Date.parse(SLOT) + 1000;
  assert.equal((await publishYoutubeRevision(f.root, { pubId: NEW, phase: 'verify', commit: true, expect: revisionPublishPlan(f.root, NEW, later).digest }, { youtube: api.youtube, now: () => later })).result, 'published-verified');
  assert.equal(rowOf(f.root).platform.publishedAt, undefined); // 観測時刻を実公開時刻と偽らない
  assert.deepEqual(rowOf(f.root, OLD), old); assert.deepEqual(readFileSync(join(f.root, `${DEF}/youtube.json`)), input);
});

test('APIが制作開示 false を省略しても、他の投稿同一性が合えば採用する', async t => {
  const f = fixture(t), api = mockYoutube(f);
  api.mode.afterInsert = () => { delete api.db.get('newvid00001').status.containsSyntheticMedia; };
  assert.equal((await execute(f, api)).result, 'private-ready');
  assert.equal(api.calls.insert, 1);
});

test('upload応答消失はmarker照合で回収し、結果未確認の0件では再投稿しない', async t => {
  const f = fixture(t), api = mockYoutube(f); api.mode.lostUpload = true;
  await assert.rejects(execute(f, api), /upload結果不明/);
  assert.ok(rowOf(f.root).delivery.uploadRequestedAt); assert.equal(rowOf(f.root).delivery.videoId, undefined);
  assert.equal((await execute(f, api, 'verify')).result, 'private-thumbnail-unverified'); assert.equal(api.calls.insert, 1);
  await execute(f, api); assert.equal(api.calls.insert, 1);
  const other = fixture(t), rejected = mockYoutube(other); rejected.mode.rejectUpload = true;
  await assert.rejects(execute(other, rejected), /upload結果不明/);
  await assert.rejects(execute(other, rejected), /再投稿せず/); assert.equal(rejected.calls.insert, 1);
});

test('marker複数・チャンネル違い・旧動画IDの応答を採用しない', async t => {
  const f = fixture(t), api = mockYoutube(f); api.mode.wrongChannel = true;
  await assert.rejects(execute(f, api), /account mismatch/); assert.equal(api.calls.insert, 0);
  api.mode.wrongChannel = false; api.mode.lostUpload = true;
  await assert.rejects(execute(f, api), /upload結果不明/);
  api.db.set('newvid00002', { ...structuredClone(api.db.get('newvid00001')), id: 'newvid00002' });
  await assert.rejects(execute(f, api, 'verify'), /複数/); assert.equal(api.calls.insert, 1);
  const other = fixture(t), bad = mockYoutube(other); bad.mode.oldIdResponse = true;
  await assert.rejects(execute(other, bad), /旧動画/); assert.equal(rowOf(other.root).platform, undefined);
});

test('処理待ち・処理失敗・ファイルサイズ不一致で予約せず、動画を再投稿しない', async t => {
  const f = fixture(t), api = mockYoutube(f); api.mode.pending = true;
  assert.equal((await execute(f, api)).result, 'processing-pending'); assert.equal(api.calls.thumbnail, 0);
  api.db.get('newvid00001').processingDetails.processingStatus = 'failed';
  await assert.rejects(execute(f, api, 'verify'), /処理失敗/);
  const v = api.db.get('newvid00001'); v.processingDetails.processingStatus = 'succeeded'; v.status.uploadStatus = 'processed'; v.fileDetails.fileSize = '999';
  await assert.rejects(execute(f, api, 'schedule'), /file size/);
  assert.equal(api.calls.insert, 1); assert.equal(api.calls.update, 0);
});

test('予約応答消失は実査だけで回収、適用不明の予約要求は自動再送しない', async t => {
  const f = fixture(t), api = mockYoutube(f); await execute(f, api); api.mode.lostSchedule = true;
  await assert.rejects(execute(f, api, 'schedule'), /schedule結果不明/);
  assert.equal(rowOf(f.root).status, 'uploaded_private');
  assert.equal((await execute(f, api, 'verify')).result, 'scheduled-verified'); assert.equal(api.calls.update, 1);
  const other = fixture(t), rejected = mockYoutube(other); await execute(other, rejected); rejected.mode.rejectSchedule = true;
  await assert.rejects(execute(other, rejected, 'schedule'), /schedule結果不明/);
  await assert.rejects(execute(other, rejected, 'schedule'), /再送せず/); assert.equal(rejected.calls.update, 1);
});

test('thumbnail応答消失は再送せず、予約も止める', async t => {
  const f = fixture(t), api = mockYoutube(f); api.mode.lostThumbnail = true;
  await assert.rejects(execute(f, api), /thumbnail結果不明/);
  await assert.rejects(execute(f, api), /自動再送しない/);
  await assert.rejects(execute(f, api, 'schedule'), /表紙/);
  assert.equal(api.calls.insert, 1); assert.equal(api.calls.thumbnail, 1); assert.equal(api.calls.update, 0);
});

test('台帳の並行変更時は保存を止め、次の照合で新IDを回収し他者の変更を保持する', async t => {
  const f = fixture(t), api = mockYoutube(f);
  api.mode.afterInsert = () => upsertPublications(f.root, 'youtube', EXAM, [{ ...rowOf(f.root, OLD), reason: 'parallel-edit' }]);
  await assert.rejects(execute(f, api), /並行変更/);
  assert.equal(rowOf(f.root).delivery.videoId, undefined); assert.equal(rowOf(f.root, OLD).reason, 'parallel-edit');
  await execute(f, api, 'verify'); assert.equal(rowOf(f.root).delivery.videoId, 'newvid00001'); assert.equal(api.calls.insert, 1);
  assert.equal(rowOf(f.root, OLD).reason, 'parallel-edit');
  const session = publicationWriteSession(f.root, 'youtube', EXAM);
  assert.throws(() => publicationWriteSession(f.root, 'youtube', EXAM), /EEXIST/); session.close();
});

test('期限切れ・承認後の文面変更・同じ素材を使う別実行を投入前に止める', async t => {
  const f = fixture(t), api = mockYoutube(f);
  const future = Date.parse(SLOT) + 1000;
  await assert.rejects(publishYoutubeRevision(f.root, { pubId: NEW, commit: true, expect: revisionPublishPlan(f.root, NEW, future).digest }, { youtube: api.youtube, now: () => future }), /future-slot/);
  const row = rowOf(f.root), input = readJson(f.root, row.copy); input.title = '変更後'; writeJson(f.root, row.copy, input);
  await assert.rejects(execute(f, api), /approval/); assert.equal(api.calls.insert, 0);
  approveFixture(f.root); const current = rowOf(f.root);
  upsertPublications(f.root, 'youtube', EXAM, [{ ...current, id: `${OLD}.another`, variant: 'another', platform: { id: 'othervid001', privacy: 'private' } }]);
  await assert.rejects(execute(f, api), /duplicate-media/); assert.equal(api.calls.insert, 0);
});

test('Shortsは新版関連先の確認を必須とし、旧IDや非公開の親へ誘導したまま予約しない', async t => {
  const f = shortFixture(t), api = mockYoutube(f);
  await execute(f, api, 'upload', f.id);
  await assert.rejects(execute(f, api, 'schedule', f.id), /Studio確認/);
  const parentId = 'longvid0001';
  upsertPublications(f.root, 'youtube', EXAM, [{ ...rowOf(f.root), platform: { id: parentId, privacy: 'private' } }]);
  let short = rowOf(f.root, f.id);
  upsertPublications(f.root, 'youtube', EXAM, [{ ...short, platform: { ...short.platform, relatedVideoId: 'oldvid00001', desiredRelatedVideoId: parentId } }]);
  await assert.rejects(execute(f, api, 'schedule', f.id), /Studio確認/);
  short = rowOf(f.root, f.id);
  upsertPublications(f.root, 'youtube', EXAM, [{ ...short, platform: { ...short.platform, relatedVideoId: parentId } }]);
  api.db.set(parentId, { id: parentId, snippet: { channelId: f.channel.id }, status: { privacyStatus: 'private' } });
  await assert.rejects(execute(f, api, 'schedule', f.id), /視聴できない/);
  api.db.get(parentId).status.privacyStatus = 'public';
  assert.equal((await execute(f, api, 'schedule', f.id)).result, 'scheduled-verified');
  assert.equal(api.calls.update, 1); assert.equal(api.calls.insert, 1);
});

test('予約日時の実査不一致・途中の即時公開は成功扱いせず、自動修正しない', async t => {
  const f = fixture(t), api = mockYoutube(f); await execute(f, api); api.mode.wrongSchedule = true;
  await assert.rejects(execute(f, api, 'schedule'), /読取不一致/);
  assert.equal(rowOf(f.root).status, 'uploaded_private'); assert.equal(rowOf(f.root).delivery.scheduledVerifiedAt, undefined);
  await assert.rejects(execute(f, api, 'verify'), /要求していない予約/); assert.equal(api.calls.update, 1);
  const other = fixture(t), changed = mockYoutube(other);
  changed.mode.afterThumbnail = () => { changed.db.get('newvid00001').status.privacyStatus = 'public'; };
  await assert.rejects(execute(other, changed), /公開状態/); assert.equal(changed.calls.update, 0);
  await assert.rejects(execute(other, changed, 'verify'), /即時公開/);
});

test('外部IDだけの行・実行後の入力変更・不完全なdeliveryを拒否し、開始失敗のlockを残さない', async t => {
  const f = fixture(t), api = mockYoutube(f);
  upsertPublications(f.root, 'youtube', EXAM, [{ ...rowOf(f.root), platform: { id: 'newvid00001', privacy: 'private' } }]);
  await assert.rejects(execute(f, api), /実行記録/); assert.equal(api.calls.insert, 0);
  upsertPublications(f.root, 'youtube', EXAM, [{ ...rowOf(f.root), platform: undefined }]);
  await execute(f, api);
  const input = readJson(f.root, rowOf(f.root).copy); input.title = '実行後の変更'; writeJson(f.root, rowOf(f.root).copy, input);
  approveFixture(f.root);
  await assert.rejects(execute(f, api, 'verify'), /実行開始後/); assert.equal(api.calls.insert, 1);
  const path = 'content/registry/publications/youtube/civil-construction-2.json', doc = readJson(f.root, path), index = doc.publications.findIndex(p => p.id === NEW);
  for (const mutate of [p => { delete p.revisionOf; }, p => { p.delivery.videoId = 'othervid001'; },
    p => { delete p.delivery.thumbnailRequestedAt; }, p => { p.delivery.scheduleRequestedAt = new Date(NOW).toISOString(); },
    p => { p.delivery.scheduledVerifiedAt = new Date(NOW).toISOString(); }]) {
    const changed = structuredClone(doc); mutate(changed.publications[index]); assert.equal(RegistryPublications.safeParse(changed).success, false);
  }
  rmSync(join(f.root, path));
  assert.throws(() => publicationWriteSession(f.root, 'youtube', EXAM), /ENOENT/);
  assert.equal(existsSync(join(f.root, `${path}.lock`)), false);
});

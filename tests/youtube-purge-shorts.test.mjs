import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, protectedIds, purgePlan } from '../scripts/lib/youtube-purge-shorts.mjs';

const vid = (id, o = {}) => ({ id, snippet: { publishedAt: '2026-10-05T00:00:00Z' }, status: { privacyStatus: 'private' }, contentDetails: { duration: 'PT30S' },
  fileDetails: { videoStreams: [{ widthPixels: 1080, heightPixels: 1920 }] }, ...o });
const pubs = [
  { id: 'a/x/youtube.longform', channel: 'youtube', format: 'longform', status: 'uploaded_private', platform: { id: 'keeplong001' } },
  { id: 'a/x/youtube.short.k', channel: 'youtube', format: 'short', status: 'scheduled', platform: { id: 'keepshort01' } },
  { id: 'a/x/youtube.short.old', channel: 'youtube', format: 'short', status: 'uploaded_private', platform: { id: 'oldshort001' } },
  { id: 'a/x/youtube.short.stopped', channel: 'youtube', format: 'short', status: 'stopped', platform: { id: 'oldshort002' } },
];

test('protectedIds: 予約・公開の行と、止めていない通常動画だけを守る', () => {
  assert.deepEqual([...protectedIds(pubs)].sort(), ['keeplong001', 'keepshort01']);
});

test('classify: 非公開・予約なし・縦長・3 分以内だけを消す。判定できないものは消さない', () => {
  const keep = protectedIds(pubs);
  assert.equal(classify(vid('oldshort001'), keep), 'purge');
  assert.equal(classify(vid('keepshort01'), keep), 'protected');
  assert.equal(classify(vid('p', { status: { privacyStatus: 'public' } }), keep), 'not-private');
  assert.equal(classify(vid('s', { status: { privacyStatus: 'private', publishAt: '2026-12-01T00:00:00Z' } }), keep), 'scheduled');
  assert.equal(classify(vid('l', { fileDetails: { videoStreams: [{ widthPixels: 1920, heightPixels: 1080 }] } }), keep), 'landscape');
  assert.equal(classify(vid('r', { fileDetails: { videoStreams: [{ widthPixels: 1920, heightPixels: 1080, rotation: 'clockwise' }] } }), keep), 'purge');
  assert.equal(classify(vid('u', { fileDetails: undefined }), keep), 'shape-unknown');
  assert.equal(classify(vid('d', { contentDetails: {} }), keep), 'shape-unknown');
  assert.equal(classify(vid('v', { contentDetails: { duration: 'PT5M' } }), keep), 'long-vertical');
});

test('purgePlan: 対象の集合で digest が決まり、台帳の行と結べるものを返す', () => {
  const videos = [vid('oldshort002'), vid('oldshort001'), vid('keepshort01'), vid('nolegder001')];
  const plan = purgePlan(videos, pubs);
  assert.equal(plan.checked, 4);
  assert.deepEqual(plan.targets.map((v) => v.id), ['nolegder001', 'oldshort001', 'oldshort002']);
  assert.deepEqual(plan.ledgerRows, ['a/x/youtube.short.old', 'a/x/youtube.short.stopped']);
  assert.deepEqual(plan.byMonth, { '2026-10': 3 });
  // 縦横が読めなくても、台帳のショートの行と結べれば対象。結べなければ対象にしない
  const blind = purgePlan([vid('oldshort001', { fileDetails: undefined }), vid('unknown0001', { fileDetails: undefined })], pubs);
  assert.deepEqual(blind.targets.map((v) => v.id), ['oldshort001']);
  assert.equal(blind.counts['shape-unknown'], 1);
  assert.equal(plan.digest, purgePlan([...videos].reverse(), pubs).digest);
  assert.notEqual(plan.digest, purgePlan(videos.slice(1), pubs).digest);
});

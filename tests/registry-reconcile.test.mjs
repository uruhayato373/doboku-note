import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileYoutube } from '../scripts/lib/registry-reconcile.mjs';

const now = new Date('2026-10-09T12:00:00Z');
const opts = { now, graceDays: 1, evidenceRef: 'videos.list@2026-10-09T12:00:00.000Z' };
const pub = (id, status, extra = {}) => ({ id, status, platform: { id: `v-${id}`, privacy: 'private' }, ...extra });
const seen = (entries) => new Map(entries.map(([id, privacy, publishedAt = null]) => [`v-${id}`, { privacy, publishedAt }]));

test('予約の動画が public なら published へ進め、証拠と公開時刻を付ける', () => {
  const r = reconcileYoutube([pub('a', 'scheduled')], seen([['a', 'public', '2026-10-07T11:00:00Z']]), opts);
  assert.equal(r.checked, 1);
  assert.deepEqual(r.advance, [{ id: 'a', platform: { id: 'v-a', privacy: 'public', publishedAt: '2026-10-07T11:00:00.000Z', evidence: { kind: 'youtube-api', ref: opts.evidenceRef } } }]);
  assert.deepEqual(r.findings, []);
});

test('後戻り・消えたものは進めず fail の所見にする', () => {
  const r = reconcileYoutube([pub('a', 'published'), pub('b', 'scheduled')], seen([['a', 'private']]), opts);
  assert.deepEqual(r.advance, []);
  assert.deepEqual(r.findings.map((f) => [f.id, f.severity, f.code]), [['a', 'fail', 'not-public'], ['b', 'fail', 'gone']]);
});

test('期日を過ぎても非公開の予約は warn、予約前に public のものも warn（状態は人が決める）', () => {
  const r = reconcileYoutube([
    pub('a', 'scheduled', { publishAt: '2026-10-07T11:00:00Z' }),
    pub('b', 'scheduled', { publishAt: '2026-10-09T11:00:00Z' }),
    pub('c', 'uploaded_private'),
  ], seen([['a', 'private'], ['b', 'private'], ['c', 'public']]), opts);
  assert.deepEqual(r.advance, []);
  assert.deepEqual(r.findings.map((f) => [f.id, f.severity, f.code]), [['a', 'warn', 'overdue'], ['c', 'warn', 'public-before-scheduled']]);
});

test('外部 ID の無い行は数えない（検査 0 件を照合済みと呼ばない）', () => {
  const r = reconcileYoutube([{ id: 'a', status: 'draft' }], new Map(), opts);
  assert.equal(r.checked, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseQueue } from '../scripts/lib/youtube-daily-release.mjs';

const NOW = Date.parse('2026-11-12T12:30:00Z'); // JST 21:30
const lf = (work, extra = {}) => ({ id: `e/${work}/youtube.longform`, channel: 'youtube', format: 'longform', exam: 'e', work, status: 'qa_passed', media: { video: 'v' }, ...extra });
const short = (work, key, extra = {}) => ({ id: `e/${work}/youtube.short.${key}`, channel: 'youtube', format: 'short', exam: 'e', work, variant: key, status: 'draft', ...extra });
const plan = { entries: [{ publicationId: 'e/a/youtube.longform', target: '2027-03-01' }, { publicationId: 'e/b/youtube.longform', target: '2027-01-01' }, { publicationId: 'e/c/youtube.longform', target: '2027-02-01' }] };

test('通常動画はショートの在庫がある作品を先に、残りは目標日の順で 1 日の本数まで', () => {
  const q = releaseQueue({ publications: [lf('a'), lf('b'), lf('c')], stocked: [{ pack: 'e/a', key: 'k1' }], plan, uploadsLeft: 4, longformPerDay: 2, now: NOW });
  assert.deepEqual(q.longforms.map((l) => l.pack), ['e/a', 'e/b']);
  assert.equal(q.remaining.longforms, 3);
  assert.deepEqual(releaseQueue({ publications: [lf('a'), lf('b')], stocked: [], plan, uploadsLeft: 1, longformPerDay: 2, now: NOW }).longforms.length, 1, '割当の残りを超えない');
});

test('ショートは親が予約・公開に進んでから、親の公開の 10 時間後以降で、割当の残りの範囲', () => {
  const parent = lf('a', { status: 'scheduled', publishAt: '2026-11-13T03:15:00Z', platform: { id: 'AAAAAAAAAAA' } });
  const q = releaseQueue({ publications: [parent, lf('b')], stocked: [{ pack: 'e/a', key: 'k1' }, { pack: 'e/a', key: 'k2' }, { pack: 'e/b', key: 'k1' }], plan, uploadsLeft: 3, longformPerDay: 2, now: NOW });
  assert.deepEqual(q.longforms.map((l) => l.pack), ['e/b']);
  assert.deepEqual(q.shorts.map((s) => s.pub), ['e/a/youtube.short.k1', 'e/a/youtube.short.k2']);
  assert.equal(q.shorts[0].notBefore, '2026-11-13T13:15:00.000Z');
});

test('投稿済みのショートは、親が公開されたら関連動画の設定へ、記録済みなら予約へ', () => {
  const parent = lf('a', { status: 'published', publishAt: '2026-11-11T11:30:00Z', platform: { id: 'AAAAAAAAAAA' } });
  const s1 = short('a', 'k1', { status: 'uploaded_private', relatedTo: parent.id, publishAt: '2026-11-13T22:30:00Z', platform: { id: 'BBBBBBBBBBB' } });
  const s2 = short('a', 'k2', { status: 'uploaded_private', relatedTo: parent.id, publishAt: '2026-11-14T08:30:00Z', platform: { id: 'CCCCCCCCCCC', relatedVideoId: 'AAAAAAAAAAA' } });
  const s3 = short('a', 'k3', { status: 'uploaded_private', relatedTo: parent.id, publishAt: '2026-11-12T08:30:00Z', platform: { id: 'DDDDDDDDDDD' } });
  const q = releaseQueue({ publications: [parent, s1, s2, s3], stocked: [], plan, uploadsLeft: 4, longformPerDay: 2, now: NOW });
  assert.deepEqual(q.needRelated.map((x) => x.pub), [s1.id, s3.id]);
  assert.deepEqual(q.toSchedule, [s2.id]);
  assert.deepEqual(q.expired, [s3.id]);
});

test('日時だけ付いて承認の前で止まった通常動画は続きから進め、日時を過ぎた行は出さない', () => {
  const q = releaseQueue({ publications: [lf('a', { publishAt: '2026-11-14T03:15:00Z' }), lf('b', { publishAt: '2026-11-11T03:15:00Z' })], stocked: [], plan, uploadsLeft: 4, longformPerDay: 4, now: NOW });
  assert.deepEqual(q.longforms.map((l) => l.pack), ['e/a']);
});

test('準備まで済んだショートは通常動画より先に割当を取る（日時を過ぎないように）', () => {
  const parent = lf('a', { status: 'scheduled', publishAt: '2026-11-13T03:15:00Z', platform: { id: 'AAAAAAAAAAA' } });
  const prepared = short('a', 'k1', { status: 'rendered', publishAt: '2026-11-13T22:30:00Z' });
  const q = releaseQueue({ publications: [parent, prepared, lf('b'), lf('c')], stocked: [{ pack: 'e/a', key: 'k1' }, { pack: 'e/a', key: 'k2' }], plan, uploadsLeft: 2, longformPerDay: Infinity, now: NOW });
  assert.deepEqual(q.shorts.map((s) => s.pub), ['e/a/youtube.short.k1']);
  assert.deepEqual(q.longforms.map((l) => l.pack), ['e/b']);
});

test('前倒しの間は、承認済みで未投稿の通常動画を付け直しの対象にする', () => {
  const pubs = [lf('a', { status: 'approved', publishAt: '2027-01-01T11:30:00Z' }), lf('b', { status: 'approved', publishAt: '2026-12-01T11:30:00Z', delivery: { uploadRequestedAt: 'x' } })];
  const fl = { ...plan, cycle: { frontLoad: { from: '2026-11-13', to: '2027-01-31' } } };
  assert.deepEqual(releaseQueue({ publications: pubs, stocked: [], plan: fl, uploadsLeft: 4, longformPerDay: 2, now: NOW, today: '2026-11-12' }).toReplace, ['e/a']);
  assert.deepEqual(releaseQueue({ publications: pubs, stocked: [], plan: fl, uploadsLeft: 4, longformPerDay: 2, now: NOW, today: '2027-02-01' }).toReplace, []);
});


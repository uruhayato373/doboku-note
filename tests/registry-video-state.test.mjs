import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistryConfig } from '../scripts/lib/content-registry.mjs';
import { discoverVideoPacks } from '../scripts/lib/content-registry-check.mjs';
import { RegistryPublications, RegistryWorks } from '../scripts/lib/dataset-schemas-content.mjs';
import { readJsonIf } from '../scripts/lib/json-io.mjs';
import {
  VIDEO_STATE_PATH, derivativeToRow, isBareDraft, projectVideoState, rowToDerivative, videoPackRows, videoStateDrift, youtubeView,
} from '../scripts/lib/registry-video-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rules = loadRegistryConfig(ROOT).idRules;
const MATOME = 'content/sns/video-packs/civil-construction-2/matome-2kyu-chokuzen';

test('総まとめパックを作品と通常動画の公開に変換する（状態は今の台帳から写す）', () => {
  const state = { packs: { 'matome-2kyu-chokuzen': { derivatives: { longform: { status: 'qa_passed', qa: { avg: 2.33, blocks: 0, at: '2026-10-08', by: 'qa' } } } } } };
  const { exam, work, publications } = videoPackRows(ROOT, MATOME, { state, rules });
  assert.equal(exam, 'civil-construction-2');
  assert.deepEqual(work, { id: 'matome-2kyu-chokuzen', kind: 'video-pack', definition: MATOME, format: 'compilation', qa: { avg: 2.33, blocks: 0, at: '2026-10-08', by: 'qa' } });
  assert.equal(publications.length, 1);
  assert.equal(publications[0].id, 'civil-construction-2/matome-2kyu-chokuzen/youtube.longform');
  assert.equal(publications[0].status, 'qa_passed');
  assert.equal(publications[0].copy, `${MATOME}/youtube.json#longform`);
});

test('台帳だけの欄（素材・文面）は残し、派生物の欄だけ書き換える', () => {
  const base = { id: 'a/b/youtube.longform', work: 'b', account: 'youtube:main', format: 'longform', status: 'qa_passed', copy: 'x#longform', media: { cover: 'a/b/youtube.longform/cover' }, publishAt: '2026-10-23T20:00:00+09:00' };
  const row = derivativeToRow({ status: 'scheduled', approvedBy: 'user', approvedAt: '2026-10-09T01:00:00.000Z', publishAt: '2026-10-24T03:30:00Z', videoId: 'v1', privacyStatus: 'private', scheduledAt: '2026-10-09T02:00:00.000Z' }, base);
  assert.deepEqual(row.media, base.media);
  assert.equal(row.copy, 'x#longform');
  assert.equal(row.publishAt, '2026-10-24T03:30:00Z');
  assert.deepEqual(row.approval, { by: 'user', at: '2026-10-09T01:00:00.000Z', contentSha256: null, grandfathered: true });
  assert.deepEqual(row.times, { scheduled: '2026-10-09T02:00:00.000Z' });
});

test('知らない欄・user 以外の承認は黙って落とさず投げる', () => {
  const base = { id: 'a/b/youtube.longform', work: 'b', account: 'youtube:main', format: 'longform', status: 'draft' };
  assert.throws(() => derivativeToRow({ status: 'scheduled', lastError: 'x' }, base), /知らない欄.*lastError/);
  assert.throws(() => derivativeToRow({ status: 'approved', approvedBy: 'codex' }, base), /approvedBy は user だけ/);
});

test('published は証拠が無ければ書き手の証拠を付け、あれば残す', () => {
  const base = { id: 'a/b/youtube.longform', work: 'b', account: 'youtube:main', format: 'longform', status: 'scheduled' };
  const row = derivativeToRow({ status: 'published', videoId: 'v1', privacyStatus: 'public' }, base, { evidence: { kind: 'publisher', ref: 'publish-video-pack' } });
  assert.deepEqual(row.platform.evidence, { kind: 'publisher', ref: 'publish-video-pack' });
  const again = derivativeToRow({ status: 'published', videoId: 'v1', privacyStatus: 'public' }, row, { evidence: { kind: 'publisher', ref: 'other' } });
  assert.deepEqual(again.platform.evidence, { kind: 'publisher', ref: 'publish-video-pack' });
});

test('派生物の無い Shorts は素の下書きで、今の台帳には出さない', () => {
  const row = { id: 'a/b/youtube.short.k', work: 'b', account: 'youtube:main', format: 'short', variant: 'k', status: 'draft', relatedTo: 'a/b/youtube.longform' };
  assert.equal(isBareDraft(row), true);
  const projected = projectVideoState({ schemaVersion: 1, packs: {} }, { works: [{ id: 'b', kind: 'video-pack' }], publications: [{ ...row, channel: 'youtube' }] });
  assert.deepEqual(projected.packs, {});
});

test('今の台帳の全パックが欠けなく往復し、型にも合う（取り込み→作り直しで YouTube の部分が同じ）', () => {
  const state = readJsonIf(ROOT, VIDEO_STATE_PATH);
  const packs = discoverVideoPacks(ROOT);
  const reg = { works: [], publications: [] };
  const byExam = new Map();
  let checked = 0;
  for (const packId of Object.keys(state.packs)) {
    const pack = packs.get(packId);
    assert.ok(pack, `${packId}: video-pack.json が無い`);
    const rows = videoPackRows(ROOT, pack.dir, { state, rules, evidence: { kind: 'legacy-ledger', ref: 'video-content-status.json' } });
    reg.works.push(rows.work);
    for (const p of rows.publications) reg.publications.push({ ...p, channel: 'youtube' });
    const e = byExam.get(rows.exam) ?? { works: [], publications: [] };
    e.works.push(rows.work);
    e.publications.push(...rows.publications);
    byExam.set(rows.exam, e);
    checked += 1;
  }
  assert.ok(checked >= 150, `検査したパックが少ない: ${checked}`);
  assert.deepEqual(videoStateDrift(state, reg), []);
  assert.deepEqual(youtubeView(projectVideoState(state, reg)), youtubeView(state));
  for (const [exam, e] of byExam) {
    RegistryWorks.parse({ schemaVersion: 1, exam, works: e.works.sort((a, b) => a.id.localeCompare(b.id)) });
    RegistryPublications.parse({ schemaVersion: 1, channel: 'youtube', exam, publications: e.publications.sort((a, b) => a.id.localeCompare(b.id)) });
  }
});

test('食い違いは欄の名前つきで出す', () => {
  const state = { schemaVersion: 1, packs: { b: { derivatives: { longform: { status: 'scheduled', videoId: 'v1' } } } } };
  const reg = { works: [{ id: 'b', kind: 'video-pack' }], publications: [{ id: 'a/b/youtube.longform', work: 'b', channel: 'youtube', format: 'longform', status: 'published', platform: { id: 'v1' } }] };
  assert.deepEqual(videoStateDrift(state, reg), [{ packId: 'b', what: 'longform: status' }]);
  assert.deepEqual(rowToDerivative(reg.publications[0], reg.works[0]), { status: 'published', videoId: 'v1' });
});

test('今の台帳を作り直すとき instagramReel を落とす（Instagram の台帳が正本）', () => {
  const state = { schemaVersion: 1, packs: {
    only: { derivatives: { instagramReel: [{ key: 'a', status: 'published' }] } },
    mixed: { derivatives: { xThread: { status: 'draft' }, instagramReel: [{ key: 'a', status: 'rendered' }] } },
  } };
  const out = projectVideoState(state, { works: [], publications: [] });
  assert.deepEqual(out.packs, { mixed: { derivatives: { xThread: { status: 'draft' } } } });
  assert.ok(state.packs.only, '元は変えない');
});

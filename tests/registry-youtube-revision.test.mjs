import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadRegistry, loadRegistryConfig } from '../scripts/lib/content-registry.mjs';
import { upsertMedia, upsertPublications, upsertWorks } from '../scripts/lib/content-registry-write.mjs';
import { checkRegistry } from '../scripts/lib/content-registry-check.mjs';
import { projectVideoState, videoPackRows } from '../scripts/lib/registry-video-state.mjs';
import { planYoutubeRevision, prepareYoutubeRevision } from '../scripts/lib/registry-youtube-revision.mjs';
import { writeJson } from '../scripts/lib/json-io.mjs';

const EXAM = 'civil-construction-2', WORK = 'revision-example';
const PUB = `${EXAM}/${WORK}/youtube.longform`;
const DEF = `content/sns/video-packs/${EXAM}/${WORK}`;

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'youtube-revision-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'config'), { recursive: true });
  copyFileSync(join(REPO_ROOT, 'config/content-registry.json'), join(root, 'config/content-registry.json'));
  writeJson(root, `${DEF}/youtube.json`, { longform: { title: '元の題名', description: '元の説明', r2Key: 'old.mp4', sha256: 'a'.repeat(64), publishAt: '2020-01-01T00:00:00Z' } });
  writeJson(root, `${DEF}/video-pack.json`, { exam: EXAM, packId: WORK, outputs: { longform: true, shorts: 0 } });
  upsertWorks(root, EXAM, [{ id: WORK, kind: 'video-pack', definition: DEF }]);
  upsertPublications(root, 'youtube', EXAM, [{ id: PUB, work: WORK, format: 'longform', account: 'youtube:main', status: 'published',
    copy: `${DEF}/youtube.json#longform`, approval: { by: 'user', contentSha256: null, grandfathered: true },
    platform: { id: 'old-video-id', privacy: 'public', evidence: { kind: 'test', ref: 'original' } } }]);
  for (const role of ['video', 'cover', 'subtitles']) {
    const bytes = Buffer.from(`new-${role}`), sha256 = createHash('sha256').update(bytes).digest('hex');
    const ext = { video: 'mp4', cover: 'png', subtitles: 'ass' }[role];
    const path = `.tmp/media/${EXAM}/${WORK}/work/candidate-${role}.${sha256.slice(0, 8)}.${ext}`;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), bytes);
    upsertMedia(root, EXAM, [{ id: `${EXAM}/${WORK}/work/candidate-${role}`, role: `candidate-${role}`, type: 'application/octet-stream',
      sha256, bytes: bytes.length, store: { tier: 'drive', path }, provenance: { kind: 'render', by: 'test' } }]);
  }
  return root;
}

test('改訂を結線しても旧公開行・旧投稿入力・旧投稿経路を保持し、承認/外部IDは複製しない', t => {
  const root = fixture(t), options = { pubId: PUB, variant: 'diagram-led' };
  const before = loadRegistry(root), oldInput = readFileSync(join(root, `${DEF}/youtube.json`), 'utf8');
  const preview = prepareYoutubeRevision(root, options);
  assert.equal(loadRegistry(root).publications.length, 1);
  assert.equal(preview.checkedMedia, 3);
  const saved = prepareYoutubeRevision(root, { ...options, commit: true, expect: preview.digest });
  assert.equal(saved.written, 1);
  const after = loadRegistry(root), original = after.publications.find(p => p.id === PUB), revision = after.publications.find(p => p.revisionOf);
  assert.deepEqual(original, before.publications[0]);
  assert.equal(readFileSync(join(root, `${DEF}/youtube.json`), 'utf8'), oldInput);
  assert.equal(revision.status, 'draft');
  for (const key of ['approval', 'platform', 'times', 'publishAt']) assert.equal(revision[key], undefined, key);
  const input = JSON.parse(readFileSync(join(root, revision.copy)));
  assert.equal(input.sha256, after.media.find(m => m.id === revision.media.video).sha256);
  assert.equal(input.r2Key, undefined);
  assert.equal(prepareYoutubeRevision(root, { ...options, commit: true, expect: preview.digest }).written, 0);
  assert.deepEqual(projectVideoState(null, after), projectVideoState(null, before));
  revision.status = 'approved';
  assert.deepEqual(projectVideoState(null, after), projectVideoState(null, before));
  const rows = videoPackRows(root, DEF, { reg: after, rules: loadRegistryConfig(root).idRules, state: projectVideoState(null, after) });
  assert.equal(rows.publications.length, 1);
  assert.equal(rows.publications[0].platform.id, 'old-video-id');
});

test('候補の改変・誤ったdigest・過去日時・旧ID上書き・既存行変更を拒否する', t => {
  const root = fixture(t), options = { pubId: PUB, variant: 'diagram-led' };
  assert.throws(() => prepareYoutubeRevision(root, { ...options, commit: true, expect: 'wrong' }), /digest/);
  assert.throws(() => planYoutubeRevision(root, { ...options, publishAt: '2020-01-01T00:00:00Z' }), /未来/);
  const preview = prepareYoutubeRevision(root, options);
  prepareYoutubeRevision(root, { ...options, commit: true, expect: preview.digest });
  const reg = loadRegistry(root), rev = reg.publications.find(p => p.revisionOf);
  upsertPublications(root, 'youtube', EXAM, [{ ...rev, status: 'qa_passed' }]);
  assert.throws(() => prepareYoutubeRevision(root, options), /既存の改訂公開行/);
  const video = reg.media.find(m => m.role === 'candidate-video');
  writeFileSync(join(root, video.store.path), 'changed');
  assert.throws(() => prepareYoutubeRevision(root, { ...options, variant: 'another' }), /実ファイルSHA不一致/);
});

test('改訂をoutputsに重複計上せず、別作品への改訂参照と素材SHAの漂流を検出する', t => {
  const root = fixture(t), options = { pubId: PUB, variant: 'diagram-led' };
  const preview = prepareYoutubeRevision(root, options);
  prepareYoutubeRevision(root, { ...options, commit: true, expect: preview.digest });
  let report = checkRegistry(root);
  assert.equal(report.counts.checkedRevisionInputs, 1);
  assert.deepEqual(report.issues.filter(i => i.severity === 'FAIL'), []);
  const reg = loadRegistry(root), revision = reg.publications.find(p => p.revisionOf);
  revision.revisionOf = 'missing';
  reg.media.find(m => m.role === 'candidate-video').sha256 = 'f'.repeat(64);
  report = checkRegistry(root, { reg });
  assert.ok(report.issues.some(i => i.code === 'R04' && i.severity === 'FAIL'));
  assert.ok(report.issues.some(i => i.code === 'R12' && i.severity === 'FAIL'));
});

test('Shortsの新旧関連先を混ぜず、新版通常動画が必要', t => {
  const root = fixture(t), options = { pubId: PUB, variant: 'diagram-led' };
  const preview = prepareYoutubeRevision(root, options);
  prepareYoutubeRevision(root, { ...options, commit: true, expect: preview.digest });
  const reg = loadRegistry(root), oldShortId = `${EXAM}/${WORK}/youtube.short.point`;
  const oldShort = { ...reg.publications.find(p => p.id === PUB), id: oldShortId, format: 'short', variant: 'point', relatedTo: PUB };
  reg.publications.push(oldShort);
  for (const m of [...reg.media]) reg.media.push({ ...m, id: m.id.replace('/candidate-', '/candidate-point-'), role: m.role.replace('candidate-', 'candidate-point-') });
  const args = { pubId: oldShortId, variant: 'point-diagram-led', relatedTo: PUB };
  assert.throws(() => planYoutubeRevision(root, { ...args, variant: 'point' }, reg), /旧公開IDは上書きしない/);
  assert.throws(() => planYoutubeRevision(root, args, reg), /改訂版通常動画/);
  const plan = planYoutubeRevision(root, { ...args, relatedTo: preview.publicationId }, reg);
  assert.equal(plan.row.relatedTo, preview.publicationId);
  assert.equal(plan.row.platform, undefined);
  assert.equal(plan.checkedMedia, 3);
});

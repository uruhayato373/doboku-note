import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, copyFileSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadRegistry, loadRegistryConfig } from '../scripts/lib/content-registry.mjs';
import { upsertMedia, upsertPublications, upsertWorks } from '../scripts/lib/content-registry-write.mjs';
import { checkRegistry } from '../scripts/lib/content-registry-check.mjs';
import { projectVideoState, videoPackRows } from '../scripts/lib/registry-video-state.mjs';
import { planYoutubeRevision, prepareYoutubeRevision, recordYoutubeRevisionQa } from '../scripts/lib/registry-youtube-revision.mjs';
import { writeJson } from '../scripts/lib/json-io.mjs';

const EXAM = 'civil-construction-2', WORK = 'revision-example';
const PUB = `${EXAM}/${WORK}/youtube.longform`;
const DEF = `content/sns/video-packs/${EXAM}/${WORK}`;

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'youtube-revision-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'config'), { recursive: true });
  copyFileSync(join(REPO_ROOT, 'config/content-registry.json'), join(root, 'config/content-registry.json'));
  // この fixture は YouTube の公開だけを作る。R01 の切り替え済み件数検査を他チャネルへ広げない。
  const cfgPath = join(root, 'config/content-registry.json');
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  writeFileSync(cfgPath, `${JSON.stringify({ ...cfg, cutover: ['youtube'] }, null, 2)}\n`);
  // R13（概要欄の VOICEVOX クレジット）は既定の声を character-poses から引く
  copyFileSync(join(REPO_ROOT, 'config/character-poses.json'), join(root, 'config/character-poses.json'));
  writeJson(root, `${DEF}/youtube.json`, { longform: { title: '元の題名', description: '元の説明\n音声：VOICEVOX:青山龍星', r2Key: 'old.mp4', sha256: 'a'.repeat(64), publishAt: '2020-01-01T00:00:00Z' } });
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

test('改訂公開行の画面確認素材を投稿入力の素材と混同しない', t => {
  const root = fixture(t), options = { pubId: PUB, variant: 'diagram-led' };
  const preview = prepareYoutubeRevision(root, options);
  prepareYoutubeRevision(root, { ...options, commit: true, expect: preview.digest });
  const revision = loadRegistry(root).publications.find(p => p.revisionOf);
  upsertPublications(root, 'youtube', EXAM, [{ ...revision, media: { ...revision.media, preview: revision.media.cover } }]);
  const report = checkRegistry(root);
  assert.equal(report.counts.checkedRevisionInputs, 1);
  assert.ok(!report.issues.some(i => i.code === 'R12' && i.severity === 'FAIL'));
});

test('独立QAの合格だけが未承認改訂行をqa_passedにし、承認は記録しない', t => {
  const root = fixture(t), options = { pubId: PUB, variant: 'diagram-led' };
  const preview = prepareYoutubeRevision(root, options);
  prepareYoutubeRevision(root, { ...options, commit: true, expect: preview.digest });
  const pubId = preview.publicationId;
  assert.equal(recordYoutubeRevisionQa(root, { pubId, avg: 2.67, blocks: 0 }).written, 0);
  assert.equal(recordYoutubeRevisionQa(root, { pubId, avg: 2.67, blocks: 0, commit: true, at: '2026-10-27' }).status, 'qa_passed');
  const reg = loadRegistry(root), row = reg.publications.find(p => p.id === pubId);
  assert.equal(row.status, 'qa_passed');
  assert.equal(row.approval, undefined);
  assert.deepEqual(reg.works.find(w => w.id === WORK).qa, { avg: 2.67, blocks: 0, at: '2026-10-27', by: 'Claude Code video-content-qa' });
  assert.throws(() => recordYoutubeRevisionQa(root, { pubId, avg: 2.67, blocks: -1 }), /QAの平均/);
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

test('旧文面が無くても同作品の新文面を明示し、旧公開行を保持した下書きを作れる', t => {
  const root = fixture(t), source = loadRegistry(root).publications[0];
  delete source.copy;
  upsertPublications(root, 'youtube', EXAM, [source]);
  const before = loadRegistry(root).publications[0];
  const copyRef = `${DEF}/youtube.candidate.json#longform`;
  writeJson(root, `${DEF}/youtube.candidate.json`, { longform: { title: '改訂した題名', description: '新しい説明', platform: { id: 'must-not-copy' } } });
  const options = { pubId: PUB, variant: 'diagram-led', copyRef };
  const preview = prepareYoutubeRevision(root, options);
  assert.equal(preview.dryRun, true);
  const saved = prepareYoutubeRevision(root, { ...options, commit: true, expect: preview.digest });
  const after = loadRegistry(root), input = JSON.parse(readFileSync(join(root, saved.input)));
  assert.deepEqual(after.publications.find(p => p.id === PUB), before);
  assert.equal(input.title, '改訂した題名');
  assert.equal(input.copySource, copyRef);
  assert.equal(input.platform, undefined);
  assert.equal(after.publications.find(p => p.revisionOf).status, 'draft');
});

test('改訂文面の別作品・symlink経由の参照と確認後の文面変更を拒否する', t => {
  const root = fixture(t), file = `${DEF}/youtube.candidate.json`;
  writeJson(root, file, { title: '新しい題名', description: '新しい説明' });
  const options = { pubId: PUB, variant: 'diagram-led', copyRef: file };
  const preview = prepareYoutubeRevision(root, options);
  writeJson(root, file, { title: '確認後に変わった題名', description: '新しい説明' });
  assert.throws(() => prepareYoutubeRevision(root, { ...options, commit: true, expect: preview.digest }), /digest/);
  const outside = 'content/sns/video-packs/other/youtube.json';
  writeJson(root, outside, { title: '別作品', description: '別の説明' });
  assert.throws(() => planYoutubeRevision(root, { ...options, copyRef: outside }), /同じ作品内/);
  const link = `${DEF}/linked.json`;
  symlinkSync(join(root, outside), join(root, link));
  assert.throws(() => planYoutubeRevision(root, { ...options, copyRef: link }), /同じ作品内/);
  assert.equal(loadRegistry(root).publications.length, 1);
});

test('未承認draftの画像修正は明示指定とdigestを要求し、前入力を完全保存する', t => {
  const root = fixture(t), options = { pubId: PUB, variant: 'diagram-led' };
  const initial = prepareYoutubeRevision(root, options);
  prepareYoutubeRevision(root, { ...options, commit: true, expect: initial.digest });
  const old = readFileSync(join(root, initial.input), 'utf8'), before = loadRegistry(root);
  writeJson(root, `${DEF}/youtube.json`, { longform: { title: '修正文面', description: '新しい説明' } });
  assert.throws(() => planYoutubeRevision(root, options), /既存の改訂投稿入力/);
  const preview = prepareYoutubeRevision(root, { ...options, refreshDraft: true });
  assert.equal(readFileSync(join(root, initial.input), 'utf8'), old);
  assert.throws(() => prepareYoutubeRevision(root, { ...options, refreshDraft: true, commit: true, expect: initial.digest }), /digest/);
  const saved = prepareYoutubeRevision(root, { ...options, refreshDraft: true, commit: true, expect: preview.digest });
  assert.equal(readFileSync(join(root, saved.preservedInput), 'utf8'), old);
  assert.equal(JSON.parse(readFileSync(join(root, saved.input))).title, '修正文面');
  assert.deepEqual(loadRegistry(root).publications, before.publications);
  assert.equal(prepareYoutubeRevision(root, { ...options, refreshDraft: true }).written, 0);
  const rev = before.publications.find(p => p.revisionOf);
  for (const patch of [{ status: 'approved' }, { approval: { by: 'user', contentSha256: null, grandfathered: true } }, { platform: { id: 'unknown-upload' } }]) {
    const reg = structuredClone(before);Object.assign(reg.publications.find(p => p.id === rev.id), patch);
    assert.throws(() => planYoutubeRevision(root, { ...options, refreshDraft: true }, reg), /既存の改訂公開行/);
  }
  assert.throws(() => planYoutubeRevision(root, { ...options, variant: 'absent', refreshDraft: true }), /既存の未承認draft/);
});

test('画面確認素材を追加した未承認draftも入力だけ更新でき、承認済み行は拒否する', t => {
  const root = fixture(t), options = { pubId: PUB, variant: 'diagram-led' };
  const initial = prepareYoutubeRevision(root, options);
  prepareYoutubeRevision(root, { ...options, commit: true, expect: initial.digest });
  const reg = loadRegistry(root), row = reg.publications.find(p => p.revisionOf);
  upsertPublications(root, 'youtube', EXAM, [{ ...row, media: { ...row.media, preview: `${row.id}/preview` } }]);
  writeJson(root, `${DEF}/youtube.json`, { longform: { title: '画面確認後の修正文面', description: '新しい説明' } });
  const preview = prepareYoutubeRevision(root, { ...options, refreshDraft: true });
  prepareYoutubeRevision(root, { ...options, refreshDraft: true, commit: true, expect: preview.digest });
  assert.equal(loadRegistry(root).publications.find(p => p.id === row.id).media.preview, `${row.id}/preview`);
  const approved = loadRegistry(root);
  approved.publications.find(p => p.id === row.id).approval = { by: 'user', contentSha256: '0'.repeat(64) };
  assert.throws(() => planYoutubeRevision(root, { ...options, refreshDraft: true }, approved), /既存の改訂公開行/);
});

test('QA済みでも未承認なら文面修正を履歴保存してdraftへ戻す', t => {
  const root = fixture(t), options = { pubId: PUB, variant: 'diagram-led' };
  const initial = prepareYoutubeRevision(root, options);
  prepareYoutubeRevision(root, { ...options, commit: true, expect: initial.digest });
  const qa = recordYoutubeRevisionQa(root, { pubId: initial.publicationId, avg: 2.5, blocks: 0, commit: true });
  assert.equal(qa.status, 'qa_passed');
  const before = readFileSync(join(root, initial.input), 'utf8');
  writeJson(root, `${DEF}/youtube.json`, { longform: { title: 'QA後の修正文面', description: '新しい説明' } });
  assert.throws(() => planYoutubeRevision(root, options), /既存の改訂公開行/);
  const preview = prepareYoutubeRevision(root, { ...options, refreshDraft: true });
  const saved = prepareYoutubeRevision(root, { ...options, refreshDraft: true, commit: true, expect: preview.digest });
  assert.equal(readFileSync(join(root, saved.preservedInput), 'utf8'), before);
  assert.equal(loadRegistry(root).publications.find(p => p.id === initial.publicationId).status, 'draft');
  assert.equal(JSON.parse(readFileSync(join(root, saved.input))).title, 'QA後の修正文面');
  assert.equal(prepareYoutubeRevision(root, { ...options, refreshDraft: true }).written, 0);
});

test('未承認のQA済み改訂は未来の公開日を前倒しでき、旧入力を保存して再QAへ戻す', t => {
  const root = fixture(t), options = { pubId: PUB, variant: 'diagram-led', publishAt: '2099-11-06T20:00:00+09:00' };
  const initial = prepareYoutubeRevision(root, options);
  prepareYoutubeRevision(root, { ...options, commit: true, expect: initial.digest });
  recordYoutubeRevisionQa(root, { pubId: initial.publicationId, avg: 2.5, blocks: 0, commit: true });
  const before = readFileSync(join(root, initial.input), 'utf8');
  const earlier = { ...options, publishAt: '2099-11-01T20:00:00+09:00', refreshDraft: true };
  assert.throws(() => planYoutubeRevision(root, { ...earlier, refreshDraft: false }), /既存の改訂公開行/);
  const preview = prepareYoutubeRevision(root, earlier);
  const saved = prepareYoutubeRevision(root, { ...earlier, commit: true, expect: preview.digest });
  assert.equal(readFileSync(join(root, saved.preservedInput), 'utf8'), before);
  assert.equal(JSON.parse(readFileSync(join(root, saved.input))).publishAt, earlier.publishAt);
  const pub = loadRegistry(root).publications.find(p => p.id === initial.publicationId);
  assert.equal(pub.status, 'draft');
  assert.equal(pub.publishAt, earlier.publishAt);
});

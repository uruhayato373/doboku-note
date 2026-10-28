import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { approvalHash, approvalParts } from '../scripts/lib/content-registry.mjs';
import { finalApprovalGate, partitionByFinalApproval, previewMetrics, runPackPreview, runPreview, writePreviewPublication } from '../scripts/lib/media-preview.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const VC = { maxOpeningCoverSec: 3, maxRepeatFrameRatio: 0.3, longStaticSec: 20 };
const sc = (sceneId, sec) => ({ sceneId, actualSec: sec, designSec: sec });

test('previewMetrics: 冒頭の表紙・直前と同じ画面の割合・長い静止を数える', () => {
  const scenes = [sc('a', 5), sc('b', 10), sc('c', 12), sc('d', 10), sc('e', 3)];
  const sha = { a: 'A', b: 'B', c: 'B', d: 'B', e: 'C' };
  const m = previewMetrics(scenes, sha, VC);
  assert.equal(m.openingCoverSec, 5);
  assert.equal(m.repeatFrameRatio, 0.55); // c と d の 22 秒 / 全体 40 秒
  assert.deepEqual(m.longStatic, [{ fromSceneId: 'b', toSceneId: 'd', sec: 32 }]);
  assert.equal(m.warnings.length, 3);
  assert.match(m.warnings[0], /冒頭の表紙/);
  assert.match(m.warnings[1], /55%/);
  assert.match(m.warnings[2], /32 秒/);
});

test('previewMetrics: 閾値以内なら注意なし（Map でも渡せる・20 秒ちょうどは長い静止）', () => {
  const m = previewMetrics([sc('a', 2), sc('b', 8), sc('c', 8)], new Map([['a', '1'], ['b', '2'], ['c', '3']]), VC);
  assert.equal(m.repeatFrameRatio, 0);
  assert.deepEqual(m.longStatic, []);
  assert.deepEqual(m.warnings, []);
  const edge = previewMetrics([sc('a', 2), sc('b', 20)], { a: '1', b: '2' }, VC);
  assert.equal(edge.longStatic.length, 1);
});

test('previewMetrics: actualSec が無ければ designSec を使い、場面が空でも落ちない', () => {
  const m = previewMetrics([{ sceneId: 'a', actualSec: null, designSec: 4 }], { a: 'x' }, VC);
  assert.equal(m.openingCoverSec, 4);
  const empty = previewMetrics([], {}, VC);
  assert.equal(empty.repeatFrameRatio, 0);
  assert.deepEqual(empty.warnings, []);
});

test('runPreview: render-manifest が無ければ先に描画するよう案内して止まる（ffmpeg は呼ばない）', async () => {
  // 一時ディレクトリを root にして最小の台帳だけ置く（実リポジトリの描画物に触れない）
  const root = mkdtempSync(join(tmpdir(), 'media-preview-'));
  mkdirSync(join(root, 'content/registry/works'), { recursive: true });
  mkdirSync(join(root, 'content/registry/publications/youtube'), { recursive: true });
  writeFileSync(join(root, 'content/registry/works/e.json'), JSON.stringify({ schemaVersion: 1, exam: 'e', works: [{ id: 'w', kind: 'video-pack', definition: 'content/sns/video-packs/e/w' }] }));
  writeFileSync(join(root, 'content/registry/publications/youtube/e.json'), JSON.stringify({ schemaVersion: 1, exam: 'e', publications: [{ id: 'e/w/youtube.longform', work: 'w', format: 'longform', media: {} }] }));
  const saved = process.exitCode;
  const orig = console.error;
  console.error = () => {};
  try {
    const r = await runPreview(root, { pub: 'e/w/youtube.longform', commit: false });
    assert.equal(r.ok, false);
    assert.match(r.message, /render-manifest\.json が無い/);
    assert.match(r.message, /render-longform/);
    assert.equal(process.exitCode, 1);
  } finally { console.error = orig; process.exitCode = saved; }
});

test('writePreviewPublication: 描画中に確定した公開文面と日時を保持する', async () => {
  const root = mkdtempSync(join(tmpdir(), 'media-preview-race-'));
  const file = join(root, 'content/registry/publications/youtube/e.json');
  mkdirSync(join(root, 'content/registry/publications/youtube'), { recursive: true });
  const pub = { id: 'e/w/youtube.longform', work: 'w', account: 'youtube:main', format: 'longform', status: 'qa_passed',
    copy: 'content/sns/video-packs/e/w/youtube.json#longform', publishAt: '2026-11-02T20:30:00+09:00',
    media: { cover: 'e/w/youtube.longform/cover', 'contact-sheet-2': 'e/w/youtube.longform/contact-sheet-2' } };
  writeFileSync(file, JSON.stringify({ schemaVersion: 1, channel: 'youtube', exam: 'e', publications: [pub] }));
  await writePreviewPublication(root, pub.id, [{ role: 'preview', id: 'e/w/youtube.longform/preview' }]);
  const saved = JSON.parse(readFileSync(file, 'utf8')).publications[0];
  assert.equal(saved.copy, pub.copy);
  assert.equal(saved.publishAt, pub.publishAt);
  assert.equal(saved.media.cover, pub.media.cover);
  assert.equal(saved.media.preview, 'e/w/youtube.longform/preview');
  assert.equal(saved.media['contact-sheet-2'], undefined);
});

test('runPreview: Shorts・YouTube 以外・形の違う ID は未対応で止まる', async () => {
  const saved = process.exitCode;
  const orig = console.error;
  console.error = () => {};
  try {
    const short = await runPreview(ROOT, { pub: 'x/y/youtube.short.a', commit: false });
    assert.equal(short.ok, false);
    assert.match(short.message, /未対応/);
    const x = await runPreview(ROOT, { pub: 'x/y/x.post', commit: false });
    assert.match(x.message, /未対応/);
    assert.equal((await runPreview(ROOT, { pub: 'bad', commit: false })).ok, false);
    assert.equal((await runPreview(ROOT, { commit: false })).ok, false);
  } finally { console.error = orig; process.exitCode = saved; }
});

test('finalApprovalGate: contentSha256 が無ければ通し、あれば今の中身と合うときだけ通す', async () => {
  const media = [{ id: 'e/w/youtube.longform/video', sha256: 'a'.repeat(64) }];
  const base = { id: 'e/w/youtube.longform', work: 'w', exam: 'e', channel: 'youtube', format: 'longform', account: 'acc', publishAt: '2026-10-23T11:00:00Z', media: { video: media[0].id } };
  const root = tmpdir();
  const gate = (pub) => finalApprovalGate(root, 'e', 'w', { reg: { publications: [pub], media } });
  assert.deepEqual(await gate(base), { ok: true, gated: false, reason: null });
  assert.equal((await gate({ ...base, approval: { by: 'user', grandfathered: true } })).gated, false);
  const hash = approvalHash(approvalParts(root, base, new Map(media.map((m) => [m.id, m]))));
  assert.equal((await gate({ ...base, approval: { by: 'user', contentSha256: hash } })).ok, true);
  const stale = await gate({ ...base, publishAt: '2026-10-24T11:00:00Z', approval: { by: 'user', contentSha256: hash } });
  assert.equal(stale.ok, false);
  assert.match(stale.reason, /最終承認が今の中身と合わない/);
  assert.equal((await finalApprovalGate(root, 'e', 'other', { reg: { publications: [base], media } })).gated, false);
});

test('finalApprovalGate: 別資格の同じ作品 ID の承認とは混ざらない', async () => {
  const media = [{ id: 'e/w/youtube.longform/video', sha256: 'a'.repeat(64) }];
  const base = { id: 'e/w/youtube.longform', work: 'w', exam: 'e', channel: 'youtube', format: 'longform', account: 'acc', publishAt: '2026-10-23T11:00:00Z', media: { video: media[0].id } };
  const stale = { ...base, approval: { by: 'user', contentSha256: 'f'.repeat(64) } };
  const reg = { publications: [stale], media };
  assert.equal((await finalApprovalGate(tmpdir(), 'e', 'w', { reg })).ok, false);
  const other = await finalApprovalGate(tmpdir(), 'other-exam', 'w', { reg });
  assert.deepEqual(other, { ok: true, gated: false, reason: null });
});

test('runPreview: 場面に designSec も actualSec も無ければ場面 ID つきで ffmpeg の前に止まる', async () => {
  const root = mkdtempSync(join(tmpdir(), 'media-preview-'));
  mkdirSync(join(root, 'content/registry/works'), { recursive: true });
  mkdirSync(join(root, 'content/registry/publications/youtube'), { recursive: true });
  mkdirSync(join(root, '.tmp/video-render/w'), { recursive: true });
  writeFileSync(join(root, 'content/registry/works/e.json'), JSON.stringify({ schemaVersion: 1, exam: 'e', works: [{ id: 'w', kind: 'video-pack', definition: 'content/sns/video-packs/e/w' }] }));
  writeFileSync(join(root, 'content/registry/publications/youtube/e.json'), JSON.stringify({ schemaVersion: 1, exam: 'e', publications: [{ id: 'e/w/youtube.longform', work: 'w', format: 'longform', media: {} }] }));
  writeFileSync(join(root, '.tmp/video-render/w/render-manifest.json'), JSON.stringify({ scenes: [{ sceneId: 's1', png: 's1.png', designSec: 3 }, { sceneId: 'broken-scene', png: 's2.png' }] }));
  const saved = process.exitCode;
  const orig = console.error;
  console.error = () => {};
  try {
    const r = await runPreview(root, { pub: 'e/w/youtube.longform', commit: false });
    assert.equal(r.ok, false);
    assert.match(r.message, /broken-scene/);
    assert.match(r.message, /designSec も actualSec も無い/);
  } finally { console.error = orig; process.exitCode = saved; }
});

test('partitionByFinalApproval: 古い承認の 1 本だけを理由つきで外し、残りは通す（例外も 1 本の理由にする）', async () => {
  const media = [{ id: 'e/a/youtube.longform/video', sha256: 'a'.repeat(64) }, { id: 'e/b/youtube.longform/video', sha256: 'b'.repeat(64) }];
  const pub = (w, approval) => ({ id: `e/${w}/youtube.longform`, work: w, exam: 'e', channel: 'youtube', format: 'longform', account: 'acc', publishAt: '2026-10-23T11:00:00Z', media: { video: `e/${w}/youtube.longform/video` }, ...(approval ? { approval } : {}) });
  const reg = { publications: [pub('a', { by: 'user', contentSha256: 'f'.repeat(64) }), pub('b', null)], media };
  const r = await partitionByFinalApproval(tmpdir(), 'e', ['a', 'b', 'c'], { reg });
  assert.deepEqual(r.passed, ['b', 'c']);
  assert.equal(r.blocked.length, 1);
  assert.equal(r.blocked[0].packId, 'a');
  assert.match(r.blocked[0].reason, /最終承認が今の中身と合わない/);
  // 台帳が壊れている等で関門が投げても、全体は投げずその 1 本の理由になる
  const thrown = await partitionByFinalApproval(tmpdir(), 'e', ['a'], { reg: { publications: null, media } });
  assert.equal(thrown.passed.length, 0);
  assert.match(thrown.blocked[0].reason, /判定できない/);
});

test('previewMetrics: contactSheetEverySec ごとのコマで直前と同じ画面だった回数を数える（旧形式は多く、場面を分けると減る）', () => {
  const vc = { ...VC, contactSheetEverySec: 10 };
  // 40 秒の 1 場面: 0・10・20・30 秒のコマがすべて同じ画面 → 3/3
  const long = previewMetrics([sc('a', 40)], { a: 'A' }, vc);
  assert.deepEqual(long.sampledRepeat, { everySec: 10, samples: 4, same: 3, ratio: 1 });
  assert.ok(long.warnings.some((w) => /10 秒ごとのコマで直前と同じ画面が 3\/3 回/.test(w)));
  // 10 秒ごとに別の場面 → 0/3
  const split = previewMetrics([sc('a', 10), sc('b', 10), sc('c', 10), sc('d', 10)], { a: '1', b: '2', c: '3', d: '4' }, vc);
  assert.equal(split.sampledRepeat.same, 0);
  // 刻みを渡さなければ数えない
  assert.deepEqual(previewMetrics([sc('a', 40)], { a: 'A' }, VC).sampledRepeat.samples, 0);
});

function packRoot(scenes, { withPng = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'pack-preview-'));
  mkdirSync(join(root, 'config'), { recursive: true });
  copyFileSync(join(ROOT, 'config/video-content.json'), join(root, 'config/video-content.json'));
  mkdirSync(join(root, '.tmp/video-render/p/img'), { recursive: true });
  writeFileSync(join(root, '.tmp/video-render/p/render-manifest.json'), JSON.stringify({ scenes }));
  if (withPng) for (const s of scenes) writeFileSync(join(root, '.tmp/video-render/p/img', s.png), s.png.startsWith('same') ? 'same' : s.png);
  return root;
}

test('runPackPreview: ffmpeg が無ければ数値だけ出して検査不成立（exit 2）、--metrics-only は ffmpeg なしで 0', () => {
  const root = packRoot([
    { sceneId: 'cover', png: 'same-0.png', designSec: 15 },
    { sceneId: 'a', png: 'same-1.png', designSec: 30 },
  ]);
  const log = console.log;
  const err = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    const r = runPackPreview(root, { packId: 'p', ffmpeg: null });
    assert.equal(r.code, 2);
    assert.equal(r.metrics.openingCoverSec, 15);
    assert.equal(r.metrics.longStatic.length, 1); // 同じ画素の PNG が 45 秒続く
    const doc = JSON.parse(readFileSync(join(root, '.tmp/video-render/p/preview/preview-metrics.json'), 'utf8'));
    assert.equal(doc.sceneCount, 2);
    assert.equal(existsSync(join(root, '.tmp/video-render/p/preview/preview.mp4')), false);
    assert.equal(runPackPreview(root, { packId: 'p', metricsOnly: true, ffmpeg: null }).code, 0);
  } finally { console.log = log; console.error = err; }
});

test('runPackPreview: 描画していない・PNG が欠けていれば exit 1（数値を 0 にしない）', () => {
  const err = console.error;
  console.error = () => {};
  try {
    const none = mkdtempSync(join(tmpdir(), 'pack-preview-'));
    assert.equal(runPackPreview(none, { packId: 'p', ffmpeg: null }).code, 1);
    const lost = packRoot([{ sceneId: 'a', png: 'a.png', designSec: 5 }], { withPng: false });
    const r = runPackPreview(lost, { packId: 'p', ffmpeg: null });
    assert.equal(r.code, 1);
    assert.match(r.message, /場面の PNG が無い/);
  } finally { console.error = err; }
});

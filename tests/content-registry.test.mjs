import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  approvalHash, idShapeIssues, loadRegistryConfig, parsePubId, pubIdOf, requiresApproval, visualDigest,
} from '../scripts/lib/content-registry.mjs';
import { checkRegistry } from '../scripts/lib/content-registry-check.mjs';
import { immutableConflict } from '../scripts/lib/drive-vault.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = loadRegistryConfig(ROOT);
const SHA = 'a'.repeat(64);
const DEF = 'content/sns/video-packs/civil-construction-2/matome-2kyu-chokuzen';
const PUB = 'civil-construction-2/matome-2kyu-chokuzen/youtube.longform';

const work = (over = {}) => ({ id: 'matome-2kyu-chokuzen', kind: 'video-pack', definition: DEF, exam: 'civil-construction-2', file: 'w.json', ...over });
const pub = (over = {}) => ({ id: PUB, work: 'matome-2kyu-chokuzen', account: 'youtube:main', format: 'longform', status: 'qa_passed', exam: 'civil-construction-2', channel: 'youtube', file: 'p.json', ...over });
const media = (over = {}) => ({
  id: `${PUB}/cover`, role: 'cover', type: 'image/png', sha256: SHA, scope: 'civil-construction-2', file: 'm.json',
  store: { tier: 'drive', path: `.tmp/media/${PUB}/cover.${SHA.slice(0, 8)}.png` }, provenance: { kind: 'template', by: 'brand-video-pack' }, ...over,
});
const state = (longform = { status: 'qa_passed' }) => ({ packs: { 'matome-2kyu-chokuzen': { derivatives: { longform } } } });
const run = ({ works = [work()], publications = [pub()], mediaRows = [], st = state(), drive = { entries: {} }, ai = { figures: {} }, c = cfg } = {}) =>
  checkRegistry(ROOT, { cfg: c, reg: { works, publications, media: mediaRows }, state: st, driveManifest: drive, aiLedger: ai, packs: new Map() });
const codes = (r, sev = 'FAIL') => r.issues.filter((i) => i.severity === sev).map((i) => i.code);

test('公開 ID の組み立てと分解が往復する', () => {
  const parts = { exam: 'civil-construction-2', work: 'keiken-koji-ga-nai', channel: 'youtube', format: 'short', variant: 'point-taisho' };
  assert.deepEqual(parsePubId(pubIdOf(parts)), parts);
  assert.equal(parsePubId('civil-construction-2/x'), null);
});

test('新しい ID に日付・NNN-・pack-NN・末尾の連番を使わない', () => {
  for (const bad of ['060-civil-drafts', 'exam-pack-09', 'point-taisho-1', 'covers-20260909', 'plan-2026-10']) assert.ok(idShapeIssues('work', bad, cfg.idRules).length, bad);
  for (const ok of ['matome-2kyu-chokuzen', 'gishi-12week-plan', 'r03-pfi', 'koji-gaiyo-7items']) assert.deepEqual(idShapeIssues('work', ok, cfg.idRules), [], ok);
});

test('承認ハッシュは鍵の順序に依らず、予定・文面・素材が変わると変わる', () => {
  const base = { account: 'youtube:main', format: 'longform', publishAt: '2026-10-23T20:00:00+09:00', copy: { title: 'A', tags: ['x'] }, media: { video: SHA, cover: SHA } };
  assert.equal(approvalHash(base), approvalHash({ ...base, media: { cover: SHA, video: SHA }, publishAt: '2026-10-23T11:00:00Z' }));
  assert.notEqual(approvalHash(base), approvalHash({ ...base, publishAt: '2026-10-24T12:30:00+09:00' }));
  assert.notEqual(approvalHash(base), approvalHash({ ...base, copy: { title: 'B', tags: ['x'] } }));
  assert.notEqual(approvalHash(base), approvalHash({ ...base, media: { video: 'b'.repeat(64), cover: SHA } }));
  assert.notEqual(visualDigest({ cover: SHA }), visualDigest({ cover: 'b'.repeat(64) }));
  assert.equal(requiresApproval(cfg, 'scheduled'), true);
  assert.equal(requiresApproval(cfg, 'qa_passed'), false);
});

test('R01: 台帳が 0 件なら検査不成立（FAIL）', () => {
  assert.ok(codes(run({ works: [], publications: [], mediaRows: [] })).includes('R01'));
  assert.deepEqual(codes(run()), []);
});

test('R02: ID の重複・行の中身と合わない ID・例外の上限を止める', () => {
  assert.ok(codes(run({ publications: [pub(), pub()] })).includes('R02'));
  assert.ok(codes(run({ publications: [pub({ id: 'civil-construction-2/matome-2kyu-chokuzen/youtube.short' })] })).includes('R02'));
  assert.ok(codes(run({ works: [work({ idException: 'imported-before-cutover' })], c: { ...cfg, idRules: { ...cfg.idRules, idExceptionMax: 0 } } })).includes('R02'));
});

test('R03: 予約以上の公開を消す・改名するのを止める（改名は renamedTo で許す）', () => {
  const r = (publications, basePublications) => checkRegistry(ROOT, { cfg, reg: { works: [work()], publications, media: [] }, state: state(), driveManifest: { entries: {} }, aiLedger: { figures: {} }, packs: new Map(), basePublications });
  const old = pub({ id: 'civil-construction-2/matome-2kyu-chokuzen/youtube.short.point-old', format: 'short', variant: 'point-old', status: 'scheduled' });
  assert.ok(codes(r([pub()], [old])).includes('R03'));
  assert.ok(!codes(r([pub()], [{ ...old, status: 'draft' }])).includes('R03'));
});

test('R04: 公開の作品・素材の参照が無ければ止める', () => {
  assert.ok(codes(run({ works: [] })).includes('R04'));
  assert.ok(codes(run({ publications: [pub({ media: { cover: `${PUB}/cover` } })] })).includes('R04'));
});

test('R06: 置き場の名前の sha8 が違えば止め、Drive 台帳に無ければ WARN', () => {
  const p = pub({ media: { cover: `${PUB}/cover` } });
  const bad = media({ store: { tier: 'drive', path: `.tmp/media/${PUB}/cover.bbbbbbbb.png` } });
  assert.ok(codes(run({ publications: [p], mediaRows: [bad] })).includes('R06'));
  assert.ok(codes(run({ publications: [p], mediaRows: [media()] }), 'WARN').includes('R06'));
  const drive = { entries: { [media().store.path]: { sha256: SHA } } };
  assert.deepEqual(codes(run({ publications: [p], mediaRows: [media()], drive })), []);
});

test('R07: 承認・停止の理由・公開の証拠が無い状態を止める', () => {
  const st = state({ status: 'scheduled', publishAt: '2026-10-23T20:00:00+09:00', videoId: 'v1' });
  assert.ok(codes(run({ publications: [pub({ status: 'scheduled', publishAt: '2026-10-23T20:00:00+09:00', platform: { id: 'v1' } })], st })).includes('R07'));
  assert.ok(codes(run({ publications: [pub({ status: 'stopped' })], st: state({ status: 'stopped' }) })).includes('R07'));
  assert.ok(codes(run({ publications: [pub({ status: 'published', platform: { id: 'v1' } })], st: state({ status: 'published', videoId: 'v1' }) })).includes('R07'));
});

test('R08: 外部 ID の重複を止める', () => {
  const a = pub({ status: 'qa_passed', platform: { id: 'dup' } });
  const b = pub({ id: 'civil-construction-2/matome-2kyu-chokuzen/youtube.short.point-a', format: 'short', variant: 'point-a', platform: { id: 'dup' }, relatedTo: PUB });
  const st = { packs: { 'matome-2kyu-chokuzen': { derivatives: { longform: { status: 'qa_passed', videoId: 'dup' }, shorts: [{ key: 'point-a', status: 'qa_passed', videoId: 'dup' }] } } } };
  assert.ok(codes(run({ publications: [a, b], st })).includes('R08'));
});

test('R09: 今の台帳と台帳が食い違えば、切り替えの前後とも止める', () => {
  assert.ok(!codes(run()).includes('R09'));
  assert.ok(codes(run({ st: state({ status: 'approved' }) })).includes('R09'));
  assert.ok(codes(run({ st: { packs: {} } })).includes('R09'));
  assert.ok(codes(run({ st: state({ status: 'approved' }), c: { ...cfg, cutover: ['youtube'] } })).includes('R09'));
});

test('R09: 今の台帳にだけある動画パックは、切り替え前は INFO・切り替え後は FAIL', () => {
  const st = { packs: { ...state().packs, 'other-pack': { derivatives: { longform: { status: 'scheduled', videoId: 'x' } } } } };
  const before = { ...cfg, cutover: [] };
  assert.ok(!codes(run({ st, c: before })).includes('R09'));
  assert.ok(codes(run({ st, c: before }), 'INFO').includes('R09'));
  assert.ok(codes(run({ st, c: { ...cfg, cutover: ['youtube'] } })).includes('R09'));
});

test('R10: 判定 ok の無い AI 素材を、承認以降の公開が使っていれば止める', () => {
  const ai = media({ provenance: { kind: 'ai-generated', tool: 'Codex', prompt: 'p', promptSha256: SHA, generatedAt: '2026-10-09T00:00:00Z' } });
  const drive = { entries: { [ai.store.path]: { sha256: SHA } } };
  const approved = pub({ status: 'approved', approval: { by: 'user', at: '2026-10-09T00:00:00Z', contentSha256: null, grandfathered: true }, media: { cover: ai.id } });
  const st = state({ status: 'approved' });
  assert.ok(codes(run({ publications: [approved], mediaRows: [ai], drive, st })).includes('R10'));
  const okLedger = { figures: { [`media:${ai.id}`]: { sha: SHA.slice(0, 16), verdict: 'ok' } } };
  assert.ok(!codes(run({ publications: [approved], mediaRows: [ai], drive, st, ai: okLedger })).includes('R10'));
});

test('書き換えない group は、名前の sha8 と台帳の中身が違えば置かない', () => {
  const g = { immutable: true };
  assert.equal(immutableConflict(g, `.tmp/media/${PUB}/cover.aaaaaaaa.png`, SHA, null), null);
  assert.match(immutableConflict(g, `.tmp/media/${PUB}/cover.bbbbbbbb.png`, SHA, null), /sha8/);
  assert.match(immutableConflict(g, `.tmp/media/${PUB}/cover.aaaaaaaa.png`, SHA, { sha256: 'c'.repeat(64) }), /台帳/);
  assert.equal(immutableConflict({}, 'x.png', SHA, { sha256: 'c'.repeat(64) }), null);
});

test('areaOf は 2 階層の置き場（content/registry）も引ける', async () => {
  const { areaOf, datasetById, datasetFiles } = await import('../scripts/lib/datasets.mjs');
  assert.equal(areaOf(datasetById('registry.works')), 'registry');
  assert.equal(areaOf(datasetById('config.content-registry')), 'config');
  assert.ok(datasetFiles(ROOT, 'registry.works').length >= 1);
});

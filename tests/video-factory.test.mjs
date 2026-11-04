// tests/video-factory.test.mjs — 量産工程の関門。監査を通っていない画像が採用されないことを固定する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { generateWithCodexAsync } from '../scripts/lib/codex-image.mjs';
import {
  MAX_ATTEMPTS, adoptPlan, auditQueue, buildBodyPrompt, buildCoverPrompt, buildPlan, generatePlan, inspectImage,
  ledgerVerdicts, nextStage, packDirOf, planPath, readPlan, recordAudit, summarize,
} from '../scripts/lib/video-factory.mjs';

const PACK = 'pe-construction/sample';
const scene = (id, extra = {}) => ({ sceneId: id, start: 0, end: 5, narration: `${id}の説明`, caption: id, visual: { heading: `${id}の見出し`, items: ['甲\n乙', '丙'], art: { type: 'steps', note: '注記' } }, ...extra });
const png = (width, height, background = '#f0f0f0') => sharp({ create: { width, height, channels: 3, background } })
  .composite([{ input: { create: { width: Math.floor(width / 2), height: Math.floor(height / 2), channels: 3, background: '#203080' } }, left: 40, top: 40 }]).png().toBuffer();
const noisyBottom = async (width, height) => sharp(await png(width, height))
  .composite([{ input: { create: { width: width - 100, height: Math.floor(height * 0.1), channels: 3, background: '#000000' } }, left: 50, top: height - Math.floor(height * 0.12) }]).png().toBuffer();
const refs = (root, path) => ({ path, sha256: 'a'.repeat(64) });

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'video-factory-'));
  const dir = join(root, packDirOf(PACK));
  mkdirSync(dir, { recursive: true });
  const write = (file, value) => writeFileSync(join(dir, file), JSON.stringify(value, null, 2));
  write('storyboard.json', { format: 'longform-16x9', scenes: [scene('cover'), scene('a'), scene('b')] });
  write('cover-design.json', { schemaVersion: 1, covers: { longform: { format: 'longform', headline: ['技術士', '口頭対策'], character: { pose: 'pop-explaining' }, pop: { authority: '総監が制作' } } } });
  write('pop-image.json', { policy: 'keep-me', revisions: { old: { note: 'keep' } } });
  return { root, dir, done: () => rmSync(root, { recursive: true, force: true }) };
}
const fake = (bytes) => async (_p, _m, { images }) => {
  assert.ok(images.length > 0);
  const out = join(tmpdir(), `vf-${process.pid}-${Math.floor(performance.now() * 1000)}.png`);
  writeFileSync(out, bytes);
  return out;
};
const allOk = (root) => auditQueue(root, PACK).map((q) => ({ figKey: q.figKey, verdict: 'ok', reason: '原稿どおりで文字の誤りが無い' }));

test('generateWithCodexAsync: 偽の実行で画像の有無を返す', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'codex-async-'));
  try {
    assert.ok((await generateWithCodexAsync('p', null, { tmp, run: async (_a, dir) => writeFileSync(join(dir, 'out.png'), 'x') })).endsWith('out.png'));
    assert.equal(await generateWithCodexAsync('p', null, { tmp, run: async () => {} }), null);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('指示は原稿だけから決まり、指定の文字を含む', () => {
  const s = scene('a');
  assert.equal(buildBodyPrompt(s, 'pe-construction'), buildBodyPrompt(s, 'pe-construction'));
  for (const word of ['aの見出し', '甲 乙', '丙', '注記', 'インディゴ']) assert.ok(buildBodyPrompt(s, 'pe-construction').includes(word), word);
  assert.ok(!buildBodyPrompt({ sceneId: 'x', narration: 'n', visual: {} }, 'x').includes('undefined'));
  const cover = buildCoverPrompt({ headline: ['技術士', '口頭対策'] }, 'pe-construction');
  assert.ok(cover.includes('『技術士』『口頭対策』') && cover.includes('総監が制作'));
});

test('機械検査: 比率と字幕の帯を止める', async () => {
  assert.deepEqual(await inspectImage(await png(1920, 1080), 'body'), []);
  assert.match((await inspectImage(await png(1536, 1024), 'body'))[0], /16:9/);
  assert.match((await inspectImage(await noisyBottom(1920, 1080), 'body'))[0], /字幕/);
  assert.deepEqual(await inspectImage(await noisyBottom(1920, 1080), 'cover'), [], '表紙は字幕の帯を見ない');
  const flat = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#fff' } }).png().toBuffer();
  assert.match((await inspectImage(flat, 'body'))[0], /単色/);
});

test('計画: 原稿が同じ項目は生成済みを引き継ぎ、変わった項目は作り直す', async () => {
  const f = fixture();
  try {
    buildPlan(f.root, PACK, { date: '20261104', refs });
    await generatePlan(f.root, PACK, { generate: fake(await png(1920, 1080)) });
    assert.equal(summarize(readPlan(f.root, PACK)).missing, 0);
    const board = JSON.parse(readFileSync(join(f.dir, 'storyboard.json'), 'utf8'));
    board.scenes[1].narration = '変えた';
    writeFileSync(join(f.dir, 'storyboard.json'), JSON.stringify(board));
    const plan = buildPlan(f.root, PACK, { date: '20261104', refs });
    assert.deepEqual(plan.items.filter((i) => !i.raw).map((i) => i.id), ['a']);
  } finally { f.done(); }
});

test('生成: 画像が出ない項目は上限まで試して残し、勝手に通さない', async () => {
  const f = fixture();
  try {
    buildPlan(f.root, PACK, { date: '20261104', refs, scope: 'cover' });
    for (let i = 0; i < MAX_ATTEMPTS + 2; i += 1) await generatePlan(f.root, PACK, { generate: async () => null });
    const s = summarize(readPlan(f.root, PACK));
    assert.deepEqual(s.exhausted, ['cover']);
    assert.equal(readPlan(f.root, PACK).items[0].attempts, MAX_ATTEMPTS);
    assert.equal(nextStage({ status: 'draft', standard: false, plan: s }), 'images-exhausted');
  } finally { f.done(); }
});

test('監査: fail は画像を外し、理由を次の生成の指示へ渡す', async () => {
  const f = fixture();
  try {
    buildPlan(f.root, PACK, { date: '20261104', refs, scope: 'cover' });
    await generatePlan(f.root, PACK, { generate: fake(await png(1920, 1080)) });
    assert.throws(() => recordAudit(f.root, PACK, [], {}), /担当/);
    assert.throws(() => recordAudit(f.root, PACK, [{ figKey: 'cover', verdict: 'ok', reason: '短い' }], { by: 'a' }), /8 字/);
    assert.throws(() => recordAudit(f.root, PACK, [{ figKey: 'nope', verdict: 'ok', reason: '十分に長い理由の文章' }], { by: 'a' }), /対象が無い/);
    recordAudit(f.root, PACK, [{ figKey: 'cover', verdict: 'fail', reason: '見出しの文字が崩れている' }], { by: 'auditor' });
    assert.equal(readPlan(f.root, PACK).items[0].raw, null);
    let seen;
    const gen = fake(await png(1920, 1080));
    await generatePlan(f.root, PACK, { generate: (p, m, o) => { seen = p; return gen(p, m, o); } });
    assert.ok(seen.includes('見出しの文字が崩れている'));
    assert.equal(auditQueue(f.root, PACK).length, 1, '新しい画像は判定をやり直す');
  } finally { f.done(); }
});

test('採用: 判定の無い項目・原稿が変わった項目があれば何も書かない', async () => {
  const f = fixture();
  try {
    buildPlan(f.root, PACK, { date: '20261104', refs });
    await generatePlan(f.root, PACK, { generate: fake(await png(1920, 1080)) });
    const before = readFileSync(join(f.dir, 'pop-image.json'), 'utf8');
    await assert.rejects(adoptPlan(f.root, PACK, { now: 'T' }), /監査の ok/);
    recordAudit(f.root, PACK, allOk(f.root), { by: 'auditor' });
    const plan = readPlan(f.root, PACK);
    plan.items[1].audit.sha = 'b'.repeat(64);
    writeFileSync(join(f.root, planPath(PACK)), JSON.stringify(plan));
    await assert.rejects(adoptPlan(f.root, PACK, { now: 'T' }), /監査の ok/, '別の画像への判定を流用しない');
    plan.items[1].audit.sha = plan.items[1].raw.sha256;
    writeFileSync(join(f.root, planPath(PACK)), JSON.stringify(plan));
    const board = JSON.parse(readFileSync(join(f.dir, 'storyboard.json'), 'utf8'));
    board.scenes[2].caption = '変えた';
    writeFileSync(join(f.dir, 'storyboard.json'), JSON.stringify(board));
    await assert.rejects(adoptPlan(f.root, PACK, { now: 'T' }), /原稿が変わった/);
    assert.equal(readFileSync(join(f.dir, 'pop-image.json'), 'utf8'), before);
  } finally { f.done(); }
});

test('採用: 全場面が揃うと基準を満たし、過去の改訂を消さない', async () => {
  const f = fixture();
  try {
    buildPlan(f.root, PACK, { date: '20261104', refs });
    await generatePlan(f.root, PACK, { generate: fake(await png(1920, 1080)) });
    recordAudit(f.root, PACK, allOk(f.root), { by: 'auditor' });
    await adoptPlan(f.root, PACK, { now: '2026-11-04T00:00:00Z' });
    const pop = JSON.parse(readFileSync(join(f.dir, 'pop-image.json'), 'utf8'));
    assert.equal(pop.policy, 'keep-me');
    assert.deepEqual(pop.revisions.old, { note: 'keep' });
    assert.equal(pop.revisions['body-diagram-20261104'].images.length, 2);
    assert.equal(pop.revisions['body-diagram-20261104'].images[0].review.by, 'auditor');
    const board = JSON.parse(readFileSync(join(f.dir, 'storyboard.json'), 'utf8'));
    assert.equal(board.imageDesign.coverRevision, 'cover-pop-20261104');
    const media = [{ id: 'pe-construction/sample/x/cover', sha256: pop.revisions['cover-pop-20261104'].output.sha256, provenance: { kind: 'ai-generated' } },
      { id: 'pe-construction/sample/x/other', sha256: 'c'.repeat(64), provenance: { kind: 'ai-generated' } }];
    assert.deepEqual(ledgerVerdicts(f.root, PACK, media).map((v) => v.figKey), ['media:pe-construction/sample/x/cover']);
  } finally { f.done(); }
});

test('採用: 表紙だけの計画は本文の採用済み改訂を残す', async () => {
  const f = fixture();
  try {
    buildPlan(f.root, PACK, { date: '20261101', refs });
    await generatePlan(f.root, PACK, { generate: fake(await png(1920, 1080)) });
    recordAudit(f.root, PACK, allOk(f.root), { by: 'auditor' });
    await adoptPlan(f.root, PACK, { now: 'T' });
    rmSync(join(f.root, planPath(PACK)));
    buildPlan(f.root, PACK, { date: '20261104', refs, scope: 'cover' });
    await generatePlan(f.root, PACK, { generate: fake(await png(1920, 1080, '#e0e0ff')) });
    recordAudit(f.root, PACK, allOk(f.root), { by: 'auditor' });
    await adoptPlan(f.root, PACK, { now: 'T' });
    const pop = JSON.parse(readFileSync(join(f.dir, 'pop-image.json'), 'utf8'));
    assert.equal(pop.activeBodyRevision, 'body-diagram-20261101');
    assert.equal(pop.activeCoverRevision, 'cover-pop-20261104');
    assert.equal(JSON.parse(readFileSync(join(f.dir, 'storyboard.json'), 'utf8')).imageDesign.revision, 'body-diagram-20261101');
  } finally { f.done(); }
});

test('採用: 基準を満たさないときは書き戻す', async () => {
  const f = fixture();
  try {
    const pop = JSON.parse(readFileSync(join(f.dir, 'pop-image.json'), 'utf8'));
    pop.activeBodyRevision = 'body-empty';
    writeFileSync(join(f.dir, 'pop-image.json'), JSON.stringify(pop));
    buildPlan(f.root, PACK, { date: '20261104', refs, scope: 'cover' });
    await generatePlan(f.root, PACK, { generate: fake(await png(1920, 1080)) });
    recordAudit(f.root, PACK, allOk(f.root), { by: 'auditor' });
    const board = readFileSync(join(f.dir, 'storyboard.json'), 'utf8');
    await assert.rejects(adoptPlan(f.root, PACK, { now: 'T' }));
    assert.equal(readFileSync(join(f.dir, 'storyboard.json'), 'utf8'), board);
  } finally { f.done(); }
});

test('nextStage: 工程を飛ばさない', () => {
  const plan = { exhausted: [], missing: 0, unaudited: 0 };
  const cases = [
    [{ status: 'published' }, 'done'],
    [{ status: 'approved' }, 'done'],
    [{ status: 'stopped' }, 'stopped'],
    [{ status: 'draft', qa: 'blocked' }, 'fix-script'],
    [{ status: 'draft', standard: false, plan: null }, 'plan'],
    [{ status: 'draft', standard: false, plan: { ...plan, missing: 2 } }, 'generate'],
    [{ status: 'draft', standard: false, plan: { ...plan, unaudited: 1 } }, 'audit'],
    [{ status: 'draft', standard: false, plan }, 'adopt'],
    [{ status: 'draft', standard: true, rendered: false }, 'render'],
    [{ status: 'draft', standard: true, rendered: true, qa: 'none' }, 'qa'],
    [{ status: 'qa_passed', standard: true, rendered: true, qa: 'passed', review: 'none' }, 'review'],
    [{ status: 'qa_passed', standard: true, rendered: true, qa: 'passed', review: 'fail' }, 'review-failed'],
    [{ status: 'qa_passed', standard: true, rendered: true, qa: 'passed', review: 'pass' }, 'ready-for-approval'],
  ];
  for (const [facts, stage] of cases) assert.equal(nextStage(facts), stage, JSON.stringify(facts));
});

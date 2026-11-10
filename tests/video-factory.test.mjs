// tests/video-factory.test.mjs — 量産工程の関門。監査を通っていない画像が採用されないことを固定する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { generateWithCodexAsync } from '../scripts/lib/codex-image.mjs';
import { reviewIsCurrent } from '../scripts/lib/media-review.mjs';
import { acceptedApproval, audioProblems, evaluateGate, nextSlot, speechSimilarity, uploadsLeft } from '../scripts/lib/video-publish-gate.mjs';
import {
  MAX_ATTEMPTS, MAX_NO_OUTPUT, adoptPlan, auditQueue, buildBodyPrompt, buildCoverPrompt, buildPlan, generatePlan, hydrateAdopted, inspectImage,
  ledgerVerdicts, nextStage, packDirOf, planPath, preflightProblems, qaInputDigest, qaState, readPlan, recordAudit, retryItems, summarize, unapprovedRow,
} from '../scripts/lib/video-factory.mjs';

const PACK = 'pe-construction/sample';
const scene = (id, extra = {}) => ({ sceneId: id, start: 0, end: 5, narration: `${id}の説明`, caption: id, visual: { heading: `${id}の見出し`, items: ['甲\n乙', '丙'], art: { type: 'steps', note: '注記', center: '中央の語' } }, ...extra });
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
let fakeCalls = 0;
// 実際の生成と同じく呼ぶたびに別の画像を返す（左上の 1 画素だけ変える）。同じ画像は取り違えとして弾かれる（DN-1036）
const fake = (bytes) => async (_p, _m, { images }) => {
  assert.ok(images.length > 0);
  fakeCalls += 1;
  const out = join(tmpdir(), `vf-${process.pid}-${fakeCalls}-${Math.floor(performance.now() * 1000)}.png`);
  const n = fakeCalls;
  writeFileSync(out, await sharp(bytes).composite([{ input: { create: { width: 1, height: 1, channels: 3, background: { r: n % 256, g: (n >> 8) % 256, b: 7 } } }, left: 0, top: 0 }]).png().toBuffer());
  return out;
};
// 呼ぶたびに同じ画像を返す（並列の実行で別の実行の画像を取り違えたときの形）
const fakeSame = (bytes) => async () => {
  const out = join(tmpdir(), `vf-same-${process.pid}-${Math.floor(performance.now() * 1000)}.png`);
  writeFileSync(out, bytes);
  return out;
};
const allOk = (root) => auditQueue(root, PACK).map((q) => ({ figKey: q.figKey, verdict: 'ok', reason: '原稿どおりで文字の誤りが無い' }));

test('指示は原稿だけから決まり、指定の文字を含む', () => {
  const s = scene('a');
  assert.equal(buildBodyPrompt(s, 'pe-construction'), buildBodyPrompt(s, 'pe-construction'));
  for (const word of ['aの見出し', '甲 乙', '丙', '注記', '中央の語', '#33356B']) assert.ok(buildBodyPrompt(s, 'pe-construction').includes(word), word);
  assert.ok(!buildBodyPrompt({ sceneId: 'x', narration: 'n', visual: {} }, 'pe-construction').includes('undefined'));
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

test('生成: 別の場面と同じ画像は採らず、取り違えの疑いとして作り直しへ回す（DN-1036）', async () => {
  const f = fixture();
  try {
    buildPlan(f.root, PACK, { date: '20261104', refs });
    const result = await generatePlan(f.root, PACK, { generate: fakeSame(await png(1920, 1080)), concurrency: 1 });
    const plan = readPlan(f.root, PACK);
    const adopted = plan.items.filter((i) => i.raw);
    assert.equal(adopted.length, 1, '同じ画像を 2 つ以上の場面に採った');
    const rejected = plan.items.filter((i) => !i.raw);
    assert.ok(rejected.length >= 1);
    for (const i of rejected) assert.match(i.lastError, /同じ画像（取り違えの疑い）/);
    assert.equal(result.missing, rejected.length);
  } finally { f.done(); }
});

test('計画: 指示を改善しても合格済みは残し、未合格は回数を数え直す', async () => {
  const f = fixture();
  try {
    buildPlan(f.root, PACK, { date: '20261104', refs });
    await generatePlan(f.root, PACK, { generate: fake(await png(1920, 1080)) });
    recordAudit(f.root, PACK, [{ figKey: 'a', verdict: 'ok', reason: '原稿どおりで文字の誤りが無い' }, { figKey: 'b', verdict: 'fail', reason: '下の文が欠けている図である' }], { by: 'auditor' });
    const plan = readPlan(f.root, PACK);
    for (const item of plan.items) { item.basePrompt = `旧 ${item.basePrompt}`; item.attempts = MAX_ATTEMPTS; }
    writeFileSync(join(f.root, planPath(PACK)), JSON.stringify(plan));
    const next = buildPlan(f.root, PACK, { date: '20261104', refs });
    const byId = Object.fromEntries(next.items.map((i) => [i.id, i]));
    assert.ok(byId.a.raw && byId.a.audit?.verdict === 'ok');
    assert.equal(byId.b.attempts, 0);
  } finally { f.done(); }
});

test('生成: 画像が出ない試行は回数に数えず、続けば止めて勝手に通さない（DN-1065）', async () => {
  const f = fixture();
  try {
    buildPlan(f.root, PACK, { date: '20261104', refs, scope: 'cover' });
    const first = await generatePlan(f.root, PACK, { generate: async () => null });
    assert.equal(first.unreachable, true, '試した全項目で画像が出なければ unreachable');
    for (let i = 0; i < MAX_NO_OUTPUT + 2; i += 1) await generatePlan(f.root, PACK, { generate: async () => null });
    const item = readPlan(f.root, PACK).items[0];
    assert.equal(item.attempts, 0, '画像が出なかった試行は品質の回数を使わない');
    assert.equal(item.noOutput, MAX_NO_OUTPUT, '止めた後は呼ばない');
    const s = summarize(readPlan(f.root, PACK));
    assert.deepEqual(s.exhausted, []);
    assert.deepEqual(s.stalled, ['cover']);
    assert.equal(s.reasons.cover, '画像が出なかった');
    assert.equal(nextStage({ status: 'qa_passed', standard: false, plan: s, qa: 'passed' }), 'generate-stalled');
  } finally { f.done(); }
});

test('生成: 一部でも画像が出た回は unreachable にしない', async () => {
  const f = fixture();
  try {
    buildPlan(f.root, PACK, { date: '20261104', refs });
    const ok = fake(await png(1920, 1080));
    const r = await generatePlan(f.root, PACK, { generate: (p, m, o) => (p.includes('『aの見出し』') ? null : ok(p, m, o)), concurrency: 1 });
    assert.equal(r.unreachable, false);
    assert.equal(r.attempted, 3);
    assert.equal(r.missing, 1, '場面 a だけ画像が出ていない');
    assert.equal(readPlan(f.root, PACK).items.find((i) => i.id === 'a').noOutput, 1);
  } finally { f.done(); }
});

test('やり直し: 上限に達した項目の回数と理由を戻し、原稿を変えずに作り直せる（DN-1065）', async () => {
  const f = fixture();
  try {
    buildPlan(f.root, PACK, { date: '20261104', refs, scope: 'cover' });
    const tiny = fake(await png(800, 450));
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) await generatePlan(f.root, PACK, { generate: tiny });
    assert.deepEqual(summarize(readPlan(f.root, PACK)).exhausted, ['cover']);
    assert.match(summarize(readPlan(f.root, PACK)).reasons.cover, /解像度/);
    // 原稿が同じなので plan を作り直しても回数は戻らない
    buildPlan(f.root, PACK, { date: '20261105', refs, scope: 'cover' });
    assert.deepEqual(summarize(readPlan(f.root, PACK)).exhausted, ['cover']);
    assert.throws(() => retryItems(f.root, PACK, ['nope']), /計画に無い/);
    const r = retryItems(f.root, PACK, ['all']);
    assert.deepEqual(r.reset, ['cover']);
    assert.deepEqual(r.exhausted, []);
    const item = readPlan(f.root, PACK).items[0];
    assert.equal(item.attempts, 0);
    assert.equal(item.fix, null);
    await generatePlan(f.root, PACK, { generate: fake(await png(1920, 1080)) });
    assert.equal(summarize(readPlan(f.root, PACK)).missing, 0);
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
    assert.equal(JSON.parse(readFileSync(join(f.dir, 'cover-design.json'), 'utf8')).covers.longform.character.pose, 'pop-explaining');
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

test('描画の前に: 本文の採用画像と原本を全部揃える', async () => {
  const f = fixture();
  try {
    buildPlan(f.root, PACK, { date: '20261104', refs });
    await generatePlan(f.root, PACK, { generate: fake(await png(1920, 1080)) });
    recordAudit(f.root, PACK, allOk(f.root), { by: 'auditor' });
    await adoptPlan(f.root, PACK, { now: 'T' });
    const seen = [];
    assert.equal(hydrateAdopted(f.root, PACK, { refs: (_r, p) => seen.push(p) }), 4);
    assert.ok(seen.every((p) => p.startsWith(`.tmp/media/${PACK}/work/`)));
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
    // 内容QAは画像の前（DN-1067）。未採点・原稿が変わった QA は画像へ進めない
    [{ status: 'draft', standard: false, plan: null, qa: 'none' }, 'qa'],
    [{ status: 'draft', standard: false, plan: { ...plan, missing: 2 }, qa: 'stale' }, 'qa'],
    [{ status: 'draft', standard: true, rendered: true, qa: 'stale' }, 'qa'],
    [{ status: 'qa_passed', standard: false, plan: null, qa: 'passed' }, 'plan'],
    [{ status: 'qa_passed', standard: false, plan: { ...plan, missing: 2 }, qa: 'passed' }, 'generate'],
    [{ status: 'qa_passed', standard: false, plan: { ...plan, unaudited: 1 }, qa: 'passed' }, 'audit'],
    [{ status: 'qa_passed', standard: false, plan, qa: 'passed' }, 'adopt'],
    [{ status: 'qa_passed', standard: true, rendered: false, qa: 'passed' }, 'render'],
    [{ status: 'qa_passed', standard: true, rendered: true, qa: 'passed', review: 'none' }, 'review'],
    [{ status: 'qa_passed', standard: true, rendered: true, qa: 'passed', review: 'fail' }, 'review-failed'],
    [{ status: 'qa_passed', standard: true, rendered: true, qa: 'passed', review: 'pass' }, 'ready-for-approval'],
  ];
  for (const [facts, stage] of cases) assert.equal(nextStage(facts), stage, JSON.stringify(facts));
});

test('nextStage: 承認しただけで予約へ進んでいない行を done にしない（DN-1066）', () => {
  assert.equal(nextStage({ status: 'approved', delivering: false, slotExpired: false }), 'publish-pending');
  assert.equal(nextStage({ status: 'approved', delivering: false, slotExpired: true }), 'slot-expired');
  assert.equal(nextStage({ status: 'rendered', delivering: false, slotExpired: false }), 'publish-pending');
  assert.equal(nextStage({ status: 'approved', delivering: true, slotExpired: true }), 'done', '予約の段へ進んだ行は照合に任せる');
  assert.equal(nextStage({ status: 'scheduled', delivering: false, slotExpired: true }), 'done');
});

test('承認を外す: 予約へ進んでいない承認済みの行だけを qa_passed へ戻す（DN-1066）', () => {
  const base = { id: 'pe-construction/x/youtube.longform.reading-fix', work: 'x', account: 'youtube:main', format: 'longform', revisionOf: 'pe-construction/x/youtube.longform', publishAt: '2026-11-11T11:30:00Z' };
  const approval = { by: 'policy', at: '2026-11-05T22:12:46.119Z', contentSha256: 'a'.repeat(64) };
  const row = unapprovedRow({ ...base, status: 'approved', approval, review: { visual: { status: 'approved', by: 'policy', at: approval.at, digest: 'b'.repeat(64) } } });
  assert.equal(row.status, 'qa_passed');
  assert.equal(row.approval, undefined);
  assert.equal(row.review, undefined, '方針が書いた画面確認の承認も外す');
  assert.equal(row.publishAt, base.publishAt);
  const human = unapprovedRow({ ...base, status: 'approved', approval, review: { visual: { status: 'approved', by: 'user', at: approval.at } } });
  assert.equal(human.review.visual.by, 'user', '運営者の確認は残す');
  assert.throws(() => unapprovedRow({ ...base, status: 'scheduled', approval }), /承認済みの行ではない/);
  assert.throws(() => unapprovedRow({ ...base, status: 'approved' }), /承認済みの行ではない/);
  assert.throws(() => unapprovedRow({ ...base, status: 'approved', approval, delivery: { uploadRequestedAt: '2026-11-10T00:00:00Z' } }), /予約の段へ進んでいる/);
});

test('関門: 1 項目でも欠けたら通さず、検査していない音声を合格にしない', () => {
  const policy = { enabled: true, scope: { channel: 'youtube', format: 'longform' }, minQaAvg: 2, maxBlocks: 0, minLeadHours: 24, audio: { minSimilarity: 0.6, minMaxVolumeDb: -12, maxMaxVolumeDb: -0.1, maxDurationGapSec: 3 } };
  const now = Date.parse('2026-11-05T00:00:00Z');
  const pub = { channel: 'youtube', format: 'longform', publishAt: '2026-11-07T11:30:00Z' };
  const good = { pub, planProblems: [], standard: true, aiBlocked: [], renderVerified: true, qa: { avg: 2.5, blocks: 0 }, review: 'pass', funnelOk: true, audioProblems: [] };
  assert.equal(evaluateGate(good, policy, now).ok, true);
  assert.equal(evaluateGate({ ...good, audioProblems: audioProblems(undefined, 'a', policy) }, policy, now).ok, false);
  assert.equal(evaluateGate({ ...good, review: 'none' }, policy, now).ok, false);
  assert.equal(evaluateGate({ ...good, planProblems: ['計画にない動画: x'] }, policy, now).ok, false);
  assert.equal(evaluateGate({ ...good, planProblems: undefined }, policy, now).ok, false);
  assert.equal(evaluateGate({ ...good, funnelOk: false }, policy, now).ok, false);
  assert.equal(evaluateGate({ ...good, pub: { ...pub, publishAt: '2026-11-05T12:00:00Z' } }, policy, now).ok, false);
  assert.equal(evaluateGate(good, { ...policy, enabled: false }, now).ok, false);
});

test('音声の判定は動画の sha に結び、作り直すと無効になる', () => {
  const policy = { audio: { minSimilarity: 0.6, minMaxVolumeDb: -12, maxMaxVolumeDb: -0.1, maxDurationGapSec: 3 } };
  const check = { videoSha256: 'a', similarity: 0.9, maxVolumeDb: -3, durationGapSec: 1 };
  assert.deepEqual(audioProblems(check, 'a', policy), []);
  assert.equal(audioProblems(check, 'b', policy).length, 1);
  assert.equal(audioProblems({ ...check, similarity: 0.2 }, 'a', policy).length, 1);
  assert.ok(speechSimilarity('業務の判断を語る。', '業務の判断を語る') > 0.95);
  assert.ok(speechSimilarity('業務の判断を語る', '全く別の発話です') < 0.2);
});

test('方針の承認は YouTube の通常動画だけで受け付ける', () => {
  assert.equal(acceptedApproval({ channel: 'youtube', format: 'longform', approval: { by: 'policy' } }), true);
  assert.equal(acceptedApproval({ channel: 'youtube', format: 'short', approval: { by: 'policy' } }), false);
  assert.equal(acceptedApproval({ channel: 'instagram', format: 'carousel', approval: { by: 'policy' } }), false);
  assert.equal(acceptedApproval({ channel: 'instagram', format: 'carousel', approval: { by: 'user' } }), true);
});

test('空き枠は週の上限と計画の目標日を守る', () => {
  const policy = { minLeadHours: 24, slot: { timeJst: '20:30', maxPerDay: 1 } };
  const now = Date.parse('2026-11-16T00:00:00Z'); // JST の月曜
  const taken = ['2026-11-17T11:30:00Z', '2026-11-18T11:30:00Z'];
  assert.equal(nextSlot(taken, policy, now), '2026-11-19T11:30:00Z');
  assert.equal(nextSlot(taken, policy, now, { weekLimit: () => 2 }), '2026-11-23T11:30:00Z');
  assert.equal(nextSlot([], policy, now, { notBefore: '2026-12-01' }), '2026-12-01T11:30:00Z');
});

test('空き枠は猶予と 1 日の上限を守る', () => {
  const policy = { minLeadHours: 24, slot: { timeJst: '20:30', maxPerDay: 1 } };
  const now = Date.parse('2026-11-05T00:00:00Z');
  assert.equal(nextSlot(['2026-11-06T11:30:00Z'], policy, now), '2026-11-07T11:30:00Z');
});

test('投稿の残りは太平洋時間の 0 時からの本数で決まる', () => {
  const now = Date.parse('2026-11-05T20:00:00Z');
  const pub = (uploaded) => ({ channel: 'youtube', times: { uploaded } });
  // 11 月は太平洋標準時なので 08:00Z が境目。01:00Z は前の日の割当
  assert.equal(uploadsLeft([pub('2026-11-05T01:00:00Z'), pub('2026-11-05T08:00:00Z'), pub('2026-11-05T09:00:00Z')], { maxUploadsPerDay: 4 }, now), 2);
  assert.equal(uploadsLeft([], { maxUploadsPerDay: 4 }, now), 4);
});

test('在庫の関門は公開日時を見ず、他の項目は同じように止める', () => {
  const policy = { enabled: true, scope: { channel: 'youtube', format: 'longform' }, minQaAvg: 2, maxBlocks: 0, minLeadHours: 24 };
  const good = { pub: { channel: 'youtube', format: 'longform' }, planProblems: [], standard: true, aiBlocked: [], renderVerified: true, qa: { avg: 2.5, blocks: 0 }, review: 'pass', funnelOk: true, audioProblems: [] };
  assert.equal(evaluateGate(good, policy).ok, false);
  assert.equal(evaluateGate(good, policy, Date.now(), { stock: true }).ok, true);
  assert.equal(evaluateGate({ ...good, review: 'none' }, policy, Date.now(), { stock: true }).ok, false);
});

test('画面確認の判定は公開日時が変わっても有効で、中身が変わると無効になる', () => {
  const state = { visual: { current: 'v' }, final: { current: 'f2' }, content: 'c' };
  assert.equal(reviewIsCurrent({ visualDigest: 'v', finalDigest: 'f1', contentDigest: 'c' }, state), true);
  assert.equal(reviewIsCurrent({ visualDigest: 'v', finalDigest: 'f1', contentDigest: 'x' }, state), false);
  assert.equal(reviewIsCurrent({ visualDigest: 'x', contentDigest: 'c' }, state), false);
  assert.equal(reviewIsCurrent({ visualDigest: 'v', finalDigest: 'f1' }, state), false);
});

test('内容QAの合格は原稿の digest に付き、原稿が変われば古くなる（DN-1067）', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.dir, 'script.md'), ['# 台本', '本文', ''].join('\r\n'));
    writeFileSync(join(f.dir, 'video-pack.json'), JSON.stringify({ packId: 'sample' }));
    const digest = qaInputDigest(f.root, PACK);
    assert.equal(qaState({ avg: 2.5, blocks: 0, inputSha256: digest }, digest), 'passed');
    assert.equal(qaState({ avg: 1.5, blocks: 0, inputSha256: digest }, digest), 'blocked');
    assert.equal(qaState({ avg: 2.5, blocks: 1, inputSha256: digest }, digest), 'blocked');
    assert.equal(qaState(undefined, digest), 'none');
    assert.equal(qaState({ avg: 2.5, blocks: 0 }, digest), 'passed', 'digest の無い記録は受け入れる');
    // 改行コードだけの違いでは古くしない
    writeFileSync(join(f.dir, 'script.md'), ['# 台本', '本文', ''].join('\n'));
    assert.equal(qaInputDigest(f.root, PACK), digest);
    // 画像の工程が書く imageDesign では古くしない
    const board = JSON.parse(readFileSync(join(f.dir, 'storyboard.json'), 'utf8'));
    writeFileSync(join(f.dir, 'storyboard.json'), JSON.stringify({ ...board, imageDesign: { mode: 'codex-pop' } }));
    assert.equal(qaInputDigest(f.root, PACK), digest);
    // 語りを変えると古くなる
    board.scenes[1].narration = '語りを直した';
    writeFileSync(join(f.dir, 'storyboard.json'), JSON.stringify(board));
    assert.equal(qaState({ avg: 2.5, blocks: 0, inputSha256: digest }, qaInputDigest(f.root, PACK)), 'stale');
  } finally { f.done(); }
});

test('preflight: 画像の前に公開行・年間の枠・主CTA・表紙の設計を見る（DN-1068）', () => {
  const cover = { covers: { longform: { headline: ['見出し'] } } };
  const products = [{ channel: 'note', id: 'm', catalog: { published: true } }, { channel: 'note', id: 'old', catalog: { published: true, retiredAt: '2026-01-01' } }, { channel: 'coconala', id: 'c', catalog: { status: 'paused' } }];
  const siteUrl = (p) => { if (p.includes('missing')) throw new Error('解決できない'); return 'https://example.com/x'; };
  const base = { pub: { id: 'q/a/youtube.longform' }, planProblems: [], products, siteUrl, cover };
  assert.deepEqual(preflightProblems({ ...base, cta: { kind: 'note-magazine', targetId: 'm' } }), []);
  assert.deepEqual(preflightProblems({ ...base, cta: { kind: 'site-article', targetPath: 'content/site/a/b/article.mdx' } }), []);
  const one = (over) => preflightProblems({ ...base, ...over });
  assert.match(one({ pub: null, cta: { kind: 'note-magazine', targetId: 'm' } })[0], /公開行が無い/);
  assert.match(one({ planProblems: ['計画にない動画: x'], cta: { kind: 'note-magazine', targetId: 'm' } })[0], /計画にない/);
  assert.match(one({ cta: { kind: 'note-magazine', targetId: 'old' } })[0], /公開中でない/);
  assert.match(one({ cta: { kind: 'coconala-service', targetId: 'c' } })[0], /出品中でない/);
  assert.match(one({ cta: { kind: 'site-article', targetPath: 'content/site/missing/x/article.mdx' } })[0], /解決できない/);
  assert.match(one({ cta: { kind: 'links-hub' } })[0], /links-hub/);
  assert.match(one({ cta: { kind: 'note-magazine', targetId: 'm' }, cover: null })[0], /cover-design/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { runPlate } from '../scripts/lib/media-plate.mjs';

const PUB = 'civil-construction-2/matome-2kyu-chokuzen/youtube.longform';
const sha = (b) => createHash('sha256').update(b).digest('hex');

async function setup() {
  const root = mkdtempSync(join(tmpdir(), 'media-plate-test-'));
  const png = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#336699' } }).png().toBuffer();
  const promptFile = join(root, 'prompt.txt');
  writeFileSync(promptFile, '  青い背景の図  \n');
  const gen = [];
  const calls = { media: [], pubs: [] };
  const deps = {
    log: () => {},
    now: () => new Date('2026-10-09T01:02:03Z'),
    load: () => ({ publications: [{ id: PUB, exam: 'civil-construction-2', channel: 'youtube', work: 'w', media: { cta: 'x' } }] }),
    generate: (p, m) => { gen.push([p, m]); const f = join(root, 'gen.png'); writeFileSync(f, png); return f; },
    upsertMedia: (r, scope, rows) => calls.media.push([scope, rows]),
    upsertPublications: (r, ch, exam, rows) => calls.pubs.push([ch, exam, rows]),
  };
  return { root, png, promptFile, gen, calls, deps };
}

test('plate: dry-run は生成も書き込みもしない', async () => {
  const t = await setup();
  try {
    const r = await runPlate(t.root, { pub: PUB, role: 'cover', promptFile: t.promptFile }, t.deps);
    assert.equal(r.committed, false);
    assert.equal(t.gen.length, 0);
    assert.equal(t.calls.media.length, 0);
    assert.ok(!existsSync(join(t.root, '.claude/state/quality/ai-image-review-ledger.json')));
  } finally { rmSync(t.root, { recursive: true, force: true }); }
});

test('plate --commit: 置き場・素材の行・公開の行・AI 台帳が固定される', async () => {
  const t = await setup();
  try {
    const r = await runPlate(t.root, { pub: PUB, role: 'cover', promptFile: t.promptFile, model: 'gpt-x', commit: true }, t.deps);
    const s = sha(t.png);
    assert.deepEqual(t.gen, [['青い背景の図', 'gpt-x']]);
    assert.equal(r.path, `.tmp/media/${PUB}/cover.${s.slice(0, 8)}.png`);
    assert.ok(existsSync(join(t.root, r.path)));
    const [scope, rows] = t.calls.media[0];
    assert.equal(scope, 'civil-construction-2');
    assert.deepEqual(rows[0].provenance, { kind: 'ai-generated', tool: 'codex', model: 'gpt-x', prompt: '青い背景の図', promptSha256: sha('青い背景の図'), generatedAt: '2026-10-09T01:02:03.000Z' });
    assert.equal(rows[0].id, `${PUB}/cover`);
    assert.equal(rows[0].sha256, s);
    assert.equal(rows[0].width, 8);
    assert.deepEqual(t.calls.pubs[0][2][0].media, { cta: 'x', cover: `${PUB}/cover` });
    const ledger = JSON.parse(readFileSync(join(t.root, '.claude/state/quality/ai-image-review-ledger.json'), 'utf8'));
    assert.deepEqual(ledger.figures[`media:${PUB}/cover`], { sha: s.slice(0, 16), promptSha: sha('青い背景の図').slice(0, 16), tool: 'codex', generatedAt: '2026-10-09T01:02:03.000Z' });
    assert.ok(!('verdict' in ledger.figures[`media:${PUB}/cover`]));
  } finally { rmSync(t.root, { recursive: true, force: true }); }
});

test('plate --commit: 生成されなければ何も書かず code 3', async () => {
  const t = await setup();
  try {
    const r = await runPlate(t.root, { pub: PUB, role: 'cover', promptFile: t.promptFile, commit: true }, { ...t.deps, generate: () => null });
    assert.equal(r.code, 3);
    assert.equal(t.calls.media.length, 0);
  } finally { rmSync(t.root, { recursive: true, force: true }); }
});

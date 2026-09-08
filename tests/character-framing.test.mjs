import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { validateFraming, frameGeometry } from '../scripts/lib/character-frame-geometry.mjs';
import { renderCharacterFrame } from '../scripts/lib/character-framing.mjs';
import { readCharacterCatalog } from '../scripts/lib/character-catalog.mjs';

const original = JSON.parse(readFileSync(new URL('../.claude/config/character-poses.json', import.meta.url)));
async function fixture(t, mutate = () => {}) {
  const root = mkdtempSync(join(tmpdir(), 'character-frame-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const m = structuredClone(original);
  m.poses = [m.poses[0]];
  const bytes = await sharp({ create: { width: 100, height: 200, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 0.5 } } }).png().toBuffer();
  m.poses[0].framing.source = { width: 100, height: 200, sha256: createHash('sha256').update(bytes).digest('hex') };
  mutate(m);
  mkdirSync(join(root, '.claude/config'), { recursive: true });
  mkdirSync(join(root, m.assetsDir), { recursive: true });
  writeFileSync(join(root, '.claude/config/character-poses.json'), JSON.stringify(m));
  writeFileSync(join(root, m.assetsDir, 'pointing.png'), bytes);
  return { root, m, bytes };
}

test('台帳の全ポーズに原本hashと3種類の切り取り可否がある', () => {
  for (const pose of original.poses) {
    assert.ok(pose.framing, pose.slug);
    validateFraming(pose.framing);
  }
  const board = original.poses.find(p => p.slug === 'whiteboard');
  assert.equal(board.framing.variants.waist.box, null);
  assert.equal(board.framing.variants.bust.box, null);
});

test('欠損座標・範囲外・原本hash不正を台帳読込で止める', () => {
  for (const mutate of [f => f.source.sha256 = 'bad', f => f.variants.bust.box = [0, 0, 1, 2],
    f => f.variants.waist.box = [0, 0, -1, 1], f => delete f.variants.full]) {
    const f = structuredClone(original.poses[0].framing);
    mutate(f);
    assert.throws(() => validateFraming(f), /不正/);
  }
});

test('切り取り座標から寸法を導出し拡大せず、過大サイズを拒否する', () => {
  const g = frameGeometry({ width: 500, height: 1227 }, [0, 0, 1, .35], 1080);
  assert.equal(g.width, 500);
  assert.equal(g.height, 430);
  assert.equal(g.limited, true);
  for (const width of [-1, 1.5, NaN, 4097]) assert.throws(() => frameGeometry({ width: 500, height: 1227 }, [0, 0, 1, 1], width));
});

test('同じ原本から透過を保持し胸上を再現し、元PNGを変更しない', async t => {
  const { root, bytes } = await fixture(t);
  const r = await renderCharacterFrame(root, { pose: 'pointing', frame: 'bust', width: 50 });
  const meta = await sharp(r.buffer).metadata();
  assert.equal(meta.width, 50);
  assert.equal(meta.height, 35);
  assert.equal(meta.hasAlpha, true);
  const raw = await sharp(r.buffer).raw().toBuffer();
  assert.ok(raw[3] >= 127 && raw[3] <= 128);
  assert.deepEqual(readFileSync(join(root, original.assetsDir, 'pointing.png')), bytes);
  assert.deepEqual((await renderCharacterFrame(root, { pose: 'pointing', frame: 'bust', width: 50 })).buffer, r.buffer);
});

test('要修正は書き出し不可、目視プレビューだけ許可', async t => {
  const { root } = await fixture(t, m => m.poses[0].quality.status = 'needs-fix');
  await assert.rejects(renderCharacterFrame(root, { pose: 'pointing' }), /書き出せません/);
  assert.ok((await renderCharacterFrame(root, { pose: 'pointing', preview: true })).buffer.length > 0);
});

test('原画像差し替え時は同寸法でも切り取りの再確認を要求する', async t => {
  const { root } = await fixture(t);
  writeFileSync(join(root, original.assetsDir, 'pointing.png'), 'replaced');
  await assert.rejects(renderCharacterFrame(root, { pose: 'pointing' }), /再確認/);
});

test('未登録ID・未登録切り取り・画像無しを黙ってフォールバックしない', async t => {
  const { root } = await fixture(t);
  await assert.rejects(renderCharacterFrame(root, { pose: '../pointing' }), /未登録/);
  await assert.rejects(renderCharacterFrame(root, { pose: 'pointing', frame: '__proto__' }), /使用できません/);
  rmSync(join(root, original.assetsDir, 'pointing.png'));
  assert.equal(readCharacterCatalog(root).poses[0].available, false);
  await assert.rejects(renderCharacterFrame(root, { pose: 'pointing' }), /原画像がありません/);
});

test('素材ルート外へのsymlinkを拒否する', async t => {
  const { root, bytes } = await fixture(t);
  const image = join(root, original.assetsDir, 'pointing.png');
  rmSync(image);
  const outside = join(root, 'outside.png');
  writeFileSync(outside, bytes);
  symlinkSync(outside, image);
  await assert.rejects(renderCharacterFrame(root, { pose: 'pointing' }), /ルート外/);
});

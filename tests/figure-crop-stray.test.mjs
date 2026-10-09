// 図クロップ検査（check-figure-crop-integrity）の切れ端判定を固定する。
// 2026-10-07: 図5.4 の上端の帰還矢印（横線が 1px の縦線で本体に繋がる）を STRAY_SLIVER と誤判定し、CI の audit が落ちた。
// 縦の細線はインク率が白ラインの閾値を下回るので、ギャップの行は白に数えられる。島から本体まで線が通っていれば図の一部とみなす。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { analyzeImage } from '../scripts/check-figure-crop-integrity.mjs';

const W = 1000;
const H = 600;

async function draw(name, rects) {
  const px = Buffer.alloc(W * H, 255);
  for (const [x0, y0, x1, y1] of rects) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px[y * W + x] = 0;
  }
  const path = join(dir, `${name}.png`);
  await sharp(px, { raw: { width: W, height: H, channels: 1 } }).png().toFile(path);
  return path;
}

const dir = mkdtempSync(join(tmpdir(), 'figure-crop-stray-'));
test.after(() => rmSync(dir, { recursive: true, force: true }));

const BODY = [300, 150, 500, 450]; // 図の本体
const TOP_LINE = [20, 12, 200, 13]; // 上端の高さ 2px の横線

test('本体から白いギャップで離れた上端の横線は切れ端（STRAY_SLIVER）', async () => {
  const r = await analyzeImage(await draw('isolated', [BODY, TOP_LINE]));
  assert.ok(r.violations.some((v) => v.rule === 'STRAY_SLIVER' && v.side === 'top'), JSON.stringify(r.violations));
});

test('上端の横線が 1px の縦線で本体まで繋がっていれば図の一部（帰還矢印・軸の矢じり）', async () => {
  const r = await analyzeImage(await draw('connected', [BODY, TOP_LINE, [20, 12, 20, 300]]));
  assert.equal(r.violations.some((v) => v.rule.startsWith('STRAY_') && v.side === 'top'), false, JSON.stringify(r.violations));
});

test('縦線が途中で切れていれば繋がっていない（破線や別の図の線を本体と見なさない）', async () => {
  const r = await analyzeImage(await draw('broken', [BODY, TOP_LINE, [20, 12, 20, 80], [20, 90, 20, 300]]));
  assert.ok(r.violations.some((v) => v.rule === 'STRAY_SLIVER' && v.side === 'top'), JSON.stringify(r.violations));
});

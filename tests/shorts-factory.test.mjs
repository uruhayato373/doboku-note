import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { buildAss, inspectShortImage, narrationProblems } from '../scripts/lib/shorts-factory.mjs';

const noisy = async (width, height, bottomFlat = false) => {
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const v = bottomFlat && y > height * 0.75 ? 20 : ((x >> 4) + (y >> 4)) % 2 ? 230 : 30;
    raw.fill(v, (y * width + x) * 3, (y * width + x) * 3 + 3);
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
};

test('全面の縦画像は機械検査を通る', async () => {
  assert.deepEqual(await inspectShortImage(await noisy(1080, 1920)), []);
});

test('下端の無地帯は採用前に止める（旧 CTA の紺帯の再発防止）', async () => {
  const issues = await inspectShortImage(await noisy(1080, 1920, true));
  assert.match(issues.join(), /下端が無地の帯/);
});

test('9:16 以外と低解像度は止める', async () => {
  assert.match((await inspectShortImage(await noisy(1024, 1536))).join(), /9:16 ではない/);
  assert.match((await inspectShortImage(await noisy(720, 1280))).join(), /解像度が足りない/);
});

test('論点ごとの語りは台本の場面と一致しなければ止める', () => {
  const scene = { narration: '基準は1000リットル。小数へ直す。' };
  assert.deepEqual(narrationProblems({ hook: '導入', beats: [{ narration: '基準は1000リットル。' }, { narration: '小数へ直す。' }] }, scene), []);
  assert.match(narrationProblems({ hook: '導入', beats: [{ narration: '基準は2000リットル。' }] }, scene).join(), /一致しない/);
  assert.match(narrationProblems({ beats: [{ narration: '基準は1000リットル。小数へ直す。' }] }, scene).join(), /hook/);
});

test('字幕は大きな文字で、切り分けても音声の時間を超えない', () => {
  const ass = buildAss([{ text: '水セメント比W/Cとセメント水比C/Wを逆にしない。', start: 1, duration: 4 }]);
  assert.match(ass, /Noto Sans JP,74,/);
  const ends = [...ass.matchAll(/Dialogue: 0,[^,]+,0:00:(\d+\.\d+)/g)].map((m) => Number(m[1]));
  assert.ok(ends.length >= 2);
  assert.equal(ends.at(-1), 5);
});

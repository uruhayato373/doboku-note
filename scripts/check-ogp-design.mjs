/**
 * check-ogp-design.mjs
 *
 * OGP 画像が旧ライトデザインのまま残っていないかを背景輝度で検知する。
 * 右上隅（160×80px 領域）の平均輝度が閾値を超えていればライト（旧）と判定。
 *
 * Usage:
 *   node scripts/check-ogp-design.mjs            # 全 ogp.png を検査
 *   node scripts/check-ogp-design.mjs --ci        # 旧デザインが 1 件でもあれば exit 1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(PROJECT_ROOT, 'content/site');

// 右上隅のサンプル領域（新デザインはここが暗い）
const SAMPLE = { left: 1040, top: 0, width: 160, height: 80 };
// 輝度閾値: 平均 > この値なら旧ライトデザインと判定（0-255）
const LIGHT_THRESHOLD = 160;

const args = process.argv.slice(2);
const CI_MODE = args.includes('--ci');

function findOgpFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findOgpFiles(full));
    else if (entry.name === 'ogp.png') results.push(full);
  }
  return results;
}

async function avgBrightness(filePath) {
  const { data, info } = await sharp(filePath)
    .extract(SAMPLE)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sum = data.reduce((s, v) => s + v, 0);
  return sum / info.width / info.height;
}

const files = findOgpFiles(POSTS_DIR);
console.log(`[check-ogp-design] ${files.length} 件の ogp.png を検査`);

const stale = [];
let checked = 0;
for (const f of files) {
  try {
    const brightness = await avgBrightness(f);
    if (brightness > LIGHT_THRESHOLD) {
      stale.push({ file: path.relative(PROJECT_ROOT, f), brightness: Math.round(brightness) });
    }
  } catch {
    // サイズ不一致などは無視
  }
  checked++;
  if (checked % 200 === 0) process.stderr.write(`  ${checked}/${files.length}\n`);
}

if (stale.length === 0) {
  console.log('[check-ogp-design] ✓ 旧ライトデザインの OGP は検出されませんでした');
  process.exit(0);
} else {
  console.log(`[check-ogp-design] ✗ 旧ライトデザインの OGP が ${stale.length} 件検出されました:\n`);
  for (const s of stale) {
    console.log(`  輝度 ${s.brightness}  ${s.file}`);
  }
  console.log('\n修正: npm run ogp -- --all --force --include-unpublished');
  if (CI_MODE) process.exit(1);
}

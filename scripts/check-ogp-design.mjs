/**
 * check-ogp-design.mjs — 写真 OGP（photo-scrim）にすべきページの ogp.png が、旧い意匠のまま残っていないかを輝度で検知する。
 *
 * 2026-11-13 から、ページ写真（config/site-thumbnails.json に版がある）のあるページの OGP は photo-scrim
 * （写真の上に暗いグラデーション＋白文字）にする。文字の載る左側の帯（SAMPLE）の平均輝度が閾値を超えていれば、
 * 淡い背景の旧い意匠（mono-tag）のままと判定する。写真の無いページは mono-tag が正しいので見ない。
 * ogp.png は R2 に退避していて手元に無いことが多い。手元にある分だけを見て、検査対象数と実検査数を出す。
 *
 * Usage:
 *   node scripts/check-ogp-design.mjs        # 手元の ogp.png を検査（報告のみ）
 *   node scripts/check-ogp-design.mjs --ci   # 旧い意匠が 1 件でもあれば exit 1
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { REPO_ROOT as PROJECT_ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { availablePhotoVersion } from './lib/site-photo.mjs';
import { listFiles } from './lib/fs-walk.mjs';

// 文字の載る左側の帯。photo-scrim はここに濃い暗色のグラデーションを敷くので暗い
const SAMPLE = { left: 40, top: 140, width: 480, height: 300 };
// 平均輝度（0-255）がこれを超えれば旧い意匠（淡い背景）と判定
const DARK_MAX = 110;

const CI_MODE = process.argv.includes('--ci');

async function avgBrightness(filePath) {
  const { data, info } = await sharp(filePath).extract(SAMPLE).greyscale().raw().toBuffer({ resolveWithObject: true });
  return data.reduce((s, v) => s + v, 0) / info.width / info.height;
}

const files = listFiles(SITE_CONTENT_ROOT, { skipDir: (_p, name) => name === 'img' })
  .filter((f) => path.basename(f) === 'ogp.png');
const photoPages = files.filter((f) => {
  const [category, local] = path.relative(SITE_CONTENT_ROOT, f).split(path.sep);
  return local && local !== 'ogp.png' && availablePhotoVersion(category, local);
});

const stale = [];
let checked = 0;
let unreadable = 0;
for (const f of photoPages) {
  try {
    const brightness = await avgBrightness(f);
    checked++;
    if (brightness > DARK_MAX) stale.push({ file: path.relative(PROJECT_ROOT, f), brightness: Math.round(brightness) });
  } catch {
    unreadable++;
  }
}

console.log(`[check-ogp-design] 手元の ogp.png ${files.length} 件 / 写真のあるページ ${photoPages.length} 件 / 検査 ${checked} 件 / 読めない ${unreadable} 件`);
if (photoPages.length && !checked) {
  console.log('[check-ogp-design] 検査不成立（写真のあるページの ogp.png を 1 件も読めなかった）');
  process.exit(2);
}
if (!stale.length) {
  console.log(`[check-ogp-design] ✓ 写真のあるページで旧い意匠の OGP は ${checked} 件中 0 件`);
  process.exit(0);
}
console.log(`[check-ogp-design] ✗ 写真があるのに旧い意匠の OGP が ${stale.length} 件:\n`);
for (const s of stale) console.log(`  輝度 ${s.brightness}  ${s.file}`);
console.log('\n修正: npm run ogp -- <slug> --force（CI では OGP Supply が srcHash の食い違いとして作り直す）');
if (CI_MODE) process.exit(1);

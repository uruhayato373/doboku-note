#!/usr/bin/env node
/**
 * build-character-avatars.mjs
 *
 * 「doboku-note 先生」の円形アイコン（SNS 用マスター）から、サイト CTA 用の配信アバターを派生する。
 * MagazineHeroCta（note ヒーロー CTA バナー）が `avatar-{pose}.webp` を参照する。
 *
 * 入力: content/sns/_assets/character/icons/{pose}-400.png（`npm run character-icons` の生成物）
 * 出力: public/images/character/avatar-{pose}.webp（240×240・~15KB）
 *
 * 円のトリミング・紺グラデ背景の作り込みは generate-character-icons.mjs が真実源。
 * ここは「サイト配信向けにサイズと形式を落とすだけ」の派生層に徹する（意匠を二重管理しない）。
 *
 * 使い方:
 *   node scripts/build-character-avatars.mjs          # サイト CTA で使う 3 ポーズ
 *   node scripts/build-character-avatars.mjs smile    # 1 ポーズだけ
 */
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ICON_DIR = join(ROOT, 'content/sns/_assets/character/icons');
const OUT_DIR = join(ROOT, 'public/images/character');
const POSES = require(join(ROOT, '.claude/config/character-poses.json')).poses;
const POSE_SLUGS = POSES.map((p) => p.slug);

// サイト CTA で使うポーズは manifest の siteCta フラグが真実源（ここに列挙を複製しない）。
// note-magazines.ts の ctaPose union との整合は check-character-avatars.mjs が gate する。
const SITE_POSES = POSES.filter((p) => p.siteCta).map((p) => p.slug);
const SIZE = 240;
const SRC_SIZE = 400; // icons/{pose}-400.png を入力に使う（240 へ縮小）

async function makeAvatar(pose) {
  if (!POSE_SLUGS.includes(pose)) {
    console.warn(`  skip: ${pose} は character-poses.json に無いポーズ`);
    return false;
  }
  const src = join(ICON_DIR, `${pose}-${SRC_SIZE}.png`);
  if (!existsSync(src)) {
    console.warn(`  skip: ${pose}-${SRC_SIZE}.png が無い（先に npm run character-icons）`);
    return false;
  }
  const out = join(OUT_DIR, `avatar-${pose}.webp`);
  await sharp(src).resize(SIZE, SIZE).webp({ quality: 88 }).toFile(out);
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`  ok: ${pose} → images/character/avatar-${pose}.webp (${kb}KB)`);
  return true;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const named = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const targets = named.length ? named : SITE_POSES;
  console.log(`Building ${targets.length} avatar(s)...`);
  let ok = 0;
  for (const t of targets) if (await makeAvatar(t)) ok++;
  if (ok === 0) {
    console.error('生成 0 件');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

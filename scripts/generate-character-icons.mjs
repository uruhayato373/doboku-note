#!/usr/bin/env node
/**
 * generate-character-icons.mjs
 *
 * 「doboku-note 先生」ポーズ素材から円形プロフィールアイコンを生成する。
 * 背景＝ブランド紺のラジアルグラデ円（シンプル・スペック§5「情報量多すぎない・SNSでも見やすい」準拠）、
 * 前景＝ポーズの頭+肩（バスト）を中央に配置し、円でマスク。
 *
 * 出力: content/sns/_assets/character/icons/{pose}-{size}.png（master 800 + SNS 400/180）
 * 既定の主ポーズは smile（プロフィール本命）。--all で全ポーズ分も出す。
 *
 * 使い方:
 *   node scripts/generate-character-icons.mjs            # 主要3ポーズ(smile/good-sign/pointing)
 *   node scripts/generate-character-icons.mjs --all      # 全ポーズ
 *   node scripts/generate-character-icons.mjs smile      # 1ポーズだけ
 */
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHAR_DIR = join(ROOT, 'content/sns/_assets/character');
const OUT_DIR = join(CHAR_DIR, 'icons');
const POSES = require(join(ROOT, '.claude/config/character-poses.json')).poses;

const MASTER = 800;
const SIZES = [800, 400, 180];
// バスト切り出し・配置パラメータ（PIL 試作で校正）
const HEAD_FRAC = 0.4; // ポーズ上端から 40% を頭+肩として使う
const FG_SCALE = 0.92; // 円径に対する前景幅
const Y_OFF = 0.06; // 上端からのオフセット（円中央〜やや上に顔を置く）

// ブランド紺ラジアルグラデの円（cx,cy をやや上にして顔が中心に来るよう）
const bgSvg = () =>
  Buffer.from(
    `<svg width="${MASTER}" height="${MASTER}" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><radialGradient id="g" cx="50%" cy="42%" r="72%">` +
      `<stop offset="0" stop-color="#2E5C92"/><stop offset="1" stop-color="#0E2844"/>` +
      `</radialGradient></defs>` +
      `<circle cx="${MASTER / 2}" cy="${MASTER / 2}" r="${MASTER / 2}" fill="url(#g)"/></svg>`,
  );
// 円形アルファマスク（dest-in 合成用）
const maskSvg = () =>
  Buffer.from(
    `<svg width="${MASTER}" height="${MASTER}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${MASTER / 2}" cy="${MASTER / 2}" r="${MASTER / 2}" fill="#fff"/></svg>`,
  );

async function makeIcon(pose) {
  const src = join(CHAR_DIR, `${pose}.png`);
  if (!existsSync(src)) {
    console.warn(`  skip: ${pose}.png not found`);
    return;
  }
  const meta = await sharp(src).metadata();
  const cropH = Math.round(meta.height * HEAD_FRAC);
  const fgW = Math.round(MASTER * FG_SCALE);
  const yOff = Math.round(MASTER * Y_OFF);
  // 頭+肩を抽出 → 円幅にリサイズ → 円内に収まる高さで上端トリム
  let bust = await sharp(src)
    .extract({ left: 0, top: 0, width: meta.width, height: cropH })
    .resize({ width: fgW })
    .toBuffer();
  const bustMeta = await sharp(bust).metadata();
  const maxH = MASTER - yOff;
  if (bustMeta.height > maxH) {
    bust = await sharp(bust).extract({ left: 0, top: 0, width: fgW, height: maxH }).toBuffer();
  }
  const x = Math.round((MASTER - fgW) / 2);
  // composite は配列で一括指定（複数回 .composite() は前を上書きするため不可）。
  // 順序: 紺円bg の上にバスト → 最後に円マスクを dest-in で適用。
  const composed = await sharp(bgSvg())
    .composite([
      { input: bust, left: x, top: yOff },
      { input: maskSvg(), blend: 'dest-in' },
    ])
    .png()
    .toBuffer();

  for (const size of SIZES) {
    const out = join(OUT_DIR, `${pose}-${size}.png`);
    await sharp(composed).resize(size, size).png().toFile(out);
  }
  console.log(`  ok: ${pose} → icons/${pose}-{${SIZES.join(',')}}.png`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const argv = process.argv.slice(2);
  let targets;
  if (argv.includes('--all')) targets = POSES.map((p) => p.slug);
  else {
    const named = argv.filter((a) => !a.startsWith('--'));
    targets = named.length ? named : ['smile', 'good-sign', 'pointing'];
  }
  console.log(`Generating ${targets.length} icon set(s)...`);
  for (const t of targets) await makeIcon(t);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

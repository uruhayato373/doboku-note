#!/usr/bin/env node
/**
 * note-covers/{id}.png（1280×670）の中央 630×630 セーフティゾーンを
 * crop して {id}-square.png + {id}-square.webp を生成する。
 *
 * 用途: サイト内 NoteLink カードを MagazineInlineCard と同じ正方形画像で統一する。
 *
 * 入力: public/images/note-covers/*.png（既存）
 * 出力: public/images/note-covers/{stem}-square.png + .webp
 *
 * 設計:
 * - 入力 1280×670 から中央 (left=325, top=20, 630×630) を extract
 *   理由: セーフティゾーンは中央 630×630（generate-note-covers.mjs と同義）
 *   1280 の中央は x=640 → 630/2=315 を引いて left=325
 *   670 の中央は y=335 → 630/2=315 を引いて top=20
 * - --force で既存上書き、なしなら未生成のみ
 *
 * 使い方:
 *   node scripts/generate-note-square-covers.mjs           # 未生成のみ
 *   node scripts/generate-note-square-covers.mjs --force   # 全件再生成
 */

import sharp from 'sharp';
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const COVERS_DIR = join(ROOT, 'public/images/note-covers');

const SRC_W = 1280;
const SRC_H = 670;
const SQ = 630;
const LEFT = Math.round((SRC_W - SQ) / 2); // 325
const TOP = Math.round((SRC_H - SQ) / 2);  // 20

const force = process.argv.includes('--force');

async function main() {
  const files = readdirSync(COVERS_DIR)
    .filter((f) => f.endsWith('.png') && !f.endsWith('-square.png'));

  let made = 0;
  let skipped = 0;

  for (const f of files) {
    const stem = f.replace(/\.png$/, '');
    const src = join(COVERS_DIR, f);
    const outPng = join(COVERS_DIR, `${stem}-square.png`);
    const outWebp = join(COVERS_DIR, `${stem}-square.webp`);

    if (!force && existsSync(outPng) && existsSync(outWebp)) {
      skipped++;
      continue;
    }

    // 確認: 元画像が 1280×670 か（違うサイズはスキップ警告）
    const meta = await sharp(src).metadata();
    if (meta.width !== SRC_W || meta.height !== SRC_H) {
      console.warn(`SKIP (unexpected size ${meta.width}x${meta.height}): ${f}`);
      continue;
    }

    await sharp(src)
      .extract({ left: LEFT, top: TOP, width: SQ, height: SQ })
      .png()
      .toFile(outPng);
    await sharp(outPng).webp({ quality: 85 }).toFile(outWebp);

    made++;
    console.log(`  ok: ${stem}-square.{png,webp}`);
  }

  console.log(`\n=== Summary === made: ${made} / skipped: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

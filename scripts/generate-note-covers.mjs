#!/usr/bin/env node
// docs/note-drafts 配下の各ディレクトリに img/cover.png を生成する。
//
// note.com のカバー画像（推奨 1280×670）を、サイト OGP と共通の T06 Mono Tag デザインで出力する。
// 中央 630×630 セーフティゾーン厳守。テンプレロジックは
// .claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs に集約。
//
// 使い方:
//   node scripts/generate-note-covers.mjs                   # 全件生成
//   node scripts/generate-note-covers.mjs 02-一般部門との違い   # 1件だけ生成
//   node scripts/generate-note-covers.mjs 90 --debug-safety   # 中央 630×630 の赤枠を重ねる

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';
import matter from 'gray-matter';

import { renderTemplate } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs';
import { wrapTitle, pickFontSize } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-text.mjs';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRAFTS_DIR = join(ROOT, 'docs/note-drafts');
const FONTS_DIR = join(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');
const TEXT_CONFIG = require(join(ROOT, '.claude/config/ogp/text.json'));

// note カバーは 1280×670（note 推奨）
const W = 1280;
const H = 670;

const DEFAULT_CATEGORY = '技術士（総合技術監理部門）';

function loadFonts() {
  const noto = readFileSync(join(FONTS_DIR, 'NotoSansJP-Bold.ttf'));
  const inter = readFileSync(join(FONTS_DIR, 'Inter-Bold.ttf'));
  return [
    { name: 'Noto Sans JP', data: noto, weight: 700, style: 'normal' },
    { name: 'Inter', data: inter, weight: 700, style: 'normal' },
  ];
}

/**
 * H1 行から表示用タイトルを抽出する。
 * 旧仕様の「【フック】メイン｜サブ」装飾はすべて剥がしてメイン部分だけ残す。
 */
function extractTitle(h1) {
  let raw = h1.replace(/^#\s+/, '').trim();
  // 【...】 を除去
  raw = raw.replace(/^【[^】]+】\s*/, '');
  // ｜以降を切り捨て（サブタイトル相当）
  const pipeIdx = raw.indexOf('｜');
  if (pipeIdx !== -1) raw = raw.slice(0, pipeIdx).trim();
  return raw;
}

async function renderCover({ dirName, title, category, debugSafety, fonts }) {
  const lines = await wrapTitle(title, TEXT_CONFIG);
  const fontSize = pickFontSize(lines, TEXT_CONFIG);
  const element = renderTemplate(
    'mono-tag',
    { lines, categoryLabel: category, fontSize, debugSafety },
    { width: W, height: H },
  );
  const svg = await satori(element, { width: W, height: H, fonts });
  const dir = join(DRAFTS_DIR, dirName);
  const imgDir = join(dir, 'img');
  mkdirSync(imgDir, { recursive: true });
  writeFileSync(join(imgDir, 'cover.svg'), svg);
  await sharp(Buffer.from(svg)).png().toFile(join(imgDir, 'cover.png'));
  console.log(`  ok: ${dirName}`);
}

async function processOne(dirName, args, fonts) {
  const dir = join(DRAFTS_DIR, dirName);
  const articlePath = join(dir, 'article.md');
  if (!existsSync(articlePath)) {
    console.warn(`  skip: article.md not found in ${dirName}`);
    return;
  }
  const content = readFileSync(articlePath, 'utf-8');
  const { data, content: body } = matter(content);
  const h1 = body.split('\n').find((l) => l.startsWith('# '));
  if (!h1) {
    console.warn(`  skip: no H1 in ${dirName}`);
    return;
  }
  const title = extractTitle(h1);
  const category = data.category || DEFAULT_CATEGORY;
  await renderCover({ dirName, title, category, debugSafety: args.debugSafety, fonts });
}

async function main() {
  const argv = process.argv.slice(2);
  const args = { target: null, debugSafety: false };
  for (const a of argv) {
    if (a === '--debug-safety') args.debugSafety = true;
    else if (!a.startsWith('--')) args.target = a;
  }

  const allDirs = readdirSync(DRAFTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  let dirs;
  if (!args.target) {
    dirs = allDirs;
  } else if (allDirs.includes(args.target)) {
    dirs = [args.target];
  } else {
    // 数値プレフィックスでの先頭一致解決（例: "90" → "90-総監択一式17年分分析"）
    dirs = allDirs.filter((d) => d.startsWith(`${args.target}-`));
    if (dirs.length === 0) {
      console.error(`no draft directory matches "${args.target}"`);
      process.exit(1);
    }
  }

  console.log(`Generating covers for ${dirs.length} draft(s)...`);
  const fonts = loadFonts();
  for (const d of dirs) {
    try {
      await processOne(d, args, fonts);
    } catch (err) {
      console.error(`  error: ${d} → ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

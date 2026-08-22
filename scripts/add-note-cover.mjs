#!/usr/bin/env node
// content/note 配下 article.md の frontmatter に G2 用 cover: ブロックを CRLF 安全に注入する。
//
// note-cover-writer エージェント（および手動運用）が生成した cover spec を
// 決定論的にファイルへ書き込むためのヘルパー。直接 writeFileSync による CRLF 混在を防ぐ
// （既存 note ファイルは CRLF。本スクリプトは全体を CRLF 正規化して書き戻す）。
//
// 使い方:
//   node scripts/add-note-cover.mjs <specs.json> [--force]
//
// specs.json の形式（記事パスは repo ルート相対）:
//   {
//     "content/note/技術士総監/4フェーズ学習法/article.md": {
//       "leadIn": "総監二次 6-7ヶ月の学習を",
//       "hi": "4",
//       "hiSuffix": "フェーズで設計",
//       "banner": "学習スケジュール",
//       "meta": "無料記事",            // 任意
//       "tone": "base",               // 任意（deep|base|soft）
//       "chips": [
//         { "icon": "calendar", "text": "月別タスク" },
//         { "icon": "chart",    "text": "80-15-5" },
//         { "icon": "check",    "text": "合格ライン" }
//       ]
//     }
//   }

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const matter = require('gray-matter');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TOKENS = require(join(ROOT, '.claude/knowledge/design-system/note-cover-tokens.json'));
const ICON_CATALOG = new Set(TOKENS.icons.catalog);

const argv = process.argv.slice(2);
const force = argv.includes('--force');
const specsPath = argv.find((a) => !a.startsWith('--'));

if (!specsPath) {
  console.error('usage: node scripts/add-note-cover.mjs <specs.json> [--force]');
  process.exit(1);
}

function yamlEscape(s) {
  return String(s).replace(/"/g, '\\"');
}

// cover オブジェクト → CRLF YAML 文字列（インデント2スペース）
function coverYaml(c) {
  const L = ['cover:'];
  if (c.variant) L.push(`  variant: ${c.variant}`);
  L.push(`  leadIn: "${yamlEscape(c.leadIn)}"`);
  if (c.headline) L.push(`  headline: "${yamlEscape(c.headline)}"`);
  L.push(`  hi: "${yamlEscape(c.hi)}"`);
  L.push(`  hiSuffix: "${yamlEscape(c.hiSuffix)}"`);
  if (c.banner) L.push(`  banner: "${yamlEscape(c.banner)}"`);
  if (c.benefit) L.push(`  benefit: "${yamlEscape(c.benefit)}"`);
  if (c.meta) L.push(`  meta: "${yamlEscape(c.meta)}"`);
  if (c.visualPrompt) L.push(`  visualPrompt: "${yamlEscape(c.visualPrompt)}"`);
  if (c.visualAsset) L.push(`  visualAsset: "${yamlEscape(c.visualAsset)}"`);
  if (c.character) L.push(`  character: ${c.character}`);
  if (c.tone) L.push(`  tone: ${c.tone}`);
  if (Array.isArray(c.chips) && c.chips.length) {
    L.push('  chips:');
    for (const ch of c.chips) L.push(`    - { icon: ${ch.icon}, text: "${yamlEscape(ch.text)}" }`);
  }
  return L.join('\r\n');
}

function validateSpec(rel, c) {
  const errs = [];
  if (c.variant && c.variant !== 'crop-safe-v4') {
    errs.push(`variant "${c.variant}" は未対応（crop-safe-v4 のみ）`);
    return errs;
  }
  if (c.variant === 'crop-safe-v4') {
    // V4: leadIn/headline/hi/hiSuffix/benefit 必須・banner/chips 不要
    for (const k of ['leadIn', 'headline', 'hi', 'hiSuffix', 'benefit']) {
      if (!c[k] || !String(c[k]).trim()) errs.push(`${k} が空（V4 必須）`);
    }
    if (Array.isArray(c.chips) && c.chips.length) {
      console.warn(`  warn ${rel}: V4 では chips を使用しない（描画されない）`);
    }
    if (c.visualAsset && /^\//.test(String(c.visualAsset))) {
      errs.push('visualAsset は記事 dir 相対パス（例 img/cover-visual.png）で指定する');
    }
  } else {
    // G2（従来）: banner 必須・chips 3個必須
    for (const k of ['leadIn', 'hi', 'hiSuffix', 'banner']) {
      if (!c[k] || !String(c[k]).trim()) errs.push(`${k} が空`);
    }
    if (!Array.isArray(c.chips) || c.chips.length !== 3) {
      errs.push(`chips は3個必須（現在 ${Array.isArray(c.chips) ? c.chips.length : 0}）`);
    } else {
      c.chips.forEach((ch, i) => {
        if (!ICON_CATALOG.has(ch.icon)) errs.push(`chips[${i}].icon "${ch.icon}" が catalog 外`);
        if (!ch.text || !String(ch.text).trim()) errs.push(`chips[${i}].text が空`);
      });
    }
  }
  if (c.tone && !['deep', 'base', 'soft'].includes(c.tone)) errs.push(`tone "${c.tone}" は deep|base|soft のみ`);
  return errs;
}

const specs = JSON.parse(readFileSync(specsPath, 'utf-8'));
let ok = 0;
let skipped = 0;
let failed = 0;

for (const [rel, cover] of Object.entries(specs)) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    console.error(`  FAIL ${rel}: ファイルなし`);
    failed++;
    continue;
  }
  const errs = validateSpec(rel, cover);
  if (errs.length) {
    console.error(`  FAIL ${rel}: ${errs.join(' / ')}`);
    failed++;
    continue;
  }
  let content = readFileSync(abs, 'utf-8');
  const hasCover = /^cover:/m.test(content);
  if (hasCover && !force) {
    console.log(`  skip ${rel}: 既に cover: あり（--force で上書き）`);
    skipped++;
    continue;
  }

  // frontmatter 分離
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) {
    console.error(`  FAIL ${rel}: frontmatter なし`);
    failed++;
    continue;
  }
  let fmBody = m[1];
  if (hasCover) {
    // 既存 cover: ブロック（次のトップレベルキー or 末尾まで）を除去
    fmBody = fmBody.replace(/(^|\r?\n)cover:\r?\n(?:[ \t]+.*(?:\r?\n|$))*/, '$1').replace(/\r?\n$/, '');
  }
  const newFront = `---\r\n${fmBody}\r\n${coverYaml(cover)}\r\n---\r\n`;
  content = content.replace(m[0], newFront).replace(/\r?\n/g, '\r\n');

  // gray-matter で再パース検証（V4 は headline、G2 は banner が要）
  try {
    const parsed = matter(content);
    const pc = parsed.data.cover;
    if (!pc) throw new Error('cover 解析不可');
    if (pc.variant === 'crop-safe-v4' ? !pc.headline : !pc.banner) throw new Error(pc.variant ? 'cover.headline 解析不可' : 'cover.banner 解析不可');
  } catch (e) {
    console.error(`  FAIL ${rel}: YAML 検証失敗 ${e.message}`);
    failed++;
    continue;
  }

  writeFileSync(abs, content, 'utf-8');
  console.log(`  ok   ${rel}`);
  ok++;
}

console.log(`\n[add-note-cover] ok=${ok} skip=${skipped} fail=${failed}`);
if (failed > 0) process.exit(1);

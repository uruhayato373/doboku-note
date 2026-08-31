#!/usr/bin/env node
/**
 * build-standards-ogp.mjs — 公的基準の章記事ごとに OGP 画像を生成する。
 *
 * 章記事は MDX 記事系（content/site/{category}/{slug}/article.mdx）ではないので、
 * frontmatter を前提にした `npm run ogp` の探索には引っかからない。そのため章記事は
 * サイト既定の og-default.png のままで、SNS へ貼っても中身が分からないカードになっていた。
 *
 * 描画はサイト共通の実装をそのまま使う（ogp-create の lib を import）。ここで satori の
 * 呼び出しを書き直すと、フォント・テンプレ・余白が独自進化して見た目がサイトから外れる。
 *
 * 出力先: content/site/standards-articles/{agency}/{document}/chapters/{chapterId}/ogp.png
 *   このパスは .claude/config/asset-storage.json の site-ogp-png グループ
 *   （`^content/site/.+/ogp\.png$` → `posts/` prefix）に自動で一致するため、
 *   R2 退避・CI 供給・公開 URL の導出が既存の仕組みにそのまま乗る。
 *
 * 使い方:
 *   node scripts/build-standards-ogp.mjs                 # 未生成のみ
 *   node scripts/build-standards-ogp.mjs --force         # 全件上書き
 *   node scripts/build-standards-ogp.mjs --only chubu/common
 *   node scripts/build-standards-ogp.mjs --list          # 生成せず対象を数える
 */

import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { createRequire } from 'node:module';
import { renderTemplate, LAYOUT_CONSTANTS } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs';
import { wrapTitle, pickFontSize } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-text.mjs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const coverTokens = require(path.join(process.cwd(), '.claude/knowledge/design-system/note-cover-tokens.json'));

const ARTICLES_ROOT = path.join(process.cwd(), 'content', 'site', 'standards-articles');
const FONTS_DIR = path.join(
  process.cwd(),
  '.claude/skills/conversion/ogp-create/assets/fonts',
);

// 章記事は資格ではなく「土木・建設 共通」の領域。外枠色は共通トークンの bronze を使う
// （資格別テーマ色と取り違えないため、資格の色は借りない）。
const ACCENT = coverTokens.exams?.common?.base ?? '#9A6B1E';
const CONTENT_TYPE = { label: '共通仕様書', icon: 'layers' };
const TEMPLATE_ID = 'mono-tag';

// 主題のフォント段階は ogp-create と揃える（サイト全体で字面の大きさを揃えるため）
const MAIN_FONT_TABLE = [88, 80, 72, 64, 56, 48, 42];
const SAFE_W = LAYOUT_CONSTANTS.WIDTH - 144 - 8;
const EXPLICIT_WRAP = { breakBefore: [], breakAt: [], charCountFallback: 9999, budouX: { enabled: false } };

function loadFonts() {
  const noto = path.join(FONTS_DIR, 'NotoSansJP-Bold.ttf');
  const inter = path.join(FONTS_DIR, 'Inter-Bold.ttf');
  for (const file of [noto, inter]) {
    if (!fs.existsSync(file)) throw new Error(`フォント未配置: ${file}`);
  }
  return [
    { name: 'Noto Sans JP', data: fs.readFileSync(noto), weight: 700, style: 'normal' },
    { name: 'Inter', data: fs.readFileSync(inter), weight: 700, style: 'normal' },
  ];
}

/** 生成対象を manifest から集める。manifest が唯一の真実源で、ここでファイル名から推測しない。 */
export function collectChapters() {
  if (!fs.existsSync(ARTICLES_ROOT)) return [];
  const out = [];
  for (const agency of fs.readdirSync(ARTICLES_ROOT)) {
    const agencyDir = path.join(ARTICLES_ROOT, agency);
    if (!fs.statSync(agencyDir).isDirectory()) continue;
    for (const documentId of fs.readdirSync(agencyDir)) {
      const manifestPath = path.join(agencyDir, documentId, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      for (const chapter of manifest.chapters) {
        out.push({
          target: `${agency}/${documentId}`,
          agencyId: agency,
          documentId,
          agencyName: manifest.agencyName,
          documentTitle: manifest.documentTitle,
          chapter,
          outputPath: path.join(
            ARTICLES_ROOT, agency, documentId, 'chapters', chapter.chapterId, 'ogp.png',
          ),
        });
      }
    }
  }
  return out;
}

/**
 * カードに載せる 3 要素を決める。
 * kicker=発行機関（どこの仕様書か）/ 主題=第M章 章名（何の章か）/ サブ=第N編 編名（どの編か）。
 * 文書名まで入れると 4 行になり字が潰れるので、文書名は kicker 側に寄せない。
 */
function composeText(entry) {
  const { chapter, agencyName } = entry;
  return {
    kicker: agencyName,
    main: `第${chapter.chapterNumber}章 ${chapter.chapterTitle}`,
    sub: `第${chapter.bookNumber}編 ${chapter.bookTitle}`,
  };
}

async function renderChapter(entry, fonts) {
  const { kicker, main, sub } = composeText(entry);
  const mainLines = await wrapTitle(main, EXPLICIT_WRAP);
  const subLines = await wrapTitle(sub, EXPLICIT_WRAP);
  const mainFont = pickFontSize(mainLines, { fontSizeTable: MAIN_FONT_TABLE, safetyWidth: SAFE_W });

  const element = renderTemplate(TEMPLATE_ID, {
    lines: mainLines,
    categoryLabel: kicker,
    examLabel: kicker,
    fontSize: mainFont,
    backgroundImage: null, // 共通領域は専用背景を持たない。テンプレ既定のオフホワイトに落ちる
    accentColor: ACCENT,
    contentType: CONTENT_TYPE,
    dark: true,
    mainLines,
    subLines,
    mainFont,
  });

  const svg = await satori(element, {
    width: LAYOUT_CONSTANTS.WIDTH,
    height: LAYOUT_CONSTANTS.HEIGHT,
    fonts,
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const argv = process.argv.slice(2);
  const force = argv.includes('--force');
  const list = argv.includes('--list');
  const onlyIndex = argv.indexOf('--only');
  const only = onlyIndex >= 0 ? argv[onlyIndex + 1] : null;

  let entries = collectChapters();
  if (only) entries = entries.filter((e) => e.target === only);

  if (entries.length === 0) {
    console.error('対象の章が 0 件。content/site/standards-articles の manifest を確認する。');
    process.exitCode = 2;
    return;
  }
  if (list) {
    const byTarget = entries.reduce((acc, e) => ({ ...acc, [e.target]: (acc[e.target] ?? 0) + 1 }), {});
    console.log(`対象 ${entries.length} 章`);
    for (const [target, count] of Object.entries(byTarget)) console.log(`  ${target}: ${count}`);
    return;
  }

  const fonts = loadFonts();
  let generated = 0;
  let skipped = 0;
  const failed = [];

  for (const entry of entries) {
    if (!force && fs.existsSync(entry.outputPath)) { skipped += 1; continue; }
    try {
      const png = await renderChapter(entry, fonts);
      fs.mkdirSync(path.dirname(entry.outputPath), { recursive: true });
      fs.writeFileSync(entry.outputPath, png);
      generated += 1;
      if (generated % 50 === 0) console.log(`  ...${generated} 件生成`);
    } catch (error) {
      failed.push(`${entry.target}/${entry.chapter.chapterId}: ${error.message}`);
    }
  }

  console.log(`対象 ${entries.length} 章 / 生成 ${generated} / 既存スキップ ${skipped} / 失敗 ${failed.length}`);
  for (const line of failed.slice(0, 10)) console.log(`  ✗ ${line}`);
  if (failed.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

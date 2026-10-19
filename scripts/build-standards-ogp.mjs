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
 *   このパスは config/asset-storage.json の site-ogp-png グループ
 *   （`^content/site/.+/ogp\.png$` → `posts/` prefix）に自動で一致するため、
 *   R2 退避・CI 供給・公開 URL の導出が既存の仕組みにそのまま乗る。
 *
 * 使い方:
 *   node scripts/build-standards-ogp.mjs                 # 未生成のみ
 *   node scripts/build-standards-ogp.mjs --force         # 全件上書き
 *   node scripts/build-standards-ogp.mjs --only chubu/common
 *   node scripts/build-standards-ogp.mjs --list          # 生成せず対象を数える
 *   node scripts/build-standards-ogp.mjs --write-srchash # 章の srcHash を退避台帳（asset-storage の manifest）へ書く
 *
 * スキップの判定（2026-10-11）: ローカルに ogp.png があるか、退避台帳の entry に現在の入力から計算した
 * srcHash が載っていれば生成しない。CI の checkout には ogp.png が無いので前者だけでは毎 run 全 344 章を
 * 再生成・再 upload していた（develop の bot commit の 64%・DN-0683）。
 */

import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { createRequire } from 'node:module';
import { renderTemplate, LAYOUT_CONSTANTS } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs';
import { wrapTitle, pickFontSize } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-text.mjs';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { MANIFEST_PATH, loadManifest, writeManifestAtomic, toPosix } from './lib/asset-storage.mjs';
import { loadOverrides } from './lib/standards-structure.mjs';

const require = createRequire(import.meta.url);
const coverTokens = require(path.join(REPO_ROOT, '.claude/knowledge/design-system/note-cover-tokens.json'));

const ARTICLES_ROOT = path.join(REPO_ROOT, 'content', 'site', 'standards-articles');
const FONTS_DIR = path.join(
  REPO_ROOT,
  '.claude/skills/conversion/ogp-create/assets/fonts',
);

// 章記事は資格ではなく「土木・建設 共通」の領域。外枠色は共通トークンの bronze を使う
// （資格別テーマ色と取り違えないため、資格の色は借りない）。
const ACCENT = coverTokens.exams?.common?.base ?? '#9A6B1E';
const CONTENT_TYPE = { label: '共通仕様書', icon: 'layers' };
// 共通仕様書以外の文書（特記仕様書・地方独自）は右上の札を設定 documents.*.ogpLabel に替える
const STRUCTURE = loadOverrides();
const contentTypeOf = (target) => {
  const label = STRUCTURE.documents?.[target]?.ogpLabel;
  return label ? { ...CONTENT_TYPE, label } : CONTENT_TYPE;
};
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

/**
 * 章 OGP の見た目を左右する入力だけから作る短いハッシュ（記事 OGP の srcHash と同じ役割・同じ 16 桁。
 * 桁を切る理由は scripts/update-ogp-srchash.mjs の冒頭）。テンプレ・外枠色・3 要素の文言のどれかが変われば変わる。
 */
export function chapterSrcHash(entry) {
  const { kicker, main, sub } = composeText(entry);
  // 札が既定（共通仕様書）の章はハッシュの入力を変えない（既存 344 章を作り直さないため）
  const { label } = contentTypeOf(entry.target);
  const input = JSON.stringify({
    v: 1, template: TEMPLATE_ID, accent: ACCENT, kicker, main, sub,
    ...(label !== CONTENT_TYPE.label ? { label } : {}),
  });
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/** 退避台帳（manifest.entries）のキー＝リポジトリ相対の posix パス。 */
export function chapterManifestKey(entry) {
  return toPosix(path.relative(REPO_ROOT, entry.outputPath));
}

/**
 * 生成を飛ばす理由を返す。'local'＝ローカルに実体がある / 'manifest'＝台帳の srcHash が現在の入力と一致
 * （R2 の実体は現在の入力から作ったもの）/ null＝生成する。--force は常に生成。
 */
export function skipReason(entry, manifestEntries, { force = false, exists = fs.existsSync } = {}) {
  if (force) return null;
  if (exists(entry.outputPath)) return 'local';
  const recorded = manifestEntries?.[chapterManifestKey(entry)];
  if (recorded && recorded.group === 'site-ogp-png' && recorded.srcHash === chapterSrcHash(entry)) return 'manifest';
  return null;
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
    contentType: contentTypeOf(entry.target),
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
  const writeSrcHash = argv.includes('--write-srchash');
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

  if (writeSrcHash) {
    // 台帳に行がある章（＝R2 へ供給済み）だけに書く。行が無い章は供給前なので、ここでは作らない
    // （行を作るのは asset-offload の検証通過だけ）。
    // loadManifest は lean な行を読み時に展開する（logicalPath・mime・generator・requiredBy を補う）ので、
    // それをそのまま書き戻すと 344 行の srcHash 追加が 3,400 行の差分になる（2026-10-11 実測）。
    // ここは生の JSON を読んで srcHash だけ足す。
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    let updated = 0;
    let unchanged = 0;
    let missing = 0;
    for (const entry of entries) {
      const recorded = manifest.entries?.[chapterManifestKey(entry)];
      if (!recorded || recorded.group !== 'site-ogp-png') { missing += 1; continue; }
      const h = chapterSrcHash(entry);
      if (recorded.srcHash === h) { unchanged += 1; continue; }
      recorded.srcHash = h;
      updated += 1;
    }
    if (updated > 0) writeManifestAtomic(manifest);
    console.log(`srcHash: 対象 ${entries.length} 章 / 更新 ${updated} / 一致 ${unchanged} / 台帳未登録 ${missing}`);
    if (updated + unchanged === 0) process.exitCode = 1; // 1 件も書けない＝供給前か台帳が読めていない
    return;
  }

  const fonts = loadFonts();
  const manifestEntries = loadManifest().entries ?? {};
  let generated = 0;
  let skipped = 0;
  let skippedByManifest = 0;
  const failed = [];

  for (const entry of entries) {
    const reason = skipReason(entry, manifestEntries, { force });
    if (reason === 'local') { skipped += 1; continue; }
    if (reason === 'manifest') { skippedByManifest += 1; continue; }
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

  console.log(`対象 ${entries.length} 章 / 生成 ${generated} / 既存スキップ ${skipped} / 台帳一致スキップ ${skippedByManifest} / 失敗 ${failed.length}`);
  for (const line of failed.slice(0, 10)) console.log(`  ✗ ${line}`);
  if (failed.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

#!/usr/bin/env node
/**
 * 個別キーワードページの「総合技術監理における位置づけ」セクション内にある
 * 「**X.Y セクション名**」表記を、keyword-2026 ハブページの対応見出しへの
 * インラインアンカーリンクに変換するスクリプト。
 *
 * 変更例:
 *   変更前: 総合技術監理キーワード集では「**5.5 危機管理**」に位置づけられている。
 *   変更後: 総合技術監理キーワード集では[**5.5 危機管理**](/docs/pe-comprehensive-management-keyword-2026#55-危機管理)に位置づけられている。
 *
 * 設計:
 *   - frontmatter の `section` フィールドと pe-chapters.json で URL を構築
 *   - アンカーID生成は src/lib/toc.ts の generateHeadingId と完全一致のロジックを再実装
 *   - group: keyword のページのみ対象（guide / past-exam は除外）
 *   - 既に keyword-2026 リンクを持つファイルは skip（idempotent）
 *   - 1ファイルあたり最大1箇所のみ置換
 *
 * Usage:
 *   node scripts/add-keyword-2026-anchors.mjs --dry-run   # プレビューのみ
 *   node scripts/add-keyword-2026-anchors.mjs             # 実行
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { readMdxFile, writeMdxFile } from './lib/mdx-io.mjs';

const BASE_DIR = '.local/r2/posts/pe-comprehensive-management';
const CHAPTERS_PATH = 'src/config/pe-chapters.json';
const HUB_SLUG = 'pe-comprehensive-management-keyword-2026';
const HUB_PATH = `/docs/${HUB_SLUG}`;
const DRY_RUN = process.argv.includes('--dry-run');

// ── アンカーID生成（src/lib/toc.ts の generateHeadingId と完全一致） ──
function generateHeadingId(text) {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'heading'
  );
}

// 既知サンプルで自己テスト
const _t1 = generateHeadingId('5.5 危機管理');
if (_t1 !== '55-危機管理') {
  console.error(`generateHeadingId self-test FAILED: expected "55-危機管理", got "${_t1}"`);
  process.exit(2);
}
const _t2 = generateHeadingId('2.1 事業企画');
if (_t2 !== '21-事業企画') {
  console.error(`generateHeadingId self-test FAILED: expected "21-事業企画", got "${_t2}"`);
  process.exit(2);
}

// ── pe-chapters.json から section ID → title のマップを構築 ──
const chaptersData = JSON.parse(readFileSync(CHAPTERS_PATH, 'utf-8'));
const sectionTitles = new Map();
for (const chapter of chaptersData.chapters) {
  for (const section of chapter.sections) {
    sectionTitles.set(section.id, section.title);
  }
}

// ── カウンタ ──
let converted = 0;
let alreadyLinked = 0;
let notKeywordGroup = 0;
let noSection = 0;
let unknownSection = 0;
let noPositioningSection = 0;
let patternNotFound = 0;
let errors = 0;
const patternNotFoundFiles = [];
const unknownSectionFiles = [];

// ── 走査 ──
const dirs = readdirSync(BASE_DIR).filter((entry) => {
  return existsSync(join(BASE_DIR, entry, 'article.mdx'));
});

for (const entry of dirs) {
  const filePath = join(BASE_DIR, entry, 'article.mdx');
  try {
    const { raw, eol } = readMdxFile(filePath);
    const parsed = matter(raw);
    const data = parsed.data;
    const body = parsed.content;

    // group: keyword のみ対象
    if (data.group !== 'keyword') {
      notKeywordGroup++;
      continue;
    }

    // 既に keyword-2026 リンクを持つ → idempotent skip
    if (body.includes(HUB_SLUG)) {
      alreadyLinked++;
      continue;
    }

    // frontmatter.section 必須
    const section = data.section;
    if (!section) {
      noSection++;
      continue;
    }

    const sectionTitle = sectionTitles.get(String(section));
    if (!sectionTitle) {
      unknownSection++;
      unknownSectionFiles.push(`${entry} (section: ${section})`);
      continue;
    }

    // 「## 総合技術監理における位置づけ」セクションを探す
    const positioningRe = /(^|\n)##\s+総合技術監理における位置づけ[^\n]*\n([\s\S]*?)(?=\n##\s|$)/;
    const positioningMatch = body.match(positioningRe);
    if (!positioningMatch) {
      noPositioningSection++;
      continue;
    }

    const positioningStart = positioningMatch.index + positioningMatch[1].length;
    const positioningSectionBody = positioningMatch[2];

    // 検出パターン: 「**X.Y セクション名**」 または 「X.Y セクション名」
    // X.Y は frontmatter.section と一致するもののみ
    const escapedSection = String(section).replace(/\./g, '\\.');
    const boldRe = new RegExp(
      `「\\*\\*${escapedSection}\\s+([^*」]+?)\\*\\*」`,
    );
    const plainRe = new RegExp(
      `「(${escapedSection})\\s+([^」\\*]+?)」`,
    );

    let matchedText, matchedTitle, matchKind;
    let m = positioningSectionBody.match(boldRe);
    if (m) {
      matchedText = m[0];
      matchedTitle = m[1].trim();
      matchKind = 'bold';
    } else {
      m = positioningSectionBody.match(plainRe);
      if (m) {
        matchedText = m[0];
        matchedTitle = m[2].trim();
        matchKind = 'plain';
      }
    }

    if (!matchedText) {
      patternNotFound++;
      patternNotFoundFiles.push(entry);
      continue;
    }

    // アンカーID生成（pe-chapters.json の正本タイトルを優先）
    // 本文タイトルが pe-chapters と微妙に違っても、ハブページの見出しに合わせる
    const anchorId = generateHeadingId(`${section} ${sectionTitle}`);
    const linkUrl = `${HUB_PATH}#${anchorId}`;

    // 置換: 太字内側のリンク（MDX 仕様: [**text**](url)）
    // ハブページ側の正本タイトルを採用（本文と差異がある場合の整合性確保）
    const replacement = `[**${section} ${sectionTitle}**](${linkUrl})`;

    // 元の「...」を [link] で置換（鉤括弧は除去）
    // 理由: マークダウンリンクと鉤括弧の併用は視覚的に冗長
    const newPositioningSectionBody = positioningSectionBody.replace(
      matchedText,
      replacement,
    );

    if (newPositioningSectionBody === positioningSectionBody) {
      patternNotFound++;
      patternNotFoundFiles.push(entry);
      continue;
    }

    // 全体本文を再構築
    const newBody =
      body.slice(0, positioningStart) +
      positioningMatch[0].slice(positioningMatch[1].length).replace(positioningSectionBody, newPositioningSectionBody) +
      body.slice(positioningStart + positioningMatch[0].length - positioningMatch[1].length);

    // 全体ファイル再構築（frontmatter は元のまま）
    const newRaw = matter.stringify(newBody, data);

    if (DRY_RUN) {
      console.log(`[CONVERT ${matchKind}] ${entry}: ${matchedText} → ${replacement}`);
    } else {
      writeMdxFile(filePath, newRaw, eol);
    }
    converted++;
  } catch (e) {
    errors++;
    console.error(`[ERROR] ${entry}: ${e.message}`);
  }
}

// ── サマリ ──
console.log('\n' + '='.repeat(60));
console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'EXECUTE'}`);
console.log(`Total dirs scanned     : ${dirs.length}`);
console.log(`Converted              : ${converted}`);
console.log(`Already linked (skip)  : ${alreadyLinked}`);
console.log(`Not group:keyword      : ${notKeywordGroup}`);
console.log(`No frontmatter.section : ${noSection}`);
console.log(`Unknown section in JSON: ${unknownSection}`);
console.log(`No positioning section : ${noPositioningSection}`);
console.log(`Pattern not found      : ${patternNotFound}`);
console.log(`Errors                 : ${errors}`);

if (unknownSectionFiles.length > 0) {
  console.log(`\n--- Unknown section (sample) ---`);
  for (const f of unknownSectionFiles.slice(0, 10)) console.log(`  ${f}`);
  if (unknownSectionFiles.length > 10) console.log(`  ... and ${unknownSectionFiles.length - 10} more`);
}

if (patternNotFoundFiles.length > 0 && patternNotFoundFiles.length <= 50) {
  console.log(`\n--- Pattern not found (full list) ---`);
  for (const f of patternNotFoundFiles) console.log(`  ${f}`);
} else if (patternNotFoundFiles.length > 50) {
  console.log(`\n--- Pattern not found (first 30 of ${patternNotFoundFiles.length}) ---`);
  for (const f of patternNotFoundFiles.slice(0, 30)) console.log(`  ${f}`);
}

if (errors > 0) process.exit(1);

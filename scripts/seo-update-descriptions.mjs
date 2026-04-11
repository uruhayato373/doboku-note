/**
 * CEM キーワードページの description を SEO最適化する一括更新スクリプト
 *
 * Usage:
 *   node scripts/seo-update-descriptions.mjs --dry-run   # プレビューのみ
 *   node scripts/seo-update-descriptions.mjs              # 実行
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const BASE_DIR = '.local/r2/posts/pe-comprehensive-management';
const DRY_RUN = process.argv.includes('--dry-run');
const SUFFIX = '技術士総監の試験対策に。';
const MAX_DESC_LENGTH = 120;

// doc-classifier の keyword/section 判定ロジックを再現
// section はキーワードページに chapter 番号が付いたもの → SEO対象
function isKeywordOrSectionPage(meta) {
  const tags = meta.tags || [];
  if (meta.category !== 'pe-comprehensive-management') return false;
  if (tags.includes('索引') || tags.includes('guide')) return false;
  if (tags.includes('択一式') || tags.includes('記述式')) return false;
  if (meta.type === 'digest') return false;
  return true;
}

function scanArticleFiles(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (!statSync(fullPath).isDirectory()) continue;
    const articlePath = join(fullPath, 'article.mdx');
    if (existsSync(articlePath)) {
      files.push(articlePath);
    }
  }
  return files;
}

const files = scanArticleFiles(BASE_DIR);
let updated = 0;
let skipped = 0;
let errors = 0;

for (const filePath of files) {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    if (!isKeywordOrSectionPage(data)) {
      skipped++;
      continue;
    }

    const currentDesc = (data.description || '').trim();

    // 既に試験名を含む → スキップ
    if (currentDesc && (
      currentDesc.includes('技術士') ||
      currentDesc.includes('総監') ||
      currentDesc.includes('総合技術監理')
    )) {
      skipped++;
      continue;
    }

    let newDesc;
    if (!currentDesc) {
      // description が空 → 生成
      newDesc = `${data.title}の定義・要点を解説。技術士（総合技術監理部門）の試験対策に。`;
    } else {
      // 末尾に追加
      newDesc = `${currentDesc} ${SUFFIX}`;
    }

    // 120文字以内に収める
    if (newDesc.length > MAX_DESC_LENGTH) {
      newDesc = newDesc.slice(0, MAX_DESC_LENGTH - 1) + '。';
    }

    if (DRY_RUN) {
      console.log(`[DRY-RUN] ${filePath}`);
      console.log(`  before: "${currentDesc}"`);
      console.log(`  after:  "${newDesc}"`);
      console.log();
      updated++;
      continue;
    }

    data.description = newDesc;
    const output = matter.stringify(content, data);

    // 文字化けチェック
    if (output.includes('\ufffd')) {
      console.error(`[ERROR] mojibake detected: ${filePath}`);
      errors++;
      continue;
    }

    writeFileSync(filePath, output, 'utf-8');
    updated++;
  } catch (err) {
    console.error(`[ERROR] ${filePath}: ${err.message}`);
    errors++;
  }
}

console.log('---');
console.log(`Total files scanned: ${files.length}`);
console.log(`Updated: ${updated}`);
console.log(`Skipped: ${skipped}`);
console.log(`Errors: ${errors}`);
if (DRY_RUN) console.log('(dry-run mode — no files were modified)');

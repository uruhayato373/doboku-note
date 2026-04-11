/**
 * RelatedKeywords 未設定の CEM キーワードページに、同セクションのキーワードを自動追加するスクリプト
 *
 * Usage:
 *   node scripts/add-related-keywords.mjs --dry-run   # プレビューのみ
 *   node scripts/add-related-keywords.mjs              # 実行
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const BASE_DIR = '.local/r2/posts/pe-comprehensive-management';
const CHAPTERS_PATH = 'src/config/pe-chapters.json';
const DRY_RUN = process.argv.includes('--dry-run');

// pe-chapters.json からセクション → キーワード一覧を構築
const chaptersData = JSON.parse(readFileSync(CHAPTERS_PATH, 'utf-8'));
const sectionKeywords = new Map();
for (const chapter of chaptersData.chapters) {
  for (const section of chapter.sections) {
    sectionKeywords.set(section.id, section.keywords || []);
  }
}

let updated = 0;
let skipped = 0;
let errors = 0;
let noSection = 0;

const dirs = readdirSync(BASE_DIR).filter(entry => {
  const f = join(BASE_DIR, entry, 'article.mdx');
  return existsSync(f);
});

for (const entry of dirs) {
  const filePath = join(BASE_DIR, entry, 'article.mdx');
  try {
    const raw = readFileSync(filePath, 'utf-8');

    // 既に RelatedKeywords がある → スキップ
    if (raw.includes('RelatedKeywords')) {
      skipped++;
      continue;
    }

    const { data } = matter(raw);

    // keyword/section ページのみ対象
    const tags = data.tags || [];
    if (tags.includes('索引') || tags.includes('guide') ||
        tags.includes('択一式') || tags.includes('記述式') ||
        data.type === 'digest') {
      skipped++;
      continue;
    }

    const section = data.section;
    if (!section) {
      noSection++;
      skipped++;
      continue;
    }

    // 同セクションのキーワードを取得
    const keywords = sectionKeywords.get(section) || [];
    // 自分自身を除外
    const others = keywords.filter(k => k.slug !== entry);
    if (others.length === 0) {
      skipped++;
      continue;
    }

    // 最大8件に絞る（多すぎると見づらい）
    const items = others.slice(0, 8);
    const itemsStr = items
      .map(k => `  { label: "${k.title}", slug: "${k.slug}" }`)
      .join(',\n');

    const relatedBlock = `\n<RelatedKeywords items={[\n${itemsStr}\n]} />\n`;

    if (DRY_RUN) {
      console.log(`[DRY-RUN] ${entry} (section ${section}): +${items.length} keywords`);
      updated++;
      continue;
    }

    // 末尾に追加
    const newContent = raw.trimEnd() + '\n' + relatedBlock;

    // 文字化けチェック
    if (newContent.includes('\ufffd')) {
      console.error(`[ERROR] mojibake detected: ${filePath}`);
      errors++;
      continue;
    }

    writeFileSync(filePath, newContent, 'utf-8');
    updated++;
  } catch (err) {
    console.error(`[ERROR] ${filePath}: ${err.message}`);
    errors++;
  }
}

console.log('---');
console.log(`Total dirs scanned: ${dirs.length}`);
console.log(`Updated: ${updated}`);
console.log(`Skipped: ${skipped} (${noSection} had no section field)`);
console.log(`Errors: ${errors}`);
if (DRY_RUN) console.log('(dry-run mode — no files were modified)');

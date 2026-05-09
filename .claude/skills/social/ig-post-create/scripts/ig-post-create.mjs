/**
 * Instagram Study Notebook スライド PNG 生成スクリプト
 *
 * 使い方:
 *   node ig-post-create.mjs --slug heinrich-law --date 2026-05-09 --size both
 *
 * オプション:
 *   --slug      キーワードスラグ（pe-comprehensive-management 配下のディレクトリ名）[必須]
 *   --date      投稿日（YYYY-MM-DD）[省略時: 今日]
 *   --size      reels | carousel | both [省略時: both]
 *   --category  カテゴリ（デフォルト: pe-comprehensive-management）
 *
 * 出力先:
 *   docs/sns/instagram/{date}-{slug}/reels/img/    (1080×1920)
 *   docs/sns/instagram/{date}-{slug}/carousel/img/ (1080×1350)
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../../');

// ─── ヘルパー ────────────────────────────────────────────────

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      result[key] = argv[i + 1] ?? true;
      i++;
    }
  }
  return result;
}

const MANAGEMENT_LABEL_MAP = {
  '経済性管理': 'economic',
  '人的資源管理': 'human',
  '情報管理': 'info',
  '安全管理': 'safety',
  '社会環境管理': 'social',
};

function detectManagement(description) {
  for (const [label, key] of Object.entries(MANAGEMENT_LABEL_MAP)) {
    if (description?.includes(label)) return key;
  }
  return 'safety';
}

/** RelatedKeywords items の label を抽出 */
function extractRelatedLabels(rawContent) {
  const block = rawContent.match(/<RelatedKeywords[^>]*items=\{\[([\s\S]*?)\]\}/);
  if (!block) return [];
  return [...block[1].matchAll(/label:\s*["']([^"']+)["']/g)].map(m => m[1]);
}

/** 定義文から比率・数値パターンを subtitle として抽出 */
function extractSubtitle(definition, rawContent) {
  const text = definition + '\n' + rawContent.slice(0, 500);
  const ratio = text.match(/(\d+\s*[：:]\s*\d+(?:\s*[：:]\s*\d+)+)/);
  if (ratio) return ratio[0].replace(/[：:]/g, ' : ').replace(/\s+/g, ' ').trim();
  const pct = text.match(/(\d+(?:\.\d+)?%)/);
  if (pct) return pct[0];
  return null;
}

/** 付箋メモ用テキスト（年号 + 数値 or ExamPoint 冒頭）。本文全体から探す */
function buildStickyText(definition, examPoints, rawContent) {
  const text = definition + '\n' + (rawContent ?? '').slice(0, 800);
  const parts = [];
  const year = text.match(/(\d{4})年/);
  if (year) parts.push(year[0]);
  const nums = text.match(/\d+(?:万|億|千|百)?(?:件|人|%|割)/g);
  if (nums) parts.push(...nums.slice(0, 2));
  if (parts.length >= 2) return parts.slice(0, 3).join('\n');
  if (examPoints[0]) return examPoints[0].slice(0, 8);
  return '試験\nPoint';
}

/** テキストを指定文字数で単語境界（句読点）に切り捨て、末尾に … を付ける */
function truncateCaption(text, maxLen = 18) {
  if (!text || text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const boundary = cut.search(/[、。・\s](?=[^、。・\s]*$)/);
  return boundary > 0 ? cut.slice(0, boundary) + '…' : cut + '…';
}

/** 定義文を板書用に整形 */
function cleanDefinition(definition) {
  const cleaned = definition
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
  if (cleaned.length <= 80) return cleaned;
  return cleaned.replace(/([。、])/g, '$1\n').replace(/\n\n+/g, '\n').trim();
}

// ─── メイン処理 ──────────────────────────────────────────────

const { extractMdx } = await import(
  pathToFileURL(resolve(ROOT, '.claude/scripts/lib/sns-common/mdx-extract.mjs')).href
);
const { renderSlide } = await import(
  pathToFileURL(resolve(ROOT, '.claude/scripts/lib/sns-common/slide-render.mjs')).href
);

const args = parseArgs(process.argv.slice(2));
const slug = args.slug;
const category = args.category ?? 'pe-comprehensive-management';
const date = args.date ?? new Date().toISOString().slice(0, 10);
const sizeArg = args.size ?? 'both';

if (!slug) {
  console.error('Usage: node ig-post-create.mjs --slug <slug> [--date YYYY-MM-DD] [--size reels|carousel|both]');
  process.exit(1);
}

console.log(`\n[ig-post-create] slug: ${slug}  date: ${date}  size: ${sizeArg}`);

const mdx = extractMdx({ category, slug, root: resolve(ROOT, '.local/r2/posts') });
const management = detectManagement(mdx.description);
const relatedLabels = extractRelatedLabels(mdx.rawContent);
const subtitle = extractSubtitle(mdx.definition ?? '', mdx.rawContent);
const stickyText = buildStickyText(mdx.definition ?? '', mdx.examPoints, mdx.rawContent);
const definition = cleanDefinition(mdx.definition ?? '');
const boardNoteText = mdx.examPoints[0] ?? null;
const boardCaption = truncateCaption(mdx.examPoints[1] ?? mdx.examPoints[0] ?? null);

console.log(`  title: ${mdx.title}`);
console.log(`  management: ${management}`);
console.log(`  subtitle: ${subtitle}`);
console.log(`  stickyText: ${JSON.stringify(stickyText)}`);
console.log(`  related: [${relatedLabels.slice(0, 4).join(', ')}]`);

const SLIDES = [
  {
    file: '00-cover.png',
    slide: {
      type: 'notebook-cover',
      data: {
        keyword: mdx.title,
        subtitle,
        stickyText,
        management,
        date,
        caption: `${mdx.title}\nとは何か？`,
      },
    },
  },
  {
    file: '01-board.png',
    slide: {
      type: 'notebook-board',
      data: {
        heading: '板書 ｜ 定義',
        body: definition,
        noteText: boardNoteText,
        management,
        date,
        caption: boardCaption,
      },
    },
  },
  {
    file: '02-cta.png',
    slide: {
      type: 'notebook-cta',
      data: {
        related: relatedLabels.slice(0, 4),
        management,
        date,
        caption: '続きは doboku-note で',
      },
    },
  },
];

const ALL_SIZES = [
  { name: 'reels',    width: 1080, height: 1920 },
  { name: 'carousel', width: 1080, height: 1350 },
];
const sizes = sizeArg === 'both'
  ? ALL_SIZES
  : ALL_SIZES.filter(s => s.name === sizeArg);

if (sizes.length === 0) {
  console.error(`Unknown size: ${sizeArg}. Use reels | carousel | both`);
  process.exit(1);
}

const outBase = resolve(ROOT, `docs/sns/instagram/${date}-${slug}`);

for (const size of sizes) {
  const imgDir = resolve(outBase, `${size.name}/img`);
  mkdirSync(imgDir, { recursive: true });

  console.log(`\n[${size.name}] ${size.width}×${size.height}`);
  for (const { file, slide } of SLIDES) {
    const start = Date.now();
    const png = await renderSlide({ width: size.width, height: size.height, slide });
    const outPath = resolve(imgDir, file);
    writeFileSync(outPath, png);
    console.log(`  ✓ ${file}  (${Date.now() - start}ms, ${(png.length / 1024).toFixed(0)}KB)`);
  }
}

console.log(`\nDone → ${outBase}`);
try { execSync(`open "${outBase}"`); } catch {}

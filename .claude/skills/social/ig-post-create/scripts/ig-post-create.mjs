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
 *   --reset       slide-data.json を無視して MDX から再生成
 *   --config-only slide-data.json のみ生成（PNG 生成スキップ）
 *
 * 出力先:
 *   docs/sns/instagram/{date}-{slug}/slide-data.json  ← 手動編集可能な設定ファイル
 *   docs/sns/instagram/{date}-{slug}/reels/img/       (1080×1920)
 *   docs/sns/instagram/{date}-{slug}/carousel/img/    (1080×1350)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../../');

// ─── ヘルパー ────────────────────────────────────────────────

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      // 次トークンが別フラグ or 無ければ boolean フラグ扱い
      if (next !== undefined && !next.startsWith('--')) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
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

/** v1 スキーマ {cover,board,cta} を v2 {cover,slides[],cta} へ in-memory 変換 */
function normalizeSlideData(sd) {
  if (Array.isArray(sd.slides)) return sd;
  const cover = sd.cover || {};
  const board = sd.board || {};
  const cta = sd.cta || {};
  return {
    cover: {
      keyword: cover.keyword,
      subtitle: cover.subtitle ?? null,
      stickyText: cover.stickyText,
      management: cover.management || board.management || 'safety',
    },
    slides: [
      { type: 'board', heading: board.heading, body: board.body, noteText: board.noteText },
    ],
    cta: { related: cta.related || [] },
  };
}

const FIGURE_FONT_DIR = resolve(ROOT, '.claude/skills/conversion/ogp-create/assets/fonts');

/**
 * figure スライドの imagePath を data URI に解決する（無ければスペック表示にフォールバック）。
 * SVG はフォントを解決して PNG にレンダリングする — Satori の <img> 内 SVG は
 * フォントを解決できずテキストが消えるため、事前に resvg で焼き込む。
 */
function resolveFigureImage(slide) {
  if (slide.type !== 'figure' || !slide.imagePath || slide.imageBase64) return slide;
  const abs = resolve(ROOT, slide.imagePath);
  if (!existsSync(abs)) {
    console.warn(`  [figure] 画像が見つかりません: ${slide.imagePath}（スペック表示にフォールバック）`);
    return slide;
  }
  const lower = abs.toLowerCase();
  if (lower.endsWith('.svg')) {
    const svg = readFileSync(abs, 'utf8');
    const resvg = new Resvg(svg, {
      font: {
        fontFiles: [
          resolve(FIGURE_FONT_DIR, 'NotoSansJP-Bold.ttf'),
          resolve(FIGURE_FONT_DIR, 'Inter-Bold.ttf'),
        ],
        loadSystemFonts: false,
        defaultFontFamily: 'Noto Sans JP',
      },
      fitTo: { mode: 'width', value: 1400 },
    });
    const png = resvg.render().asPng();
    return { ...slide, imageBase64: `data:image/png;base64,${png.toString('base64')}` };
  }
  const buf = readFileSync(abs);
  const mime = lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
  return { ...slide, imageBase64: `data:${mime};base64,${buf.toString('base64')}` };
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
const resetFlag = 'reset' in args;
const configOnly = 'config-only' in args;

if (!slug) {
  console.error('Usage: node ig-post-create.mjs --slug <slug> [--date YYYY-MM-DD] [--size reels|carousel|both] [--reset] [--config-only]');
  process.exit(1);
}

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
const configPath = resolve(outBase, 'slide-data.json');

console.log(`\n[ig-post-create] slug: ${slug}  date: ${date}  size: ${sizeArg}`);

let slideData;

if (existsSync(configPath) && !resetFlag) {
  // 再実行: slide-data.json から読み込み（MDX 解析スキップ）
  slideData = normalizeSlideData(JSON.parse(readFileSync(configPath, 'utf8')));
  console.log(`  [config] slide-data.json を使用`);
} else {
  // 初回 or --reset: MDX から抽出してデータを計算
  const mdx = extractMdx({ category, slug, root: resolve(ROOT, '.local/r2/posts') });
  const management = detectManagement(mdx.description);
  const relatedLabels = extractRelatedLabels(mdx.rawContent);
  const subtitle = extractSubtitle(mdx.definition ?? '', mdx.rawContent);
  const stickyText = buildStickyText(mdx.definition ?? '', mdx.examPoints, mdx.rawContent);
  const definition = cleanDefinition(mdx.definition ?? '');
  const boardNoteText = (() => {
    const t = mdx.examPoints[0] ?? null;
    if (!t) return null;
    const parts = t.split('：');
    return parts.length >= 3 ? parts.join('\n') : t;
  })();
  console.log(`  title: ${mdx.title}`);
  console.log(`  management: ${management}`);
  console.log(`  subtitle: ${subtitle}`);
  console.log(`  stickyText: ${JSON.stringify(stickyText)}`);
  console.log(`  related: [${relatedLabels.slice(0, 4).join(', ')}]`);

  slideData = {
    cover: {
      keyword: mdx.title,
      subtitle,
      stickyText,
      management,
    },
    slides: [
      { type: 'board', heading: mdx.title, body: definition, noteText: boardNoteText },
    ],
    cta: {
      related: relatedLabels.slice(0, 4),
    },
  };

  // slide-data.json を保存（手動編集・再利用のため）
  mkdirSync(outBase, { recursive: true });
  writeFileSync(configPath, JSON.stringify(slideData, null, 2) + '\n', 'utf8');
  console.log(`  [config] slide-data.json を生成`);
}

if (configOnly) {
  console.log(`\nDone (config-only) → ${configPath}`);
  process.exit(0);
}

const management = slideData.cover?.management || 'safety';
const padNum = (n) => String(n).padStart(2, '0');

const SLIDES = [
  { file: '00-cover.png', slide: { type: 'notebook-cover', data: slideData.cover } },
  ...slideData.slides.map((s, i) => {
    const data = { ...resolveFigureImage(s), management };
    const num = padNum(i + 1);
    return s.type === 'figure'
      ? { file: `${num}-figure.png`, slide: { type: 'notebook-figure', data } }
      : { file: `${num}-board.png`,  slide: { type: 'notebook-board',  data } };
  }),
  {
    file: `${padNum(slideData.slides.length + 1)}-cta.png`,
    slide: { type: 'notebook-cta', data: { ...slideData.cta, management } },
  },
];

if (SLIDES.length < 3 || SLIDES.length > 10) {
  console.warn(`  [warn] カルーセル ${SLIDES.length} 枚（Instagram 制約 2-10・推奨 3-10）`);
}
console.log(`  slides: ${SLIDES.length} 枚 (cover + ${slideData.slides.length} + cta)`);

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

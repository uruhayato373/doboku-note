/**
 * Instagram カルーセル PNG 生成スクリプト
 *
 * 2 つの運用モード:
 *   1. --slug : 単独キーワード解説（Study Notebook デザイン・notebook-cover/board/cta）
 *   2. --exam : 過去問パック（type3 デザイン・5 管理別色・4 問パック 10 枚構成）
 *
 * 使い方:
 *   # 単独 KW モード
 *   node ig-post-create.mjs --slug heinrich-law --date 2026-05-09 --size carousel
 *
 *   # 過去問パックモード
 *   node ig-post-create.mjs --exam r07-pack-01 --size carousel
 *
 * オプション:
 *   --slug        単独 KW のスラグ（--exam と排他）
 *   --exam        過去問パック ID (例: r07-pack-01)。slide-data.json は
 *                 docs/sns/instagram/{exam}/exam-packs/<year>/pack-<NN>/ から読む
 *   --exam-dir    試験軸ディレクトリ（例: 1級土木 / 2級土木）。省略時=技術士総監
 *   --date        投稿日（YYYY-MM-DD）[省略時: 今日。--exam では未使用]
 *   --size        reels | carousel | both [省略時: both]
 *   --category    カテゴリ（デフォルト: pe-comprehensive-management）
 *   --reset       slide-data.json を無視して MDX から再生成（--slug のみ）
 *   --config-only slide-data.json のみ生成（PNG 生成スキップ）
 *
 * 出力先:
 *   --slug: docs/sns/instagram/{date}-{slug}/{reels,carousel}/img/
 *   --exam: docs/sns/instagram/{exam}/exam-packs/{year}/pack-{NN}/{reels,carousel}/img/
 *
 * 関連スキル:
 *   - 択一クイズパック（運営者作問・シリーズ A）: .claude/scripts/sns/render-quiz-pack.mjs
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
// 試験識別カバー（多資格）: _meta.exam がある時だけ cover をこの SVG で差し替える
const { renderExamCoverIg } = await import(
  pathToFileURL(resolve(ROOT, '.claude/scripts/sns/templates/exam-cover-ig.mjs')).href
);
const { svgToPng } = await import(
  pathToFileURL(resolve(ROOT, '.claude/scripts/sns/lib/svg-to-png.mjs')).href
);

const args = parseArgs(process.argv.slice(2));
const slug = args.slug;
const examId = args.exam; // 例: r07-pack-01
const examDir = typeof args['exam-dir'] === 'string' ? args['exam-dir'] : null; // 試験軸（例: 1級土木）。省略時は総監（従来パス）
const category = args.category ?? 'pe-comprehensive-management';
const date = args.date ?? new Date().toISOString().slice(0, 10);
const sizeArg = args.size ?? 'both';
const resetFlag = 'reset' in args;
const configOnly = 'config-only' in args;

const modeFlags = [slug, examId].filter(Boolean);
if (modeFlags.length === 0) {
  console.error('Usage:');
  console.error('  node ig-post-create.mjs --slug <slug> [--date YYYY-MM-DD] [--size reels|carousel|both] [--reset]');
  console.error('  node ig-post-create.mjs --exam <examId>   (例: r07-pack-01) [--size reels|carousel|both]');
  process.exit(1);
}
if (modeFlags.length > 1) {
  console.error('Error: --slug と --exam は排他です');
  process.exit(1);
}

const mode = examId ? 'exam' : 'slug';

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

let outBase;
if (mode === 'exam') {
  // 年度コードは [hr]NN（1級/総監）に加え 2級の前期/後期サフィックス z/k を許容（例 r05z-pack-01）
  const match = examId.match(/^([hr]\d+[zk]?)-pack-(\d+)$/);
  if (!match) {
    console.error(`Error: --exam の形式は <year>-pack-<NN> (例: r07-pack-01 / r05z-pack-01)`);
    process.exit(1);
  }
  const [, year, packNum] = match;
  // 試験軸: {exam}/exam-packs/{年度}/pack-NN（全資格対称）。
  // --exam-dir 省略時は技術士総監（既定）。多資格は 1級土木 / 2級土木 等を明示。
  const resolvedExamDir = examDir || '技術士総監';
  outBase = resolve(ROOT, `docs/sns/instagram/cem/exam-packs/${resolvedExamDir}/${year}/pack-${packNum}`);
} else {
  outBase = resolve(ROOT, `docs/sns/instagram/${date}-${slug}`);
}
const configPath = resolve(outBase, 'slide-data.json');

const modeLabel = mode === 'exam' ? `exam: ${examId}` : `slug: ${slug}  date: ${date}`;
console.log(`\n[ig-post-create] mode: ${mode}  ${modeLabel}  size: ${sizeArg}`);

let slideData;

if (mode === 'exam') {
  if (!existsSync(configPath)) {
    console.error(`Error: slide-data.json not found: ${configPath}`);
    console.error('Hint: node scripts/generate-exam-pack-dirs.mjs で生成してください');
    process.exit(1);
  }
  slideData = JSON.parse(readFileSync(configPath, 'utf8'));
  console.log(`  [config] exam slide-data.json を使用 (${slideData.slides?.length ?? 0} slides)`);
} else if (existsSync(configPath) && !resetFlag) {
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

const management = mode === 'exam'
  ? (slideData._meta?.management || 'safety')
  : (slideData.cover?.management || 'safety');
const padNum = (n) => String(n).padStart(2, '0');

const SLIDE_TYPE_MAP = {
  // 単独 KW 系 (notebook デザイン)
  board:    'notebook-board',
  figure:   'notebook-figure',
  // 過去問パック系 (type3 デザイン)
  cover:    'quiz-cover',
  problem:  'quiz-problem',
  pause:    'quiz-pause',
  answer:   'quiz-answer',
  cta:      'quiz-cta',
  // 年度目次カルーセル
  'summary-cover':     'summary-cover',
  'summary-pack-list': 'summary-pack-list',
  'summary-cta':       'summary-cta',
};

function slideFilePart(type) {
  if (type === 'figure') return 'figure';
  if (type === 'cover') return 'cover';
  if (type === 'problem') return 'problem';
  if (type === 'pause') return 'pause';
  if (type === 'answer') return 'answer';
  if (type === 'cta') return 'cta';
  if (type === 'summary-cover') return 'cover';
  if (type === 'summary-pack-list') return 'list';
  if (type === 'summary-cta') return 'cta';
  return 'board';
}

let SLIDES;

if (mode === 'exam') {
  // exam モード: slide-data.json の slides 配列をそのままマップ
  // (cover / problem / pause / answer / cta が含まれる)
  const totalPages = slideData.slides.length;
  // _meta から year と packNum を取り出して各 slide.data に注入（cover の固定タイトル/meta 表示用）
  const examYear = slideData._meta?.year || examId.split('-')[0];
  const examPackNum = slideData._meta?.packNum || examId.match(/pack-(\d+)/)?.[1] || '01';
  SLIDES = slideData.slides.map((s, i) => {
    const data = {
      ...s,
      management,
      pageIndex: s.pageIndex ?? i + 1,
      totalPages: s.totalPages ?? totalPages,
      year: examYear,
      packNum: examPackNum,
      exam: slideData._meta?.exam, // CTA の試験別色・統計の出し分け用
    };
    const num = padNum(i);
    const quizType = SLIDE_TYPE_MAP[s.type] || s.type;
    // _meta.exam がある cover は試験識別カバーで差し替え（多資格）
    const examCover = s.type === 'cover' && slideData._meta?.exam ? {
      exam: slideData._meta.examDir || slideData._meta.exam,
      tag: s.sectionTag || '過去問',
      year: s.title || examYear,
      fmtLabel: slideData._meta.fmtLabel || s.subtitle || '',
      page: [s.pageIndex ?? 1, s.totalPages ?? totalPages],
      management: slideData._meta?.management || null, // 5管理パックは管理分野を主役表示
    } : null;
    return { file: `${num}-${slideFilePart(s.type)}.png`, slide: { type: quizType, data }, examCover };
  });
} else {
  // bundle / slug モード: cover + slides + cta を自動構築
  SLIDES = [
    { file: '00-cover.png', slide: { type: 'notebook-cover', data: slideData.cover } },
    ...slideData.slides.map((s, i) => {
      const resolved = s.type === 'figure' ? resolveFigureImage(s) : s;
      const data = { ...resolved, management };
      const num = padNum(i + 1);
      const notebookType = SLIDE_TYPE_MAP[s.type] || 'notebook-board';
      return { file: `${num}-${slideFilePart(s.type)}.png`, slide: { type: notebookType, data } };
    }),
    {
      file: `${padNum(slideData.slides.length + 1)}-cta.png`,
      slide: {
        type: 'notebook-cta',
        data: { ...slideData.cta, management, isBundle: false },
      },
    },
  ];
}

const IG_MAX = 20; // Instagram カルーセル上限（2024-02 以降 20 枚）
if (SLIDES.length < 3 || SLIDES.length > IG_MAX) {
  console.warn(`  [warn] カルーセル ${SLIDES.length} 枚（Instagram 制約 2-${IG_MAX}）`);
}
console.log(`  slides: ${SLIDES.length} 枚 (cover + ${slideData.slides.length} + cta)`);

for (const size of sizes) {
  const imgDir = resolve(outBase, `${size.name}/img`);
  mkdirSync(imgDir, { recursive: true });

  console.log(`\n[${size.name}] ${size.width}×${size.height}`);
  for (const { file, slide, examCover } of SLIDES) {
    const start = Date.now();
    let png;
    if (examCover && (size.name === 'carousel' || size.name === 'reels')) {
      // 試験識別カバー（carousel 1080×1350 / reels 1080×1920）。format でレイアウト分岐
      const svg = renderExamCoverIg({ ...examCover, format: size.name });
      png = await svgToPng(svg, { width: size.width });
    } else {
      png = await renderSlide({ width: size.width, height: size.height, slide });
    }
    const outPath = resolve(imgDir, file);
    writeFileSync(outPath, png);
    console.log(`  ✓ ${file}  (${Date.now() - start}ms, ${(png.length / 1024).toFixed(0)}KB)`);
  }
}

console.log(`\nDone → ${outBase}`);

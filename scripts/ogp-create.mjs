/**
 * OGP 画像生成スクリプト
 *
 * ルールベース + テンプレートシステム:
 *   1. MDX frontmatter からタイトル・カテゴリ・タグを読む
 *   2. frontmatter.ogp.template > --template > .claude/config/ogp/rules.json の順でテンプレを決定
 *   3. .claude/config/ogp/text.json で改行・フォントサイズ・セーフティ幅を決定
 *   4. テンプレ定義（.claude/config/ogp/templates.json）に従い satori で SVG 生成
 *   5. sharp で PNG 化して所定パスに書き出す
 *
 * 出力先: .local/r2/posts/{category}/{localSlug}/ogp.png
 *   （R2 公開 URL と 1:1 対応。src/lib/r2-image-loader.ts の getOgpImageUrl と整合）
 *
 * Usage:
 *   node scripts/ogp-create.mjs <fullSlug>                   # 単一生成（既存あればスキップ）
 *   node scripts/ogp-create.mjs <fullSlug> --force            # 単一・強制上書き
 *   node scripts/ogp-create.mjs <fullSlug> --template navy-white  # テンプレ強制
 *   node scripts/ogp-create.mjs --all                         # 全件生成
 *   node scripts/ogp-create.mjs --all --force                 # 全件強制上書き
 *   node scripts/ogp-create.mjs --all --dry-run               # マッピング結果のみ表示
 *   node scripts/ogp-create.mjs <slug> --debug-safety --force # 中央 630×630 の赤枠を重ねた PNG を出力
 *   node scripts/ogp-create.mjs --all --debug-wrap            # 改行戦略の適用結果を一覧表示
 *
 * frontmatter での個別制御:
 *   ---
 *   ogp:
 *     template: dark-wood   # ルールを無視して指定
 *     title: "MBOと\n運用上の課題"  # OGP 専用タイトル。\n で明示改行
 *     skip: true            # 生成スキップ（手動 OGP 保護）
 *   ---
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import satori from 'satori';
import sharp from 'sharp';
import matter from 'gray-matter';

import categories from '../src/config/categories.json' with { type: 'json' };
import templatesConfig from '../.claude/config/ogp/templates.json' with { type: 'json' };
import rulesConfig from '../.claude/config/ogp/rules.json' with { type: 'json' };
import textConfig from '../.claude/config/ogp/text.json' with { type: 'json' };

import { renderTemplate, LAYOUT_CONSTANTS } from '#lib/ogp-templates.mjs';
import { wrapTitle, pickFontSize } from '#lib/ogp-text.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(PROJECT_ROOT, '.local', 'r2', 'posts');
const FONTS_DIR = path.join(__dirname, 'fonts');

// ---- CLI 引数パース ----

function parseArgs(argv) {
  const args = {
    slug: null,
    all: false,
    force: false,
    dryRun: false,
    debugSafety: false,
    debugWrap: false,
    template: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--debug-safety') args.debugSafety = true;
    else if (a === '--debug-wrap') args.debugWrap = true;
    else if (a === '--template') args.template = argv[++i];
    else if (!a.startsWith('--') && !args.slug) args.slug = a;
  }
  return args;
}

// ---- フォント ----

function loadFonts() {
  const notoPath = path.join(FONTS_DIR, 'NotoSansJP-Bold.ttf');
  const interPath = path.join(FONTS_DIR, 'Inter-Bold.ttf');
  for (const p of [notoPath, interPath]) {
    if (!fs.existsSync(p)) {
      console.error(`[error] フォント未配置: ${p}`);
      process.exit(1);
    }
  }
  return [
    { name: 'Noto Sans JP', data: fs.readFileSync(notoPath), weight: 700, style: 'normal' },
    { name: 'Inter', data: fs.readFileSync(interPath), weight: 700, style: 'normal' },
  ];
}

// ---- MDX 探索とスラッグ解決 ----

function findMdxFiles(dir) {
  const results = [];
  function walk(currentDir, relativeParts) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name === 'img' || entry.name === '.DS_Store') continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, [...relativeParts, entry.name]);
      } else if (entry.name.endsWith('.mdx')) {
        results.push({ fullPath, relativeParts, fileName: entry.name });
      }
    }
  }
  walk(dir, []);
  return results;
}

function buildFullSlug(relativeParts, fileName) {
  const base = fileName.replace(/\.mdx$/, '');
  return base === 'article' ? relativeParts.join('-') : [...relativeParts, base].join('-');
}

function resolveOutputPath(fullSlug) {
  const cat = categories.find(c => fullSlug === c.slug || fullSlug.startsWith(`${c.slug}-`));
  if (!cat) {
    throw new Error(`未知のカテゴリ: ${fullSlug}`);
  }
  const localSlug = fullSlug.slice(cat.slug.length + 1);
  return path.join(POSTS_DIR, cat.slug, localSlug, 'ogp.png');
}

// ---- ルールエンジン ----

function matchesRule(rule, frontmatter) {
  const m = rule.match || {};
  if (m.category && frontmatter.category !== m.category) return false;
  if (m.tags_any) {
    const tags = frontmatter.tags || [];
    if (!m.tags_any.some(t => tags.includes(t))) return false;
  }
  if (m.tags_all) {
    const tags = frontmatter.tags || [];
    if (!m.tags_all.every(t => tags.includes(t))) return false;
  }
  return true;
}

function resolveTemplate(frontmatter, cliTemplate) {
  if (frontmatter?.ogp?.template) return frontmatter.ogp.template;
  if (cliTemplate) return cliTemplate;
  for (const rule of rulesConfig.rules) {
    if (matchesRule(rule, frontmatter)) return rule.template;
  }
  return rulesConfig.default;
}

// ---- 背景画像ロード ----

function loadBackgroundImage(templateDef) {
  if (!templateDef.backgroundImage) return null;
  const abs = path.join(PROJECT_ROOT, templateDef.backgroundImage);
  if (!fs.existsSync(abs)) return null;
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).slice(1);
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

// ---- 単一ページの生成処理 ----

async function generateOne({ fullPath, fullSlug, fonts, args, stats }) {
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const { data } = matter(raw);

  if (!data.published) {
    stats.skipped++;
    return;
  }
  if (data.ogp?.skip) {
    stats.skipped++;
    return;
  }

  const templateId = resolveTemplate(data, args.template);
  const templateDef = templatesConfig.templates[templateId];
  if (!templateDef) {
    console.error(`[error] 未知のテンプレ ${templateId} (${fullSlug})`);
    stats.errors++;
    return;
  }

  // 改行戦略: frontmatter.ogp.title があればそれを優先（Layer 1）
  const sourceTitle = data.ogp?.title || data.title || fullSlug;
  const lines = await wrapTitle(sourceTitle, textConfig);
  const fontSize = pickFontSize(lines, textConfig);

  if (args.debugWrap) {
    console.log(`${fullSlug}`);
    console.log(`  title: ${sourceTitle}`);
    console.log(`  lines: [${lines.map(l => `"${l}"`).join(', ')}]`);
    console.log(`  longest: ${Math.max(...lines.map(l => l.length))} chars → fontSize ${fontSize}`);
    console.log(`  template: ${templateId}`);
    stats.resolved++;
    return;
  }

  const outputPath = resolveOutputPath(fullSlug);

  if (args.dryRun) {
    console.log(`[dry-run] ${fullSlug}  →  ${templateId}  →  ${path.relative(PROJECT_ROOT, outputPath)}`);
    stats.resolved++;
    return;
  }

  if (!args.force && fs.existsSync(outputPath)) {
    stats.skipped++;
    return;
  }

  const categoryLabel = categories.find(c => c.slug === data.category)?.label || '';
  const backgroundImage = loadBackgroundImage(templateDef);

  const element = renderTemplate(templateId, {
    lines,
    categoryLabel,
    fontSize,
    backgroundImage,
    debugSafety: args.debugSafety,
  });

  const svg = await satori(element, {
    width: LAYOUT_CONSTANTS.WIDTH,
    height: LAYOUT_CONSTANTS.HEIGHT,
    fonts,
  });
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pngBuffer);
  stats.generated++;
  if (stats.generated % 50 === 0) {
    console.log(`  ...${stats.generated}件生成済み`);
  }
}

// ---- メイン ----

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.slug && !args.all) {
    console.error('Usage: node scripts/ogp-create.mjs <fullSlug> | --all [--force] [--dry-run] [--template <id>] [--debug-safety] [--debug-wrap]');
    process.exit(1);
  }

  const fonts = loadFonts();
  const mdxFiles = findMdxFiles(POSTS_DIR).map(f => ({
    ...f,
    fullSlug: buildFullSlug(f.relativeParts, f.fileName),
  }));

  const targets = args.all ? mdxFiles : mdxFiles.filter(f => f.fullSlug === args.slug);
  if (targets.length === 0) {
    console.error(`[error] 対象が見つかりません: ${args.slug || '(--all 指定だが MDX 0 件)'}`);
    process.exit(1);
  }

  const mode =
    args.debugWrap ? 'debug-wrap' :
    args.dryRun ? 'dry-run' :
    args.debugSafety ? 'debug-safety' :
    args.force ? 'force' : 'normal';
  console.log(`[ogp-create] 対象 ${targets.length} 件 / mode=${mode}`);

  const stats = { generated: 0, skipped: 0, errors: 0, resolved: 0 };
  for (const t of targets) {
    try {
      await generateOne({ fullPath: t.fullPath, fullSlug: t.fullSlug, fonts, args, stats });
    } catch (err) {
      console.error(`[error] ${t.fullSlug}: ${err.message}`);
      stats.errors++;
    }
  }

  console.log('\n[ogp-create] 完了');
  if (args.dryRun || args.debugWrap) {
    console.log(`  解決: ${stats.resolved}件`);
  } else {
    console.log(`  生成: ${stats.generated}件`);
    console.log(`  スキップ: ${stats.skipped}件`);
  }
  if (stats.errors > 0) {
    console.log(`  エラー: ${stats.errors}件`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

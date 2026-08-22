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
 *   node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs <fullSlug>                   # 単一生成（既存あればスキップ）
 *   node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs <fullSlug> --force            # 単一・強制上書き
 *   node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs <fullSlug> --template navy-white  # テンプレ強制
 *   node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs --all                         # 全件生成
 *   node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs --all --force                 # 全件強制上書き
 *   node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs --all --dry-run               # マッピング結果のみ表示
 *   node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs <slug> --debug-safety --force # 中央 630×630 の赤枠を重ねた PNG を出力
 *   node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs --all --debug-wrap            # 改行戦略の適用結果を一覧表示
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

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const categories = require(path.join(process.cwd(), 'src/config/categories.json'));
const templatesConfig = require(path.join(process.cwd(), '.claude/config/ogp/templates.json'));
const rulesConfig = require(path.join(process.cwd(), '.claude/config/ogp/rules.json'));
const textConfig = require(path.join(process.cwd(), '.claude/config/ogp/text.json'));

// 試験区分→テーマ色（外枠・チップ）。色の真実源は .claude/knowledge/design-system/note-cover-tokens.json (base)。
// ここは category(フルslug) → exam キー(short) の対応のみを持つ（色は重複させない）。
const coverTokens = require(path.join(process.cwd(), '.claude/knowledge/design-system/note-cover-tokens.json'));
const CATEGORY_TO_EXAM_KEY = {
  'pe-comprehensive-management': 'pe-comprehensive',
  'civil-construction-1': 'civil-1',
  'civil-construction-2': 'civil-2',
  'concrete-chief-engineer': 'concrete-chief',
  'concrete-diagnostician': 'concrete-diagnosis',
  'pe-construction': 'pe-construction',
  'pe-first-stage': 'pe-comprehensive',
};
function resolveAccentColor(category) {
  const key = CATEGORY_TO_EXAM_KEY[category];
  return coverTokens.exams?.[key]?.base || null;
}

// コンテンツ種別（frontmatter `group`）→ OGP 種別バッジ（ラベル + アイコン）。
// 資格＝外枠色 と直交する第2軸。サムネ一覧で「青枠＝1級土木 × 過去問バッジ」のように
// 種別を一目で判別させる。アイコン名は ogp-templates.mjs の G2_ICON_PATHS に存在するもの。
const GROUP_TO_TYPE = {
  guide: { label: 'ガイド', icon: 'map' },
  'past-exam': { label: '過去問', icon: 'pen' },
  primary: { label: '過去問', icon: 'pen' },
  secondary: { label: '過去問', icon: 'pen' },
  textbook: { label: 'テキスト', icon: 'layers' },
  keyword: { label: 'キーワード', icon: 'target' },
  pillar: { label: 'まとめ', icon: 'flag' },
};
function resolveContentType(group) {
  return GROUP_TO_TYPE[group] || null;
}

// ダークレイアウト用: タイトルから資格名（kicker と重複）を除き主題/サブへ分割する。
// 区切り（｜ / — / –）でセグメント分割 → 各セグメント先頭の資格ラベル語・種別ラベル語を除去 →
// 空や資格名そのものになったセグメントを捨て、先頭=主題・残り=サブ。最善努力（完璧化は ogp.title）。
function normJP(s) {
  return String(s).replace(/[\s　（）()・、。,.\-—–｜|:：]/g, '');
}
function deriveTitleParts(rawTitle, examLabel, typeLabel) {
  const normLabel = normJP(examLabel);
  const normType = typeLabel ? normJP(typeLabel) : '';
  let segs = String(rawTitle).split(/\s*[｜|]\s*|\s+[—–]\s+/).map(s => s.trim()).filter(Boolean);
  const stripLeading = (seg) => {
    const parts = seg.split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < parts.length) {
      const w = normJP(parts[i]);
      if (!w) { i++; continue; }
      if ((normLabel && normLabel.includes(w)) || (normType && w === normType)) { i++; continue; }
      break;
    }
    return parts.slice(i).join(' ');
  };
  segs = segs.map(stripLeading).filter(s => s && normJP(s) !== normLabel);
  if (segs.length === 0) segs = [String(rawTitle)];
  return { main: segs[0], sub: segs.slice(1).join(' ') };
}

import { renderTemplate, LAYOUT_CONSTANTS } from './lib/ogp-templates.mjs';
import { wrapTitle, pickFontSize } from './lib/ogp-text.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.cwd();
const POSTS_DIR = path.join(PROJECT_ROOT, '.local', 'r2', 'posts');
const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
// 資格ごとに共有する AI 生成背景の置き場。<exam-key>.png|webp|jpg を探す。
// 真実源の exam-key は CATEGORY_TO_EXAM_KEY（上）と note-cover-tokens.json に一致。
const BACKGROUNDS_DIR = path.join(PROJECT_ROOT, '.claude', 'config', 'ogp', 'backgrounds');

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
    light: true, // 既定=ライト写真前面（2026-07-02〜。資格別背景写真＋淡スクリム）。旧ダーク配色は --dark
    outDir: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--debug-safety') args.debugSafety = true;
    else if (a === '--debug-wrap') args.debugWrap = true;
    else if (a === '--template') args.template = argv[++i];
    else if (a === '--light') args.light = true; // 既定でライト。互換のため受理
    else if (a === '--dark') args.light = false; // 旧ダーク配色で描画したいとき用（2026-07-02 既定反転）
    else if (a === '--include-unpublished') args.includeUnpublished = true; // published:false も生成対象に含める（デザイン変更後の全件更新用）
    else if (a === '--out-dir') args.outDir = argv[++i]; // 正規パスでなく指定ディレクトリへ <fullSlug>.png 出力（比較・検証用）
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

// 資格ごとに共有する背景画像を解決する。category → exam-key → backgrounds/<key>.{png,webp,jpg}。
// 存在しなければ null（＝従来のオフホワイト背景にフォールバック、後方互換）。
function resolveBackgroundImage(category) {
  const key = CATEGORY_TO_EXAM_KEY[category];
  if (!key) return null;
  for (const ext of ['png', 'webp', 'jpg', 'jpeg']) {
    const abs = path.join(BACKGROUNDS_DIR, `${key}.${ext}`);
    if (fs.existsSync(abs)) {
      const buf = fs.readFileSync(abs);
      const mime = ext === 'jpg' ? 'jpeg' : ext;
      return `data:image/${mime};base64,${buf.toString('base64')}`;
    }
  }
  return null;
}

// ---- 単一ページの生成処理 ----

async function generateOne({ fullPath, fullSlug, fonts, args, stats }) {
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const { data } = matter(raw);

  if (!data.published && !args.includeUnpublished) {
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

  // --out-dir 指定時は正規パスでなく <out-dir>/<fullSlug>.png へ書き出す（モック比較用・本番を汚さない）
  const outputPath = args.outDir
    ? path.join(PROJECT_ROOT, args.outDir, `${fullSlug}.png`)
    : resolveOutputPath(fullSlug);

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
  // 資格別共有背景を優先し、無ければテンプレ定義の静的背景にフォールバック。
  const backgroundImage = resolveBackgroundImage(data.category) || loadBackgroundImage(templateDef);
  const accentColor = resolveAccentColor(data.category);
  const contentType = resolveContentType(data.group);

  // ダークレイアウト用の主題/サブタイトル。
  //  - frontmatter.ogp.title 明示時 = 完全手動モード: ogp.title=主題 / ogp.subtitle=サブ。
  //    \n の改行をそのまま尊重し、自動の資格名除去・記号改行・budoux は一切行わない
  //    （1 ページずつ改行を作り込むための per-page 制御。フォントは横幅に合わせ自動調整）。
  //  - 未指定時 = 自動モード: deriveTitleParts（資格名除去＋区切り分割）＋ font 相応の折返し。
  const MAIN_FONT_TABLE = [88, 80, 72, 64, 56, 48, 42];
  const SAFE_W = LAYOUT_CONSTANTS.WIDTH - 144 - 8;
  let mainLines, subLines;
  if (data.ogp?.title) {
    const EXPLICIT_WRAP = { breakBefore: [], breakAt: [], charCountFallback: 9999, budouX: { enabled: false } };
    mainLines = await wrapTitle(data.ogp.title, EXPLICIT_WRAP);
    subLines = data.ogp?.subtitle ? await wrapTitle(data.ogp.subtitle, EXPLICIT_WRAP) : [];
  } else {
    const NEW_WRAP_CFG = { ...textConfig, breakAt: [] };
    const { main, sub } = deriveTitleParts(sourceTitle, categoryLabel, contentType?.label);
    mainLines = await wrapTitle(main, NEW_WRAP_CFG);
    const mfApprox = pickFontSize(mainLines, { ...NEW_WRAP_CFG, fontSizeTable: MAIN_FONT_TABLE, safetyWidth: SAFE_W });
    // サブは小フォント（≒主題×0.46・最小26px）で 1 行に多く入る。主題と同じ13字で折ると不要に改行
    // されるため、サブfont と横幅から 1 行最大文字数を出し、記号/スペースでの過剰改行も避ける。
    const subFontApprox = Math.max(26, Math.round(mfApprox * 0.46));
    const subCharMax = Math.max(13, Math.floor((LAYOUT_CONSTANTS.WIDTH - 144 - 16) / subFontApprox));
    const SUB_WRAP_CFG = { ...textConfig, breakAt: [], breakBefore: [], charCountFallback: subCharMax };
    subLines = sub ? await wrapTitle(sub, SUB_WRAP_CFG) : [];
  }
  const mainFont = pickFontSize(mainLines, { fontSizeTable: MAIN_FONT_TABLE, safetyWidth: SAFE_W });

  const element = renderTemplate(templateId, {
    // ライト（既定・写真前面 / note カバー fallback）用。
    // タイトルは分割後の mainLines を使う（旧 lines はフル title＝区切り込みで、subLines と重複するため）。
    lines: mainLines,
    categoryLabel,
    fontSize,
    backgroundImage,
    accentColor,
    contentType,
    // ダーク（--dark 指定時のみ。2026-06-29〜2026-07-02 は既定だったが現在は非既定）用
    dark: !args.light,
    examLabel: categoryLabel,
    mainLines,
    subLines,
    mainFont,
    // 執筆者資格クレジット（既定=表示。frontmatter ogp.credential: false で個別抑止）
    credential: data.ogp?.credential,
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
    console.error('Usage: node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs <fullSlug> | --all [--force] [--dry-run] [--template <id>] [--debug-safety] [--debug-wrap]');
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

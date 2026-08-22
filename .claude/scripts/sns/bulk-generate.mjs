/**
 * SNS コンテンツ一括生成スクリプト
 *
 * 使い方:
 *   node bulk-generate.mjs --slug-list content/sns/priority-slugs.txt --start-date 2026-05-13 --mode both
 *   node bulk-generate.mjs --count 12 --start-date 2026-05-12 --mode both
 *   node bulk-generate.mjs --count 12 --start-date 2026-05-12 --dry-run
 *
 * オプション:
 *   --slug-list   1行1スラグのテキストファイルパス（指定時はこちらを優先）
 *   --count       生成本数（デフォルト: 12 = 4週分 YT）
 *   --start-date  最初の YT 投稿日 YYYY-MM-DD（省略時: 翌月曜）
 *   --mode        yt | ig | both（デフォルト: both）
 *   --category    カテゴリ（デフォルト: pe-comprehensive-management）
 *   --dry-run     生成せず schedule.json だけ出力
 *
 * 出力:
 *   content/sns/youtube/{ytDate}-{slug}/    (yt または both)
 *   content/sns/instagram/{igDate}-{slug}/  (ig または both)
 *   content/sns/schedule.json               (常に出力)
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../');

const YT_SCRIPT  = resolve(__dirname, '../../skills/social/yt-shorts-create/scripts/yt-shorts-create.mjs');
const IG_SCRIPT  = resolve(__dirname, '../../skills/social/ig-post-create/scripts/ig-post-create.mjs');
const YT_OUT_DIR = resolve(ROOT, 'content/sns/youtube');
const IG_OUT_DIR = resolve(ROOT, 'content/sns/instagram');
const POSTS_DIR  = resolve(ROOT, 'content/site');

// ─── CLI 引数 ────────────────────────────────────────────────

function parseArgs(argv) {
  const r = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      r[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
      if (r[key] !== true) i++;
    }
  }
  return r;
}

const args = parseArgs(process.argv.slice(2));
const count        = parseInt(args.count ?? '10', 10);
const mode         = args.mode ?? 'both';
const category     = args.category ?? 'pe-comprehensive-management';
const dryRun       = args['dry-run'] === true || args['dry-run'] === 'true';
const startDate    = args['start-date'] ? new Date(args['start-date']) : nextMonday();
const slugListPath = args['slug-list'] ? resolve(ROOT, args['slug-list']) : null;

if (!['yt', 'ig', 'both'].includes(mode)) {
  console.error('--mode は yt | ig | both のいずれかを指定してください');
  process.exit(1);
}

// ─── 日付ユーティリティ ─────────────────────────────────────

function nextMonday(from = new Date()) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  d.setDate(d.getDate() + daysUntilMonday);
  return d;
}

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YT 投稿日（月=1, 水=3, 金=5）を count 件収集 */
function buildYtDates(start, n) {
  const YT_DAYS = new Set([1, 3, 5]);
  const dates = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  while (dates.length < n) {
    if (YT_DAYS.has(d.getDay())) dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/** YT 日付の翌 IG Carousel 日（火=2, 金=5）を返す */
function nextIgCarouselDate(ytDate) {
  const IG_DAYS = new Set([2, 5]);
  const d = new Date(ytDate);
  d.setDate(d.getDate() + 1);
  while (!IG_DAYS.has(d.getDay())) d.setDate(d.getDate() + 1);
  return d;
}

// ─── 生成済みスラグの抽出 ────────────────────────────────────

function buildDoneSet(dir) {
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir)
      .filter(name => /^\d{4}-\d{2}-\d{2}-/.test(name))
      .map(name => name.replace(/^\d{4}-\d{2}-\d{2}-/, ''))
  );
}

// ─── スラグ候補の収集 ────────────────────────────────────────

function collectSlugs(category, doneSet, limit, listPath) {
  if (listPath) {
    if (!existsSync(listPath)) {
      console.error(`slug-list が見つかりません: ${listPath}`);
      process.exit(1);
    }
    const lines = readFileSync(listPath, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    return lines.filter(slug => !doneSet.has(slug)).slice(0, limit);
  }
  const postsDir = resolve(POSTS_DIR, category);
  if (!existsSync(postsDir)) {
    console.error(`カテゴリが見つかりません: ${postsDir}`);
    process.exit(1);
  }
  return readdirSync(postsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(slug => !doneSet.has(slug))
    .slice(0, limit);
}

// ─── メイン ─────────────────────────────────────────────────

const doneSlugs = buildDoneSet(YT_OUT_DIR);
const slugs     = collectSlugs(category, doneSlugs, count, slugListPath);

if (slugs.length === 0) {
  console.log('生成済みか対象スラグがありません。--count を増やすか別 --category を指定してください。');
  process.exit(0);
}

const ytDates = buildYtDates(startDate, slugs.length);
const schedule = slugs.map((slug, i) => {
  const ytDate = ytDates[i];
  const igDate = nextIgCarouselDate(ytDate);
  return {
    slug,
    yt_post_date:       toIsoDate(ytDate),
    ig_carousel_date:   toIsoDate(igDate),
    ig_reels_date:      toIsoDate(ytDate),
    generated:          false,
    generated_at:       null,
  };
});

// ─── ドライラン表示 ──────────────────────────────────────────

console.log(`\n[bulk-generate] mode=${mode}  count=${slugs.length}  dry-run=${dryRun}`);
console.log(`  category:  ${category}`);
console.log(`  slug-list: ${slugListPath ?? '(自動: アルファベット順)'}`);
console.log(`  スキップ済み: ${doneSlugs.size} スラグ`);
console.log('');
console.log('  #  YT日付      IG日付      スラグ');
console.log('  ─────────────────────────────────────────');
schedule.forEach(({ slug, yt_post_date, ig_carousel_date }, i) => {
  console.log(`  ${String(i + 1).padStart(2)}  ${yt_post_date}  ${ig_carousel_date}  ${slug}`);
});
console.log('');

if (dryRun) {
  console.log('[dry-run] 生成はスキップします。schedule.json を出力します。');
  writeSchedule(schedule);
  process.exit(0);
}

// ─── 本番生成 ────────────────────────────────────────────────

let ok = 0, ng = 0;

for (const entry of schedule) {
  const { slug, yt_post_date, ig_carousel_date } = entry;
  const start = Date.now();

  try {
    if (mode === 'yt' || mode === 'both') {
      console.log(`[YT] ${yt_post_date}  ${slug}`);
      execSync(
        `node "${YT_SCRIPT}" --slug "${slug}" --date "${yt_post_date}" --category "${category}"`,
        { stdio: 'inherit', cwd: ROOT }
      );
    }

    if (mode === 'ig' || mode === 'both') {
      console.log(`[IG] ${ig_carousel_date}  ${slug}`);
      execSync(
        `node "${IG_SCRIPT}" --slug "${slug}" --date "${ig_carousel_date}" --size both --category "${category}"`,
        { stdio: 'inherit', cwd: ROOT }
      );
    }

    entry.generated    = true;
    entry.generated_at = new Date().toISOString();
    ok++;
    console.log(`  → 完了 (${((Date.now() - start) / 1000).toFixed(1)}s)\n`);
  } catch (err) {
    ng++;
    console.error(`  [ERROR] ${slug}: ${err.message}\n`);
  }

  // schedule.json を逐次更新（中断してもここまでの記録が残る）
  writeSchedule(schedule);
}

console.log(`\n完了: ${ok} 件成功 / ${ng} 件エラー`);
console.log(`スケジュール → content/sns/schedule.json`);

function writeSchedule(data) {
  const outPath = resolve(ROOT, 'content/sns/schedule.json');
  writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');
}

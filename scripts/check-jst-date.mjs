#!/usr/bin/env node
/**
 * check-jst-date.mjs — 運用記録の「今日」が UTC・実行環境のタイムゾーンで出ていないか、JST の自前計算が散っていないかを検査する
 * ---------------------------------------------------------------------------
 * 背景（2026-08-13 に 2 件が実害）:
 *   `new Date().toISOString().slice(0, 10)` は UTC の日付。JST は UTC+9 なので
 *   日本時間 00:00〜08:59 に走らせると**前日付**が記録される。
 *     - coconala-blog-publish: 07:38 JST 公開の publishedAt が前日付 → 「1日1本」の判断を誤る
 *     - check-note-attachments: measuredAt が前日付 → 母集団の鮮度判定が常に誤警告
 *   この種のズレは**その時刻に走らせるまで顕在化しない**ので、目視レビューでは落ちる。
 *   同じ理由で、`+ 9 * 3600 * 1000` の自前計算（34 ファイルに散っていた）と、実行環境のタイムゾーンで年月日を組む
 *   `getFullYear()/getMonth()/getDate()`（CI は UTC）も、JST の日付の出し方としては 1 か所（scripts/lib/jst-date.mjs）に寄せる。
 *
 * 検査（scripts/・.claude/・tools/ の .mjs .cjs .js .mts .ts .tsx。コメントだけの行は見ない）:
 *   utc-date   `new Date().toISOString().slice(0, 10)` ＝ UTC の今日
 *   plus9      `9 * 60 * 60 * 1000` などの +9 時間の自前計算（`32400000` も）
 *   local-ymd  `getFullYear()` と `getMonth()`・`getDate()` が近くにある ＝ 実行環境のタイムゾーンで年月日を組んでいる
 *   運用記録の日付は `scripts/lib/jst-date.mjs` の `todayJst()`（月は `jstMonth()`・ある時刻の JST の日は `jstDayOf(時刻)`・
 *   JST の壁時計の曜日・時が要るなら `jstClock(時刻)`）を使う。
 *   allowlist（意図してそのままにする箇所）は**理由を必ず書く**（書けないなら lib へ直す）。kinds で免除する検出の型を絞れる。
 *
 * 使い方:
 *   node scripts/check-jst-date.mjs            # 全件
 *   node scripts/check-jst-date.mjs --staged   # staged のみ（pre-commit）
 * exit: 0=健全 / 1=allowlist 外の違反 or 検査不成立
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execSync } from 'node:child_process';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { listFiles } from './lib/fs-walk.mjs';

export const ROOTS = ['scripts', '.claude', 'tools'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'out', 'worktrees']);
const CODE_FILE = /\.(mjs|cjs|js|mts|ts|tsx)$/;

/** 検出の型 → 直し方 */
export const KINDS = {
  'utc-date': 'UTC の今日（new Date().toISOString().slice(0, 10)）。todayJst() を使う',
  plus9: '+9 時間の自前計算。todayJst()・jstMonth()・jstDayOf(時刻)・jstClock(時刻) を使う',
  'local-ymd': '実行環境のタイムゾーンで年月日を組んでいる。todayJst()・jstMonth()・jstDayOf(時刻) を使う',
};

// 意図してそのままにする箇所。**理由を必ず書く**（書けないなら lib/jst-date.mjs へ直す）。
// 値が文字列なら全ての検出の型を免除、{ kinds, reason } ならその型だけ免除する。
export const ALLOW = new Map([
  ['scripts/lib/jst-date.mjs', 'JST 変換そのものの実装'],
  ['scripts/check-jst-date.mjs', '本チェッカ自身（検出パターンを文字列で持つ）'],
  ['scripts/lib/epub-writer.mjs', 'EPUB の dcterms:modified は UTC 表記が仕様'],
  ['scripts/fetch-ga4-ui-csv.mjs', 'GA4 UI へ渡す日付レンジ（GA4 側のタイムゾーン設定に従う）'],
  ['scripts/fetch-gsc-ui-csv.mjs', 'GSC UI へ渡す日付レンジ（GSC は UTC 基準）'],
  ['scripts/check-x-campaign-plan.mjs', 'coverage の日付列挙は UTC 固定で反復する日付演算（時刻を持たない）'],
  ['scripts/lib/repository-paths.mjs', { kinds: ['plus9'], reason: '他の repo ファイルを import しない自己完結の module（tests/check-figure-canvas.test.mjs が単体で複製して動かす）。移動表の旧名の時刻（UTC）を JST の日に直す 1 か所だけ' }],
  ['.claude/scripts/ads/check-a8-apply-budget.cjs', { kinds: ['plus9'], reason: 'CommonJS（ESM の scripts/lib/jst-date.mjs を同期で import できない。engines が Node 18 を許すので require(esm) に頼らない）' }],
  ['.claude/scripts/check-daily-anomaly.mjs', { kinds: ['local-ymd'], reason: 'YYYY-MM-DD の文字列から作った範囲を暦で数え上げるだけ（現在時刻を使わない）' }],
  ['.claude/scripts/check-data-integrity.mjs', { kinds: ['local-ymd'], reason: 'YYYYMMDD の文字列から作った範囲を暦で数え上げるだけ（現在時刻を使わない）' }],
  ['.claude/scripts/sns/bulk-generate.mjs', { kinds: ['local-ymd'], reason: '手元の Mac のローカル暦で閉じた投稿日の列挙（開始日も同じローカル暦で作る）' }],
  ['.claude/skills/social/publish-ig-bs/publish-ig-bs.ts', { kinds: ['local-ymd'], reason: 'Business Suite の日付欄へ操作者のローカル時刻（JST の Mac）をそのまま入力する' }],
  ['.claude/skills/social/publish-x/publish-x.ts', { kinds: ['local-ymd'], reason: 'X の予約画面の日付・時刻へ操作者のローカル時刻（JST の Mac）をそのまま入力する' }],
]);

const UTC_DATE = /new Date\(\)\.toISOString\(\)\.slice\(\s*0\s*,\s*10\s*\)/;
const PLUS_9H = /\b9\s*\*\s*(?:60\s*\*\s*60\s*\*\s*1_?000|3_?600\s*\*\s*1_?000|60\s*\*\s*60_?000|3_?600_?000|36e5|3_?600e3)\b|\b32_?400_?000\b/;
const COMMENT_LINE = /^\s*(?:\/\/|\*|\/\*)/;

/**
 * ソースの検出（純関数）。コメントだけの行は見ない。
 * @returns {{ kind: keyof typeof KINDS, line: number, text: string }[]}
 */
export function findHits(src) {
  const lines = src.split('\n');
  const hits = [];
  const add = (kind, i) => hits.push({ kind, line: i + 1, text: lines[i].trim().slice(0, 90) });
  lines.forEach((line, i) => {
    if (COMMENT_LINE.test(line)) return;
    if (UTC_DATE.test(line)) add('utc-date', i);
    if (PLUS_9H.test(line)) add('plus9', i);
    if (/\.getFullYear\(\)/.test(line)) {
      const near = lines.slice(Math.max(0, i - 2), i + 3).join('\n');
      if (/\.getMonth\(\)/.test(near) && /\.getDate\(\)/.test(near)) add('local-ymd', i);
    }
  });
  return hits;
}

/** allowlist がこの検出の型を免除しているか */
export function isAllowed(file, kind, allow = ALLOW) {
  const entry = allow.get(file);
  if (!entry) return false;
  return typeof entry === 'string' || entry.kinds.includes(kind);
}

const walk = (d) => listFiles(d, { match: (_p, name) => CODE_FILE.test(name), skipDir: (_p, name) => SKIP_DIRS.has(name), allowMissing: true });

const isMain = process.argv[1] && process.argv[1].endsWith('check-jst-date.mjs');

if (isMain) {
  const STAGED = process.argv.includes('--staged');

  let files;
  if (STAGED) {
    const out = execSync('git -c core.quotepath=false diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
    files = out.split('\n').filter((f) => ROOTS.some((r) => f.startsWith(`${r}/`)) && CODE_FILE.test(f) && existsSync(f));
  } else {
    // ROOT + '/' の除去は Windows で当たらない（walk は join 由来で `\` 区切りを返す）。
    // 剥がれないと join(ROOT, f) が絶対パスを二重連結して ENOENT で落ちる
    // ＝「不合格」ではなく検査が実行不能になる（CLAUDE.md §9）。relative + sep で正規化する。
    files = ROOTS.flatMap((r) => walk(join(ROOT, r))).map((f) => relative(ROOT, f).split(sep).join('/'));
  }

  // 検査ゼロを PASS と呼ばない: staged 実行で対象 0 は正常（何も触っていない）だが、
  // 全件実行で 0 は走査設定の故障なので落とす。
  if (!STAGED && files.length === 0) {
    console.error('[check-jst-date] NG: 走査対象が 0 ファイル（検査不成立）');
    process.exit(1);
  }

  const hits = [];
  for (const f of files) {
    for (const h of findHits(readFileSync(join(ROOT, f), 'utf8'))) {
      if (!isAllowed(f, h.kind)) hits.push({ file: f, ...h });
    }
  }

  console.log(`[check-jst-date] ${files.length} ファイルを実検査（allowlist ${ALLOW.size} 件）`);

  if (hits.length) {
    console.error(`[check-jst-date] NG: JST の日付が UTC・実行環境のタイムゾーン・自前計算で出ている ${hits.length} 件`);
    for (const h of hits) {
      console.error(`  ${h.file}:${h.line}  [${h.kind}]`);
      console.error(`    ${h.text}`);
    }
    console.error('\n  修正: import { todayJst, jstMonth, jstDayOf, jstClock } from "<lib>/jst-date.mjs" を使う（検出の型ごとの直し方）:');
    for (const k of new Set(hits.map((h) => h.kind))) console.error(`    ${k}: ${KINDS[k]}`);
    console.error('        外部 API が UTC を要求する等で意図的なら、check-jst-date.mjs の ALLOW に理由付きで追加する。');
    process.exit(1);
  }
  console.log('[check-jst-date] ✓ 運用記録の日付は全て JST（または理由付きで allowlist 済み）');
}

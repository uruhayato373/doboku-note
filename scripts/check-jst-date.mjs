#!/usr/bin/env node
/**
 * check-jst-date.mjs — 運用記録の「今日」が UTC で出ていないかを検査する
 * ---------------------------------------------------------------------------
 * 背景（2026-08-13 に 2 件が実害）:
 *   `new Date().toISOString().slice(0, 10)` は UTC の日付。JST は UTC+9 なので
 *   日本時間 00:00〜08:59 に走らせると**前日付**が記録される。
 *     - coconala-blog-publish: 07:38 JST 公開の publishedAt が前日付 → 「1日1本」の判断を誤る
 *     - check-note-attachments: measuredAt が前日付 → 母集団の鮮度判定が常に誤警告
 *   この種のズレは**その時刻に走らせるまで顕在化しない**ので、目視レビューでは落ちる。
 *
 * 検査:
 *   scripts/ 配下で `new Date().toISOString().slice(0, 10)` 相当を使っている箇所を列挙し、
 *   allowlist（外部 API が UTC を要求する等、意図して UTC な箇所）に無いものを NG にする。
 *   運用記録の日付は `scripts/lib/jst-date.mjs` の `todayJst()` を使う。
 *
 * 使い方:
 *   node scripts/check-jst-date.mjs            # 全件
 *   node scripts/check-jst-date.mjs --staged   # staged のみ（pre-commit）
 * exit: 0=健全 / 1=allowlist 外の UTC 日付 or 検査不成立
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const STAGED = process.argv.includes('--staged');
const ROOT = process.cwd();

// 意図して UTC のままにする箇所。**理由を必ず書く**（書けないなら todayJst() へ直す）。
const ALLOW = new Map([
  ['scripts/lib/jst-date.mjs', 'JST 変換そのものの実装'],
  ['scripts/check-jst-date.mjs', '本チェッカ自身（検出パターンを文字列で持つ）'],
  ['scripts/lib/epub-writer.mjs', 'EPUB の dcterms:modified は UTC 表記が仕様'],
  ['scripts/fetch-ga4-ui-csv.mjs', 'GA4 UI へ渡す日付レンジ（GA4 側のタイムゾーン設定に従う）'],
  ['scripts/fetch-gsc-ui-csv.mjs', 'GSC UI へ渡す日付レンジ（GSC は UTC 基準）'],
  ['scripts/check-x-campaign-plan.mjs', 'coverage の日付列挙は UTC 固定で反復する日付演算（時刻を持たない）'],
]);

const PATTERN = /new Date\(\)\.toISOString\(\)\.slice\(\s*0\s*,\s*10\s*\)/;

const walk = (d, out = []) => {
  if (!existsSync(d)) return out;
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (/\.(mjs|js|ts)$/.test(e.name)) out.push(p);
  }
  return out;
};

let files;
if (STAGED) {
  const out = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
  files = out.split('\n').filter((f) => f.startsWith('scripts/') && /\.(mjs|js|ts)$/.test(f) && existsSync(f));
} else {
  files = walk(join(ROOT, 'scripts')).map((f) => f.replace(ROOT + '/', ''));
}

// 検査ゼロを PASS と呼ばない: staged 実行で対象 0 は正常（何も触っていない）だが、
// 全件実行で 0 は走査設定の故障なので落とす。
if (!STAGED && files.length === 0) {
  console.error('[check-jst-date] NG: 走査対象が 0 ファイル（検査不成立）');
  process.exit(1);
}

const hits = [];
for (const f of files) {
  const src = readFileSync(join(ROOT, f), 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (!PATTERN.test(line)) return;
    if (ALLOW.has(f)) return;
    hits.push({ file: f, line: i + 1, text: line.trim().slice(0, 90) });
  });
}

console.log(`[check-jst-date] ${files.length} ファイルを実検査（allowlist ${ALLOW.size} 件）`);

if (hits.length) {
  console.error(`[check-jst-date] NG: 運用記録の日付が UTC で出ている ${hits.length} 件`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}`);
    console.error(`    ${h.text}`);
  }
  console.error('\n  修正: import { todayJst } from "./lib/jst-date.mjs" して todayJst() を使う。');
  console.error('        外部 API が UTC を要求する等で意図的なら、check-jst-date.mjs の ALLOW に理由付きで追加する。');
  process.exit(1);
}
console.log('[check-jst-date] ✓ 運用記録の日付は全て JST（または理由付きで allowlist 済み）');

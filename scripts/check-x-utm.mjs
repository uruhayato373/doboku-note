#!/usr/bin/env node
// X（旧Twitter）投稿ドラフト（docs/sns/x/{draft,published}/*/tweets.md）内の
// 「doboku-note.com サイト送客リンク」が UTM 規約に従っているかを検証する。
//
// 規約（真実源: .claude/config/utm-templates.json の x.post / docs/reference/x-post-policy.md §6）:
//   - X の送客リンクには utm_source=x を必ず付ける。
//   - utm_medium=social を必ず付ける（GA4 標準 medium。organic/inline 等の非標準値は Unassigned 化）。
//   - note と違い bare-URL 禁止ルールは不要（X はカード化しても UTM が落ちない）。
//
// スコープ:
//   - docs/sns/x/{draft,published}/*/tweets.md のみ。
//   - `_` 接頭辞ディレクトリ（_archive-<handle> 等の凍結アカウント隔離＝epoch 境界）は対象外。
//     x-schedule-guard と同じ「新アカウントはクリーンな台帳から」原則に合わせる。
//   - インラインコード（バッククォート内）の URL は投稿リンクでなくプロ―ズ例なので対象外。
//
// 使い方:
//   node scripts/check-x-utm.mjs            # docs/sns/x 全体を監査
//   node scripts/check-x-utm.mjs --staged   # git staged の tweets.md のみ（pre-commit 用）
//   SKIP_X_UTM=1 で回避（既存違反のバーンダウン中など）
// 違反 1 件でも exit 1。

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

if (process.env.SKIP_X_UTM === '1') {
  console.log('[check-x-utm] SKIP_X_UTM=1 のためスキップ');
  process.exit(0);
}

const STAGED = process.argv.includes('--staged');
const ROOTS = ['docs/sns/x/draft', 'docs/sns/x/published'];

// `_` 接頭辞ディレクトリ（_archive 等）を含むパスは除外
const isExcluded = (p) => p.split('/').some((seg) => seg.startsWith('_'));

function walk(dir, acc) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (isExcluded(p)) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/tweets\.md$/.test(p)) acc.push(p);
  }
  return acc;
}

let files;
if (STAGED) {
  files = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => /^docs\/sns\/x\/(draft|published)\//.test(f) && /tweets\.md$/.test(f) && !isExcluded(f) && existsSync(f));
} else {
  files = ROOTS.flatMap((r) => walk(r, []));
}

// group1 = 直前のバッククォート（あればインラインコード＝プロ―ズ例で対象外）
// group2 = doboku-note.com の URL（末尾の空白/閉じ括弧/引用符/バッククォートまで）
const RE = /(`)?(https?:\/\/doboku-note\.com[^\s)`">]*)/g;

const problems = [];
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    let m;
    RE.lastIndex = 0;
    while ((m = RE.exec(line)) !== null) {
      if (m[1]) continue; // インラインコードのプロ―ズ例はスキップ
      const url = m[2];
      if (!url.includes('utm_source=x')) {
        problems.push(`${f}:${i + 1} [utm-source] ${url}（utm_source=x が必要）`);
      } else if (!url.includes('utm_medium=social')) {
        problems.push(`${f}:${i + 1} [utm-medium] ${url}（utm_medium=social が必要）`);
      }
    }
  });
}

if (problems.length) {
  console.error(`[check-x-utm] ✗ UTM 規約違反の X 送客リンク ${problems.length} 件:`);
  for (const p of problems) console.error('  ' + p);
  console.error('\n対処: X の送客リンクは https://doboku-note.com/docs/{slug}?utm_source=x&utm_medium=social&utm_campaign={施策}&utm_content={post|pinned} にする。');
  console.error('真実源: .claude/config/utm-templates.json（x.post）／docs/reference/x-post-policy.md §6。');
  console.error('（既存違反のバーンダウン中は SKIP_X_UTM=1 で一時回避可）');
  process.exit(1);
}

console.log(`[check-x-utm] ✓ ${files.length} ファイルの X 送客リンクは UTM 規約に適合`);

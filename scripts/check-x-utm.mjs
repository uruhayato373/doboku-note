#!/usr/bin/env node
// X（旧Twitter）投稿ドラフト（content/sns/x/{draft,published}/*/tweets.md）内の
// 「doboku-note.com サイト送客リンク」が UTM 規約に従っているかを検証する。
//
// 規約（真実源: config/utm-templates.json の x.post / .claude/knowledge/reference/x-post-policy.md §6）:
//   - X の送客リンクには utm_source=x を必ず付ける。
//   - utm_medium=social を必ず付ける（GA4 標準 medium。organic/inline 等の非標準値は Unassigned 化）。
//   - note と違い bare-URL 禁止ルールは不要（X はカード化しても UTM が落ちない）。
//   - 旧 /docs URL（2026-08-22 の移行で 301）は**警告だけ**で落とさない。予約済みの投稿は status.json に
//     承認 hash を持ち、本文を変えると予約が止まるため。新しい原稿は新 URL（/exam/...）で書く（DN-0288）。
//
// スコープ:
//   - content/sns/x/{draft,published}/*/tweets.md のみ。
//   - `_` 接頭辞ディレクトリ（_archive-<handle> 等の凍結アカウント隔離＝epoch 境界）は対象外。
//     x-schedule-guard と同じ「新アカウントはクリーンな台帳から」原則に合わせる。
//   - インラインコード（バッククォート内）の URL は投稿リンクでなくプロ―ズ例なので対象外。
//
// 使い方:
//   node scripts/check-x-utm.mjs            # content/sns/x 全体を監査
//   node scripts/check-x-utm.mjs --staged   # git staged の tweets.md のみ（pre-commit 用）
//   SKIP_X_UTM=1 で回避（既存違反のバーンダウン中など）
// 違反 1 件でも exit 1。

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { blankTweetMemos } from './lib/x-tweets-md.mjs';
import { classifySitePath, loadSiteRoutes, SITE_ORIGIN } from './lib/site-links.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { utmChannelFamily } from './lib/utm-contract.mjs';
import { listFiles } from './lib/fs-walk.mjs';

if (process.env.SKIP_X_UTM === '1') {
  console.log('[check-x-utm] SKIP_X_UTM=1 のためスキップ');
  process.exit(0);
}

const STAGED = process.argv.includes('--staged');
const ROOTS = ['content/sns/x/draft', 'content/sns/x/published'];
// 期待する source / medium は契約（config/utm-templates.json の x.*）から受け取る。コードに書き写さない。
const X_UTM = utmChannelFamily('x');

// `_` 接頭辞ディレクトリ（_archive 等）を含むパスは除外
const isExcluded = (p) => p.split('/').some((seg) => seg.startsWith('_'));

let files;
if (STAGED) {
  files = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    .split('\n')
    .filter((f) => /^content\/sns\/x\/(draft|published)\//.test(f) && /tweets\.md$/.test(f) && !isExcluded(f) && existsSync(f));
} else {
  files = ROOTS.flatMap((r) => listFiles(r, {
    allowMissing: true,
    followLinks: true,
    skipDir: (p) => isExcluded(p),
    match: (p) => !isExcluded(p) && /tweets\.md$/.test(p),
  }));
}

// group1 = 直前のバッククォート（あればインラインコード＝プロ―ズ例で対象外）
// group2 = doboku-note.com の URL（末尾の空白/閉じ括弧/引用符/バッククォートまで）
const RE = /(`)?(https?:\/\/doboku-note\.com[^\s)`">]*)/g;

const problems = [];
const legacy = [];
const routes = loadSiteRoutes();
for (const f of files) {
  // 制作メモ（HTML コメント）内の URL は投稿されないので検査しない。行番号を報告するため
  // 除去ではなく空白化する（blankTweetMemos は行数を保つ）。
  const lines = blankTweetMemos(readFileSync(f, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    let m;
    RE.lastIndex = 0;
    while ((m = RE.exec(line)) !== null) {
      if (m[1]) continue; // インラインコードのプロ―ズ例はスキップ
      const url = m[2];
      const site = classifySitePath(url.replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, ''), routes);
      if (site.kind === 'legacy') legacy.push(`${f}:${i + 1} ${url}${site.to ? ` → ${SITE_ORIGIN}${site.to}` : ''}`);
      if (!url.includes(`utm_source=${X_UTM.source}`)) {
        problems.push(`${f}:${i + 1} [utm-source] ${url}（utm_source=${X_UTM.source} が必要）`);
      } else if (!url.includes(`utm_medium=${X_UTM.medium}`)) {
        problems.push(`${f}:${i + 1} [utm-medium] ${url}（utm_medium=${X_UTM.medium} が必要）`);
      }
    }
  });
}

if (problems.length) {
  console.error(`[check-x-utm] ✗ UTM 規約違反の X 送客リンク ${problems.length} 件:`);
  for (const p of problems) console.error('  ' + p);
  console.error(`\n対処: X の送客リンクは ${SITE_ORIGIN}/exam/{資格}/{種別}/{slug}?utm_source=${X_UTM.source}&utm_medium=${X_UTM.medium}&utm_campaign={施策}&utm_content={${X_UTM.contents.join('|')}} にする。`);
  console.error(`真実源: ${datasetPath('config.utm-templates')}（x.post）／.claude/knowledge/reference/x-post-policy.md §6。`);
  console.error('（既存違反のバーンダウン中は SKIP_X_UTM=1 で一時回避可）');
  process.exit(1);
}

console.log(`[check-x-utm] ✓ ${files.length} ファイルの X 送客リンクは UTM 規約に適合`);
if (legacy.length) {
  // 予約済みの承認 hash を壊さないため落とさない。staged（書いている最中の原稿）だけ行を出す。
  console.log(`[check-x-utm] 注意: 旧 /docs URL ${legacy.length} 件（301 で届く・新しい原稿は新 URL で書く）`);
  if (STAGED) for (const l of legacy) console.log('  [legacy-url] ' + l);
}

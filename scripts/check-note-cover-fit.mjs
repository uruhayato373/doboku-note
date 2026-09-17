#!/usr/bin/env node
/**
 * check-note-cover-fit.mjs
 *
 * note カバー（V5 キャラクターカバー）の文言が**描画枠に入らず生成が失敗する**回帰を、原稿の commit 前に止めるゲート。
 *
 * 判定は描画側と同じ関数（scripts/lib/note-character-cover.mjs の coverFitIssues）＝同梱フォントの実測幅で、
 *   - 主見出し（cover.headline / coverTitle 2 行目 / マガジン magazineName）が x=345〜739 の枠に 96〜48px・最大 3 行で入るか
 *   - リード（leadIn / qualifier）・補足（hi+hiSuffix / proof）・訴求帯（benefit）が 18px 以上で各枠に入るか
 * を検査する。文字数の推定ではなく実測なので、ここが緑なら generate-note-covers は同じ文言で失敗しない。
 * 収まらない文言は**省略せず短縮する**（生成器も省略しない設計）。仕様: note-cover-character-v5.md
 *
 * 使い方:
 *   node scripts/check-note-cover-fit.mjs            # 全 note 記事＋マガジン（CI 用・違反あれば exit 1）
 *   node scripts/check-note-cover-fit.mjs --staged   # git staged の article*.md のみ（pre-commit 用）
 *   node scripts/check-note-cover-fit.mjs --all       # 違反一覧だけ出して exit 0（バーンダウン）
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { coverFitIssues } from './lib/note-character-cover.mjs';
import { loadCoverSources, collectArticleFiles, buildArticleTarget, buildMagazineTargets } from './lib/note-cover-inventory.mjs';
import { MAGAZINES } from './generate-magazine-covers.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTE_DIR = 'content/note';
const STAGED = process.argv.includes('--staged');
const ALL = process.argv.includes('--all');

function stagedMd() {
  try {
    // -c core.quotepath=false: 日本語パスを生UTF-8で出力（既定は "content/note/1\347..." と
    // 引用符付き8進エスケープになり startsWith('content/note') に不一致→日本語パス記事が素通りする）
    return execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
      .split('\n').map((s) => s.trim())
      .filter((s) => s.startsWith(NOTE_DIR) && /\/article(-[A-Za-z0-9-]+)?\.md$/.test(s))
      .map((s) => join(ROOT, s));
  } catch {
    return [];
  }
}

const sources = loadCoverSources(ROOT);
const files = STAGED ? stagedMd() : collectArticleFiles(ROOT);
const ng = [];
let articles = 0;
for (const fp of files) {
  if (!existsSync(fp)) continue;
  const slug = fp.slice(join(ROOT, NOTE_DIR).length + 1).split('\\').join('/');
  let target;
  try { target = buildArticleTarget(ROOT, fp, sources, readFileSync(fp, 'utf8')); } catch (e) { ng.push({ slug, issues: [e.message] }); continue; }
  articles++;
  const issues = coverFitIssues(ROOT, target.input);
  if (issues.length) ng.push({ slug, issues });
}

// マガジン spec（generate-magazine-covers.mjs の MAGAZINES ＋ 設定の補完分）。staged モードでは対象外
// （マガジン spec はスクリプト内定義で staged 判定できないため、CI/手動フルランで検査する）。
let magazines = 0;
if (!STAGED) {
  const { targets, errors } = buildMagazineTargets(ROOT, MAGAZINES, sources);
  for (const e of errors) ng.push({ slug: e.key, issues: [e.error] });
  for (const mag of targets) {
    magazines++;
    const issues = coverFitIssues(ROOT, mag.input);
    if (issues.length) ng.push({ slug: mag.key, issues });
  }
}

const scopeLabel = `記事 ${articles}件 / マガジン ${magazines}件`;
if (ALL) {
  console.log(`[check-note-cover-fit] ${scopeLabel} / 違反 ${ng.length} 件`);
  ng.forEach((r) => r.issues.forEach((i) => console.log(`  ✗ ${r.slug}  ${i}`)));
  process.exit(0);
}
if (ng.length === 0) {
  console.log(`[check-note-cover-fit] ✓ ${STAGED ? 'staged ' : ''}note カバー(${scopeLabel}) は描画枠に収まる`);
  process.exit(0);
}
console.error(`[check-note-cover-fit] ✗ ${ng.length} 件の note カバーが描画枠に収まらない（生成が失敗する）`);
console.error('  真実源: .claude/knowledge/design-system/note-cover-character-v5.md → 文言を短縮し再生成 (node scripts/generate-note-covers.mjs <slug>)');
ng.forEach((r) => r.issues.forEach((i) => console.error(`  ${r.slug}  ${i}`)));
process.exit(1);

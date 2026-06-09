#!/usr/bin/env node
// SNS 投稿（docs/sns/**）内の doboku-note.com/docs/{slug} リンクが
// 本番の正規 slug（src/config/doc-meta-index.json）に実在するかを検証する。
//
// 背景: SNS 投稿の URL を「ページのディレクトリ名」（例 primary-r03-kouki）だけで
// 組むと、本番ルートは「カテゴリ-ディレクトリ」のフラット slug
// （例 civil-construction-2-primary-r03-kouki）のため 404 になる。
// 2026-06 に X 投稿 149 件のリンク切れが発生（560+ impressions のロス）。
//
// 使い方:
//   node scripts/check-sns-urls.mjs            # docs/sns 全体を検証
//   node scripts/check-sns-urls.mjs --staged   # git staged の docs/sns ファイルのみ（pre-commit 用）
//   node scripts/check-sns-urls.mjs --mdx      # MDX本文（.local/r2/posts/**/*.mdx）の bare /docs/{slug} markdownリンクを検証
// broken が 1 件でもあれば exit 1。各 broken に対し、一意に決まる正しい slug を提案する。
//
// 注（2026-06-09）: SNS は `doboku-note.com/docs/{slug}`、MDX本文は bare `/docs/{slug}` 形式で
// 内部リンクするため URL 正規表現をファイル別に分けている。MDX本文の slug 誤りは従来 pre-commit で
// 未検知だった（essay ガイドで実際に発生、旧slug 40件をクリーンアップ済み 2026-06-09）。
// 現在は `--staged`（pre-commit）が docs/sns に加えて staged の .local/r2/posts/*.mdx も検査する。
// `--mdx` は .local/r2/posts 全体を手動/CI で一括検査する用途。

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const STAGED = process.argv.includes('--staged');
const MDX = process.argv.includes('--mdx');
const META = 'src/config/doc-meta-index.json';
if (!existsSync(META)) {
  console.error(`[check-sns-urls] ${META} が無いため検証をスキップ`);
  process.exit(0);
}
const valid = new Set(Object.keys(JSON.parse(readFileSync(META, 'utf8')).docs));

function walk(dir, out = [], re = /\.(md|txt|json)$/) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out, re);
    else if (re.test(e)) out.push(p.split('\\').join('/'));
  }
  return out;
}

let files;
if (MDX) {
  // MDX本文の内部リンク（.local/r2/posts/**/*.mdx）
  files = walk('.local/r2/posts', [], /\.mdx$/);
} else if (STAGED) {
  const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean);
  // SNS（docs/sns の md/txt/json）＋ MDX本文（.local/r2/posts の mdx）の両方を staged から検査
  files = staged.filter((f) => existsSync(f) && (
    (f.startsWith('docs/sns/') && /\.(md|txt|json)$/.test(f)) ||
    (f.startsWith('.local/r2/posts/') && /\.mdx$/.test(f))
  ));
} else {
  files = walk('docs/sns');
}

// ファイル別に URL 形式を切替: SNS = doboku-note.com/docs/{slug}、MDX本文 = bare /docs/{slug}（markdownリンク）。
const RE_SNS = /doboku-note\.com\/docs\/([a-z0-9-]+)(?![a-z0-9-])/g;
const RE_MDX = /\]\(\/docs\/([a-z0-9-]+)\)/g;
const reFor = (f) => (MDX || f.startsWith('.local/r2/posts/')) ? RE_MDX : RE_SNS;
const problems = [];

for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  const lines = raw.split(/\r?\n/);
  const slugRe = reFor(f);
  lines.forEach((line, i) => {
    // テンプレ行（プレースホルダ変数）はスキップ: <year> / {年度} / ｛...｝
    if (/[<>{}｛｝]/.test(line)) return;
    let m;
    slugRe.lastIndex = 0;
    while ((m = slugRe.exec(line)) !== null) {
      const slug = m[1];
      if (valid.has(slug)) continue;
      const cand = [...valid].filter((k) => k === slug || k.endsWith('-' + slug));
      const hint = cand.length === 1 ? `→ ${cand[0]}` : cand.length > 1 ? `→ 曖昧: ${cand.join(' / ')}` : '→ 該当slugなし（名称要確認）';
      problems.push(`${f}:${i + 1}  /docs/${slug}  ${hint}`);
    }
  });
}

if (problems.length) {
  console.error(`[check-sns-urls] ✗ 本番に存在しない /docs/ リンク ${problems.length} 件:`);
  for (const p of problems) console.error('  ' + p);
  console.error('\n対処: /docs/ リンクは「カテゴリ-ディレクトリ」のフラット slug を使う');
  console.error('（例: r07-required ではなく pe-construction-r07-required、SNS/MDX本文とも同じ）');
  process.exit(1);
}
console.log(`[check-sns-urls] ✓ ${files.length} ファイルの /docs/ リンクは全て本番に実在`);

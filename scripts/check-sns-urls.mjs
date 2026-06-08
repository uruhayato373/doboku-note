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
// broken が 1 件でもあれば exit 1。各 broken に対し、一意に決まる正しい slug を提案する。

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const STAGED = process.argv.includes('--staged');
const META = 'src/config/doc-meta-index.json';
if (!existsSync(META)) {
  console.error(`[check-sns-urls] ${META} が無いため検証をスキップ`);
  process.exit(0);
}
const valid = new Set(Object.keys(JSON.parse(readFileSync(META, 'utf8')).docs));

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(md|txt|json)$/.test(e)) out.push(p.split('\\').join('/'));
  }
  return out;
}

let files;
if (STAGED) {
  const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean);
  files = staged.filter((f) => f.startsWith('docs/sns/') && /\.(md|txt|json)$/.test(f) && existsSync(f));
} else {
  files = walk('docs/sns');
}

// doboku-note.com/docs/{slug}。テンプレ変数 <...> を含む URL は除外。
const slugRe = /doboku-note\.com\/docs\/([a-z0-9-]+)(?![a-z0-9-])/g;
const problems = [];

for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  const lines = raw.split(/\r?\n/);
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
  console.error('\n対処: SNS の URL は「カテゴリ-ディレクトリ」のフラット slug を使う');
  console.error('（例: primary-r03-kouki ではなく civil-construction-2-primary-r03-kouki）');
  process.exit(1);
}
console.log(`[check-sns-urls] ✓ ${files.length} ファイルの /docs/ リンクは全て本番に実在`);

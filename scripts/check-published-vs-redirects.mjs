#!/usr/bin/env node
/**
 * check-published-vs-redirects.mjs
 * ---------------------------------------------------------------------------
 * `published: true` の記事が、`public/_redirects` で 301 の**転送元**になっていないかを検査する。
 *
 * なぜ要るか（2026-08-22 の実事故）:
 *   統合済みで `published: false` にしてあった総監キーワード3本を「未公開のまま忘れられている記事」と
 *   誤認して公開した。統合の記録は frontmatter ではなく **`_redirects` の 301 行にだけ**あったため、
 *   frontmatter の `unpublishedReason` を見るだけでは気づけなかった。
 *   この状態は「ページは存在するのに 301 で別ページへ飛ぶ」＝**統合の巻き戻し**で、
 *   sitemap からも除外され（generate-sitemap.mjs が転送元を落とす）検索評価も分散する。
 *   ビルドログの `excluded (via _redirects)` に出るだけでは、読む人がいなければ気づけない。
 *
 * 判定:
 *   published:true かつ noindex でない記事の `/docs/{slug}` が、
 *   `_redirects` の完全一致 301 転送元に現れたら **FAIL**（exit 1）。
 *   意図的に残す場合は `_redirects` の該当行を消すか、記事を `published: false` に戻す。
 *
 * slug 規約は generate-sitemap.mjs / src/lib/docs.ts と同じ:
 *   Convention A: {dir}/{file}.mdx → "{dir}-{file}" ／ Convention B: {dir}/article.mdx → "{dir}"
 *
 * 使い方:
 *   node scripts/check-published-vs-redirects.mjs            # 全件
 *   node scripts/check-published-vs-redirects.mjs --staged   # staged の .mdx だけ（pre-commit）
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content/site');
const REDIRECTS = join(ROOT, 'public/_redirects');
const TAG = '[check-published-vs-redirects]';
const STAGED = process.argv.includes('--staged');

/** _redirects の「完全一致 /docs/{slug}」な転送元 → 転送先 */
function redirectSources() {
  const map = new Map();
  if (!existsSync(REDIRECTS)) return map;
  for (const raw of readFileSync(REDIRECTS, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const m = parts[0].match(/^\/docs\/([^/*]+)$/);
    if (m) map.set(m[1], parts[1]);
  }
  return map;
}

/** content/site 配下の .mdx を列挙して slug を付ける */
function walk(dir, segments = [], out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, [...segments, entry.name], out); continue; }
    if (!entry.isFile() || !entry.name.endsWith('.mdx')) continue;
    const base = entry.name.replace(/\.mdx$/, '');
    const parts = base === 'article' ? segments : [...segments, base];
    if (parts.length === 0) continue;
    out.push({ file: full, slug: parts.join('-') });
  }
  return out;
}

function stagedMdx() {
  try {
    // maxBuffer 既定の 1MB では大規模コミット（数千ファイルの移動）で ENOBUFS 例外になり、
    // 「不合格」ではなく **検査が実行不能** のまま pre-commit ごと止まる（CLAUDE.md §9）。
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    return out.split('\n').map((s) => s.trim()).filter((s) => s.startsWith('content/site/') && s.endsWith('.mdx'));
  } catch { return []; }
}

const redirects = redirectSources();
let targets = walk(CONTENT);
if (STAGED) {
  const staged = new Set(stagedMdx());
  targets = targets.filter((t) => staged.has(relative(ROOT, t.file).split('\\').join('/')));
}

let inspected = 0;
const violations = [];
for (const t of targets) {
  const { data } = matter(readFileSync(t.file, 'utf8'));
  if (data.published !== true) continue;
  if (data.noindex === true) continue;
  inspected++;
  const to = redirects.get(t.slug);
  if (to) violations.push({ ...t, to });
}

// 「検査ゼロを PASS と呼ばない」: 母集合と実検査数を必ず出す。
console.log(`${TAG} _redirects の /docs 転送元 ${redirects.size} 件 / 対象 .mdx ${targets.length} 件 / published を実検査 ${inspected} 件${STAGED ? '（staged）' : ''}`);
if (!STAGED && redirects.size === 0) {
  console.error(`${TAG} FAIL: _redirects から転送元を1件も読めていません（検査不成立）`);
  process.exit(1);
}
if (violations.length === 0) {
  console.log(`${TAG} OK: published な記事が 301 の転送元になっている箇所なし`);
  process.exit(0);
}
console.error(`${TAG} FAIL: published なのに 301 で別ページへ飛ぶ記事 ${violations.length} 件`);
for (const v of violations) {
  console.error(`  ${relative(ROOT, v.file)}`);
  console.error(`    /docs/${v.slug} → ${v.to}（_redirects）`);
}
console.error('  統合済みの記事を再公開しようとしている可能性があります。');
console.error('  公開するなら public/_redirects の該当行を消す。統合を維持するなら published: false に戻す。');
process.exit(1);

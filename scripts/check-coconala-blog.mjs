#!/usr/bin/env node
/**
 * check-coconala-blog.mjs — ココナラブログ記事 SoT のオフライン検査
 * ---------------------------------------------------------------------------
 * なぜ要るか:
 *   ココナラブログは**外部リンクを1本書いただけでアカウント制限**の対象になりうる
 *   （投稿エディタが規約として明示・coconala-blog-policy.md §1）。書いた瞬間に止めないと
 *   公開後に気づいても取り返せない。加えて、公開済み記事の送客先が後から
 *   受付休止・アーカイブされると「買えないページへ送る記事」が公開されたまま残る——
 *   これは記事側を触っていないので pre-commit では永久に検出できない（週次で見る）。
 *
 * 2モード:
 *   --staged  pre-commit。staged の content/coconala/blog/**\/article.md だけを検査
 *   （既定）  全件検査。--json で週次レビュー surfacer 用の JSON を出す
 *
 * 検査:
 *   S1 frontmatter スキーマ（必須キー・status の語彙）
 *   S2 ハードゲート（coconala-blog-guards の5種を丸ごと適用）
 *   S3 公開状態の整合（status:'published' ⇔ blogUrl あり・publishedAt あり）
 *   S4 ドリフト（全件時のみ）: 公開済みなのに funnel 先が listed でない / 下書きが 30 日以上放置
 *
 * 「検査ゼロを PASS と呼ばない」:
 *   検査対象数と実検査数を必ず出力する。対象 0 件は「対象ゼロ（未着手）」と明示し、
 *   異常0件の緑と区別する。読めなかったファイルがあれば exit 2（検査不成立）。
 *
 * 使い方:
 *   node scripts/check-coconala-blog.mjs
 *   node scripts/check-coconala-blog.mjs --staged
 *   node scripts/check-coconala-blog.mjs --json
 * exit: 0=問題なし / 1=要対応 / 2=検査不成立
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, readdirSync, statSync, writeSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readCatalog } from './lib/coconala-session.mjs';
import { assertBlogPost, BlogGuardError, TITLE_MAX } from './lib/coconala-blog-guards.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = join(ROOT, 'content/coconala/blog');
const TAG = '[check-coconala-blog]';
const argv = process.argv.slice(2);
const STAGED = argv.includes('--staged');
const AS_JSON = argv.includes('--json');
const STALE_DRAFT_DAYS = 30;
const REQUIRED_KEYS = ['title', 'status', 'exam', 'angle', 'funnel', 'source'];
const STATUSES = ['draft', 'published'];

const fmBlock = (raw) => raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
const fmValue = (block, k) =>
  (block.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) ?? '';
const fmList = (block, k) => {
  const raw = fmValue(block, k);
  if (!raw) return [];
  return raw.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
};
const body = (raw) => raw.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');

/** 対象記事を集める。--staged は git の staged 一覧、既定はディレクトリ走査。 */
function collect() {
  if (STAGED) {
    let out = '';
    try {
      out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    } catch { return []; }
    return out.split('\n').map((s) => s.trim()).filter((p) => /^content\/coconala\/blog\/.+\/article\.md$/.test(p))
      .map((p) => join(ROOT, p)).filter((p) => existsSync(p));
  }
  if (!existsSync(BLOG_DIR)) return [];
  const acc = [];
  for (const e of readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const f = join(BLOG_DIR, e.name, 'article.md');
    if (existsSync(f)) acc.push(f);
  }
  return acc;
}

const files = collect();
const catalog = readCatalog();
const out = {
  mode: STAGED ? 'staged' : 'all',
  target: files.length,
  inspected: 0,
  readFail: 0,
  titleLengthChecked: Number.isFinite(TITLE_MAX),
  published: 0,
  drafts: 0,
  violations: [],
  warnings: [],
};

const now = Date.now();
for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  let raw;
  try { raw = readFileSync(file, 'utf8'); }
  catch (e) { out.readFail++; out.violations.push(`${rel}: 読めません（${e.message}）`); continue; }
  out.inspected++;

  const block = fmBlock(raw);
  if (!block) { out.violations.push(`${rel}: frontmatter がありません`); continue; }

  // S1 スキーマ
  const missing = REQUIRED_KEYS.filter((k) => !fmValue(block, k));
  if (missing.length) out.violations.push(`${rel}: frontmatter に必須キーがありません: ${missing.join(', ')}`);
  const status = fmValue(block, 'status');
  if (status && !STATUSES.includes(status)) {
    out.violations.push(`${rel}: status:'${status}' は未知（${STATUSES.join(' / ')} のいずれか）`);
  }

  const title = fmValue(block, 'title');
  const funnel = fmList(block, 'funnel');
  const blogUrl = fmValue(block, 'blogUrl');
  const publishedAt = fmValue(block, 'publishedAt');
  if (status === 'published') out.published++; else out.drafts++;

  // S2 ハードゲート
  try {
    assertBlogPost({ title, body: body(raw), funnel }, catalog);
  } catch (e) {
    if (e instanceof BlogGuardError) out.violations.push(`${rel}: [${e.code}] ${e.message.split('\n')[0]}`);
    else throw e;
  }

  // S2b 装飾記法。ココナラのエディタは ** を解釈しない。coconala-blog-publish は段落と
  // 見出ししか作らず太字を当てる処理が無く、実際にライブ本文の <strong> は 0 件。
  // 原稿に ** を書くとアスタリスクがそのまま読者に見える。2026-08-31、級の違いを説明する
  // 段落を 4 記事へ足したときに実際に混入した（公開前に気づいて除去）。
  const boldCount = (body(raw).match(/\*\*/g) || []).length;
  if (boldCount > 0) {
    out.violations.push(`${rel}: 本文に太字記法 ** が ${boldCount} 個（エディタが解釈せず、アスタリスクがそのまま表示される。強調は「」で表す）`);
  }

  // S3 公開状態の整合
  if (status === 'published' && !blogUrl) {
    out.violations.push(`${rel}: status:'published' なのに blogUrl が空（公開したのに書き戻せていない疑い）`);
  }
  if (status === 'published' && !publishedAt) {
    out.violations.push(`${rel}: status:'published' なのに publishedAt が空`);
  }
  if (status !== 'published' && blogUrl) {
    out.violations.push(`${rel}: blogUrl があるのに status:'${status}'（公開済みなら published にする）`);
  }

  // S4 ドリフト（全件検査のときだけ。staged では他記事の状態を持ち出さない）
  if (!STAGED && status === 'draft') {
    const age = (now - statSync(file).mtimeMs) / 86_400_000;
    if (age > STALE_DRAFT_DAYS) {
      out.warnings.push(`${rel}: 下書きのまま ${Math.floor(age)} 日（上限 ${STALE_DRAFT_DAYS} 日）`);
    }
  }
}

// --- 出力 -------------------------------------------------------------------
out.due = out.violations.length > 0;
const inconclusive = out.readFail > 0;

if (AS_JSON) {
  writeSync(1, JSON.stringify({ ...out, inconclusive }, null, 2) + '\n');
  process.exit(inconclusive ? 2 : out.due ? 1 : 0);
}

if (out.target === 0) {
  console.log(`${TAG} 対象ゼロ（${STAGED ? 'staged に該当記事なし' : 'content/coconala/blog/ に記事がまだありません'}）— 異常なしではなく未着手`);
  process.exit(0);
}
console.log(`${TAG} 検査 ${out.inspected}/${out.target} 件（公開 ${out.published} / 下書き ${out.drafts}）` +
  `${out.readFail ? ` ・読取失敗 ${out.readFail}` : ''}`);
if (!out.titleLengthChecked) {
  console.log(`${TAG} 注: タイトル長は未検査（TITLE_MAX 未計測 — 実機プローブで確定させること）`);
}
for (const w of out.warnings) console.log(`  △ ${w}`);
if (inconclusive) { console.error(`${TAG} 検査不成立（読めないファイルがある）`); process.exit(2); }
if (!out.due) { console.log(`${TAG} OK`); process.exit(0); }
for (const v of out.violations) console.error(`  ▼ ${v}`);
process.exit(1);

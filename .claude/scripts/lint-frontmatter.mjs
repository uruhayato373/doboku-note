#!/usr/bin/env node
/**
 * Frontmatter Linter
 *
 * MDX の frontmatter を zod スキーマ検証に加えて、内容面のルールで lint する。
 *
 * ── 検査項目 ──
 *   HIGH   : zod スキーマ違反（構造的欠陥、必須フィールド欠落、enum 値不正）
 *   MEDIUM : description 不足、publishedAt 欠落（published=true時）、未来 publishedAt
 *   LOW    : タグ allowlist 外、description 長すぎ、タグ 0 件、exams 多重で sections 欠落
 *
 * ── Usage ──
 *   node .claude/scripts/lint-frontmatter.mjs <file.mdx>
 *   node .claude/scripts/lint-frontmatter.mjs <dir>         # 再帰
 *   node .claude/scripts/lint-frontmatter.mjs --all         # content/site 全体
 *   node .claude/scripts/lint-frontmatter.mjs --stdin       # staged files via git diff
 *   node .claude/scripts/lint-frontmatter.mjs --json <...>  # JSON 出力
 *
 * Exit code:
 *   0 : HIGH 0 件（MEDIUM/LOW は出力するが成功扱い）
 *   1 : HIGH 1 件以上
 *   2 : 引数エラー
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, relative, dirname, extname } from 'node:path';
import matter from 'gray-matter';
import { FrontmatterSchema } from '#lib/frontmatter-schema.mjs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const POSTS_ROOT = join(ROOT, 'content/site');
const TAGS_ALLOWLIST_PATH = join(ROOT, 'src/config/tags.json');

// ── 閾値定数（Task #14 の実地測定に基づく） ────────────────────

const DESC_MIN = 50;
const DESC_MAX = 200;
const PUBLISHED_AT_YEAR_MIN = 2020;
const PUBLISHED_AT_YEAR_MAX = 2030;

// title/seoTitle 長（G4）: レンダリング後 <title> の目安。seo-meta-config.json の title.max_length を再利用。
const TITLE_SUFFIX = '｜doboku-note';
let TITLE_MAX = 70;
try {
  const _seo = JSON.parse(readFileSync(join(ROOT, '.claude/config/seo-meta-config.json'), 'utf8'));
  if (_seo?.thresholds?.title?.max_length) TITLE_MAX = _seo.thresholds.title.max_length;
} catch { /* seo-meta-config が無ければ 70 でフォールバック */ }

// ── 引数パース ─────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { targets: [], all: false, stdin: false, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--stdin') args.stdin = true;
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else args.targets.push(a);
  }
  return args;
}

// ── MDX 列挙 ────────────────────────────────────────────────────

function walkMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMdx(p));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.mdx') out.push(p);
  }
  return out;
}

function expandTargets(args) {
  if (args.all) return walkMdx(POSTS_ROOT);
  if (args.stdin) {
    try {
      const out = execSync('git -c core.quotepath=false diff --cached --name-only --diff-filter=ACM -- "*.mdx"', {
        encoding: 'utf8',
      });
      return out
        .trim()
        .split('\n')
        .filter((f) => f && existsSync(f));
    } catch {
      return [];
    }
  }
  const files = [];
  for (const t of args.targets) {
    if (!existsSync(t)) continue;
    const s = statSync(t);
    if (s.isDirectory()) files.push(...walkMdx(t));
    else if (extname(t).toLowerCase() === '.mdx') files.push(t);
  }
  return files;
}

// ── allowlist 読み込み ─────────────────────────────────────────

export function loadTagAllowlist() {
  const set = new Set();
  if (!existsSync(TAGS_ALLOWLIST_PATH)) return set;
  try {
    const json = JSON.parse(readFileSync(TAGS_ALLOWLIST_PATH, 'utf8'));
    if (Array.isArray(json)) {
      for (const e of json) {
        if (typeof e === 'string') set.add(e);
        else if (e && typeof e === 'object') {
          if (e.slug) set.add(e.slug);
          if (e.name) set.add(e.name);
        }
      }
    }
  } catch {
    // 無視
  }
  return set;
}

// ── Lint 本体 ──────────────────────────────────────────────────

export function lintFrontmatter(filePath, data, allowlist) {
  const issues = [];
  const push = (severity, code, message) => issues.push({ severity, code, message });

  // --- HIGH: zod スキーマ ---
  const zodResult = FrontmatterSchema.safeParse(data);
  if (!zodResult.success) {
    for (const issue of zodResult.error.issues) {
      const path = issue.path?.length ? issue.path.join('.') : '(root)';
      push('HIGH', 'zod', `${path}: ${issue.message}`);
    }
  }

  // --- MEDIUM: description 長さ ---
  const desc = typeof data.description === 'string' ? data.description : '';
  if (desc && desc.length < DESC_MIN) {
    push('MEDIUM', 'desc-short', `description が短い: ${desc.length} 文字（推奨 ${DESC_MIN}-160）`);
  }
  if (desc && desc.length > DESC_MAX) {
    push('LOW', 'desc-long', `description が長い: ${desc.length} 文字（推奨 <= 160、上限 ${DESC_MAX}）`);
  }

  // --- MEDIUM: guide のナビ用短縮タイトル（サイドバー 2 行表示の供給源）---
  // 欠けるとサイドバー/モバイル記事末ナビが title にフォールバックし、
  // 「2級土木施工管理技士とは — 難易度・合格率・試験内容」のような長い行が並んで一覧が読めなくなる
  // （2026-07-28 に civil-2 で実際に発生）。真実源の解決は src/lib/doc-title.ts の resolveNavTitle。
  if (data.group === 'guide' && data.published !== false) {
    if (!data.shortTitle) {
      push('MEDIUM', 'nav-shortTitle-missing', 'group: guide に shortTitle が無い（ナビ一覧が長い title にフォールバックする）');
    }
    if (!data.subtitle) {
      push('MEDIUM', 'nav-subtitle-missing', 'group: guide に subtitle が無い（ナビ一覧の 2 行目が出ない）');
    }
  }
  // --- LOW: 廃止フィールド（Docusaurus 由来・0 件運用）---
  if (data.sidebar_label) {
    push('LOW', 'sidebar-label-legacy', 'sidebar_label は廃止フィールド。shortTitle を使う');
  }

  // --- MEDIUM: title/seoTitle 長（G4・静的近似）---
  // title は "｜doboku-note" 付与でレンダリングされるため換算長で判定。seoTitle は <title> 直挿し想定。
  const title = typeof data.title === 'string' ? data.title : '';
  if (title && title.length + TITLE_SUFFIX.length > TITLE_MAX) {
    push('MEDIUM', 'title-long', `title が長い: 換算 ${title.length + TITLE_SUFFIX.length} 文字（<title> 上限 ${TITLE_MAX}。検索結果で末尾が切れる）`);
  }
  const seoTitle = typeof data.seoTitle === 'string' ? data.seoTitle : '';
  if (seoTitle && seoTitle.length > TITLE_MAX) {
    push('MEDIUM', 'seoTitle-long', `seoTitle が長い: ${seoTitle.length} 文字（<title> 上限 ${TITLE_MAX}）`);
  }

  // --- MEDIUM: publishedAt 欠落（published=true 時）---
  const isPublished = data.published !== false; // 明示的 false 以外は公開扱い
  const hasPublishedAt = data.publishedAt !== undefined && data.publishedAt !== null && data.publishedAt !== '';
  if (isPublished && !hasPublishedAt) {
    push('MEDIUM', 'publishedAt-missing', 'published=true だが publishedAt が未設定');
  }

  // --- MEDIUM: publishedAt が未来 or 範囲外 ---
  if (hasPublishedAt) {
    const pa = data.publishedAt;
    let y = null;
    if (pa instanceof Date) y = pa.getFullYear();
    else if (typeof pa === 'string') {
      const m = pa.match(/^(\d{4})/);
      if (m) y = parseInt(m[1], 10);
    }
    if (y !== null) {
      if (y < PUBLISHED_AT_YEAR_MIN || y > PUBLISHED_AT_YEAR_MAX) {
        push('MEDIUM', 'publishedAt-range', `publishedAt の年が範囲外: ${y}`);
      }
      // 未来日チェック
      const now = new Date();
      let paDate = pa instanceof Date ? pa : new Date(pa);
      if (paDate instanceof Date && !isNaN(paDate) && paDate > now) {
        const daysAhead = Math.floor((paDate - now) / (1000 * 60 * 60 * 24));
        if (daysAhead > 7) {
          push('MEDIUM', 'publishedAt-future', `publishedAt が未来日 (${daysAhead}日後)`);
        }
      }
    }
  }

  // --- LOW: タグ 0 件 or allowlist 外 ---
  const tags = Array.isArray(data.tags) ? data.tags : [];
  if (tags.length === 0) {
    push('LOW', 'tags-empty', 'tags が空');
  } else {
    const unknownTags = tags.filter((t) => typeof t === 'string' && !allowlist.has(t));
    if (unknownTags.length > 0) {
      push('LOW', 'tags-unknown', `allowlist 外のタグ: ${unknownTags.join(', ')}`);
    }
  }

  // --- LOW: exams 多重で sections 欠落 ---
  if (Array.isArray(data.exams) && data.exams.length > 1) {
    if (!data.sections || typeof data.sections !== 'object') {
      push('LOW', 'sections-missing', 'exams が複数だが sections が未設定');
    } else {
      const missingSections = data.exams.filter((e) => !(e in data.sections));
      if (missingSections.length > 0) {
        push('LOW', 'sections-incomplete', `sections に未登録の exam: ${missingSections.join(', ')}`);
      }
    }
  }

  return issues;
}

// ── 出力フォーマット ──────────────────────────────────────────

function formatText(results) {
  const lines = [];
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const { file, issues } of results) {
    if (issues.length === 0) continue;
    const rel = relative(ROOT, file);
    lines.push(`\n=== ${rel} ===`);
    for (const issue of issues) {
      lines.push(`  [${issue.severity}] ${issue.code}: ${issue.message}`);
      counts[issue.severity]++;
    }
  }
  const total = results.length;
  const clean = results.filter((r) => r.issues.length === 0).length;
  lines.push(
    `\nSummary: ${total} files | clean ${clean} | HIGH ${counts.HIGH} | MEDIUM ${counts.MEDIUM} | LOW ${counts.LOW}`,
  );
  return { output: lines.join('\n'), counts };
}

function formatJson(results) {
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const r of results) {
    for (const i of r.issues) counts[i.severity]++;
  }
  return {
    output: JSON.stringify(
      {
        version: 1,
        generated_at: new Date().toISOString(),
        summary: {
          total: results.length,
          clean: results.filter((r) => r.issues.length === 0).length,
          ...counts,
        },
        results: results.map((r) => ({ file: relative(ROOT, r.file), issues: r.issues })),
      },
      null,
      2,
    ),
    counts,
  };
}

// ── メイン ──────────────────────────────────────────────────────

function printHelp() {
  console.log(`
Frontmatter Linter

Usage:
  node .claude/scripts/lint-frontmatter.mjs <file.mdx>
  node .claude/scripts/lint-frontmatter.mjs <dir>
  node .claude/scripts/lint-frontmatter.mjs --all
  node .claude/scripts/lint-frontmatter.mjs --stdin
  node .claude/scripts/lint-frontmatter.mjs --json <target>

Exit codes:
  0: HIGH 違反 0 件
  1: HIGH 違反あり
  2: 引数エラー
`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  if (!args.all && !args.stdin && args.targets.length === 0) {
    printHelp();
    process.exit(2);
  }

  const files = expandTargets(args);
  if (files.length === 0) {
    console.log('[lint-frontmatter] 対象 0 件');
    process.exit(0);
  }

  const allowlist = loadTagAllowlist();
  const results = [];

  for (const file of files) {
    let data;
    try {
      data = matter(readFileSync(file, 'utf8')).data || {};
    } catch (e) {
      results.push({
        file,
        issues: [{ severity: 'HIGH', code: 'parse', message: `frontmatter parse error: ${e.message}` }],
      });
      continue;
    }
    const issues = lintFrontmatter(file, data, allowlist);
    results.push({ file, issues });
  }

  const { output, counts } = args.json ? formatJson(results) : formatText(results);
  console.log(output);
  process.exit(counts.HIGH > 0 ? 1 : 0);
}

// 直接実行時のみ main() を起動。import された場合はスキップ
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

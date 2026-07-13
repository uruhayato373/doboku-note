#!/usr/bin/env node

/**
 * 内部リンク切れチェッカー（slug + アンカー断片）
 *
 * 対象スコープ:
 *   - site: .local/r2/posts 配下の .mdx（公開コンテンツ。相対リンク [text](/docs/slug)）
 *   - note: docs/note 配下の article.md（note ドラフト。絶対 URL・裸 URL・相対リンク）
 *   - all : 両方（既定）
 *
 * 検証内容:
 *   - /docs/{slug} の slug 存在（.local/r2/posts 由来の有効 slug 集合）
 *   - /category/{slug} の存在（src/config/categories.json）
 *   - #anchor 断片の存在（リンク先ページの見出し ID 集合と照合）
 *   - note.com の PLACEHOLDER リンク（未発売プレースホルダとして INFO 報告。HIGH に数えない）
 *
 * Usage:
 *   node check-links.mjs [--scope note|site|all] [--json] [--report <dir>]
 *
 * 終了コード: HIGH（リンク切れ・アンカー切れ）が 1 件以上で 1
 */

import fs from 'fs';
import path from 'path';
import { generateHeadingId, extractHeadings } from '#lib/heading-id.mjs';
import { buildKeywordHref } from '#src/lib/keyword-href.mjs';

const ROOT = process.cwd();
const SITE_DIR = path.join(ROOT, '.local', 'r2', 'posts');
const NOTE_DIR = path.join(ROOT, 'docs', 'note');
const CATEGORIES_PATH = path.join(ROOT, 'src', 'config', 'categories.json');

// --- 引数 ---
const argv = process.argv.slice(2);
function getArg(name, def = null) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const scope = getArg('--scope', 'all');
const jsonOut = argv.includes('--json');
const reportDir = getArg('--report', null);

// 検証対象の静的ページ（有効なものだけ。これ以外の静的プレフィックスはリンク切れ扱い）
const KNOWN_STATIC = new Set(['/', '/about', '/privacy', '/search']);
// 「静的ページリンク」として検査するプレフィックス（元 check-links.mjs の挙動を踏襲）
const STATIC_PREFIX_RE = /^\/(about|privacy|search|blog|contact)(\/|$)/;

// JSX <RelatedKeywords> 内 slug の URL 生成。解決規則は src/lib/keyword-href.mjs を
// RelatedKeywords.tsx と共有する（真実源の一元化）。カテゴリ接頭辞は categories.json から
// 供給し、ここでロジックを複製しない（複製すると表示とチェッカーがドリフトして
// 実在ページへのリンクが偽 BROKEN_SLUG になる。2026-07 の 166 件事故の再発防止）。

// --- Step 1: 有効 slug 集合と slug -> ファイルパス対応を構築 ---
function findSiteMdxFiles(dir, basePath = []) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const name = entry.name.replace(/\.mdx$/, '');
    if (entry.isDirectory()) {
      if (name === 'img') continue;
      results.push(...findSiteMdxFiles(fullPath, [...basePath, name]));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      const slugPath = name === 'article' ? basePath : [...basePath, name];
      if (slugPath.length > 0) {
        results.push({ slug: slugPath.join('-'), filePath: fullPath });
      }
    }
  }
  return results;
}

const siteFiles = findSiteMdxFiles(SITE_DIR);
const validSlugs = new Set(siteFiles.map((f) => f.slug));
const slugToFile = new Map(siteFiles.map((f) => [f.slug, f.filePath]));

const validCategories = new Set();
const categorySlugs = [];
if (fs.existsSync(CATEGORIES_PATH)) {
  for (const cat of JSON.parse(fs.readFileSync(CATEGORIES_PATH, 'utf8'))) {
    validCategories.add(cat.slug);
    categorySlugs.push(cat.slug);
  }
}

// --- Step 2: 走査対象ファイルを収集 ---
function findNoteFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findNoteFiles(fullPath));
    else if (entry.name === 'article.md') results.push(fullPath);
  }
  return results;
}

const targets = [];
if (scope === 'site' || scope === 'all') {
  for (const f of siteFiles) targets.push(f.filePath);
}
if (scope === 'note' || scope === 'all') {
  for (const fp of findNoteFiles(NOTE_DIR)) targets.push(fp);
}

// --- Step 3: リンク抽出 ---
function normalizeHref(href) {
  const raw = href.trim();
  // note.com マガジンの未発売プレースホルダ
  if (/note\.com\/[^\s)]*PLACEHOLDER/i.test(raw)) {
    return { kind: 'placeholder', href: raw };
  }
  // doboku-note.com の絶対 URL を相対パスへ正規化
  let h = raw.replace(/^https?:\/\/(www\.)?doboku-note\.com/i, '');
  if (!h.startsWith('/')) return null; // 外部リンク・mailto 等は対象外
  h = h.split('?')[0]; // クエリ除去（アンカー # は残す）
  if (h.startsWith('/docs/')) return { kind: 'docs', href: h };
  if (h.startsWith('/category/')) return { kind: 'category', href: h };
  const base = h.split('#')[0];
  if (base === '/' || STATIC_PREFIX_RE.test(base)) return { kind: 'static', href: h };
  return null; // その他の内部パスは対象外（元スクリプトの挙動を踏襲）
}

function extractLinks(content) {
  const links = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const mdSpans = [];
    // Markdown リンク [text](href)
    const mdPattern = /\[([^\]]*)\]\(([^)\s]+)\)/g;
    let m;
    while ((m = mdPattern.exec(line)) !== null) {
      mdSpans.push([m.index, m.index + m[0].length]);
      const norm = normalizeHref(m[2]);
      if (norm) links.push({ text: m[1], raw: m[2], kind: norm.kind, href: norm.href, line: lineNum });
    }
    // 裸 URL（note リンクカード形式）— Markdown リンク内に含まれるものは除外
    const barePattern = /https?:\/\/[^\s)）\]"'<>]+/g;
    while ((m = barePattern.exec(line)) !== null) {
      const idx = m.index;
      if (mdSpans.some(([s, e]) => idx >= s && idx < e)) continue;
      const url = m[0].replace(/[。、）)'"]+$/, '');
      const norm = normalizeHref(url);
      if (norm) links.push({ text: '', raw: url, kind: norm.kind, href: norm.href, line: lineNum });
    }
  }
  // JSX <RelatedKeywords items={[ ... ]} /> 内の slug を抽出（複数行ブロック対応）
  // ブロック単位で line 番号を保持するため、開始行を起点に内部の slug 行を計算
  const rkBlockPattern = /<RelatedKeywords\b[\s\S]*?\/>/g;
  let bm;
  while ((bm = rkBlockPattern.exec(content)) !== null) {
    const block = bm[0];
    const blockStartLine = content.slice(0, bm.index).split('\n').length;
    const slugPattern = /\bslug\s*:\s*["']([^"']+)["']/g;
    let sm;
    while ((sm = slugPattern.exec(block)) !== null) {
      const slug = sm[1];
      const labelMatch = /label\s*:\s*["']([^"']*)["']\s*,\s*slug\s*:/.exec(
        block.slice(Math.max(0, sm.index - 200), sm.index + slug.length + 20),
      );
      const label = labelMatch ? labelMatch[1] : '';
      const lineOffset = block.slice(0, sm.index).split('\n').length - 1;
      const href = buildKeywordHref(slug, categorySlugs);
      links.push({
        text: label,
        raw: `RelatedKeywords slug="${slug}"`,
        kind: 'docs',
        href,
        line: blockStartLine + lineOffset,
      });
    }
  }
  return links;
}

// --- Step 4: アンカー ID 集合（リンク先ファイルの見出しから生成、キャッシュ） ---
const anchorCache = new Map();
function anchorIdSet(filePath) {
  if (anchorCache.has(filePath)) return anchorCache.get(filePath);
  const set = new Set();
  try {
    for (const h of extractHeadings(fs.readFileSync(filePath, 'utf8'))) {
      set.add(h.id.toLowerCase());
      set.add(h.examId.toLowerCase());
    }
  } catch {
    /* 読めない場合は空集合（slug 自体は有効なのでアンカー検証はスキップ扱いになる） */
  }
  anchorCache.set(filePath, set);
  return set;
}

// アンカーは一般版 ID・過去問変種 ID のいずれかに一致すれば OK（誤検出ゼロ優先）
function anchorOk(anchor, filePath) {
  if (!filePath) return true;
  const ids = anchorIdSet(filePath);
  if (ids.size === 0) return true; // 見出しが取れなかったファイルは検証スキップ
  const candidates = [
    anchor.toLowerCase(),
    generateHeadingId(anchor),
    generateHeadingId(anchor, { examMode: true }),
  ];
  return candidates.some((c) => ids.has(c));
}

// --- Step 5: 検証 ---
const findings = [];
let linksChecked = 0;

for (const filePath of targets) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    continue;
  }
  for (const link of extractLinks(content)) {
    linksChecked++;
    const base = { file: rel, line: link.line, text: link.text, href: link.raw };

    if (link.kind === 'placeholder') {
      findings.push({ ...base, severity: 'INFO', status: 'PLACEHOLDER' });
    } else if (link.kind === 'docs') {
      const [slug, anchor] = link.href.replace('/docs/', '').split('#');
      if (!validSlugs.has(slug)) {
        findings.push({ ...base, severity: 'HIGH', status: 'BROKEN_SLUG', slug });
      } else if (anchor && !anchorOk(anchor, slugToFile.get(slug))) {
        findings.push({ ...base, severity: 'HIGH', status: 'BROKEN_ANCHOR', slug, anchor });
      }
    } else if (link.kind === 'category') {
      const [slug] = link.href.replace('/category/', '').split('#');
      if (!validCategories.has(slug)) {
        findings.push({ ...base, severity: 'HIGH', status: 'BROKEN_CATEGORY', slug });
      }
    } else if (link.kind === 'static') {
      const [pagePath] = link.href.split('#');
      if (!KNOWN_STATIC.has(pagePath)) {
        findings.push({ ...base, severity: 'HIGH', status: 'BROKEN_STATIC' });
      }
    }
  }
}

const highCount = findings.filter((f) => f.severity === 'HIGH').length;
const infoCount = findings.filter((f) => f.severity === 'INFO').length;
const byStatus = {};
for (const f of findings) byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;

const result = {
  meta: {
    generated_at: new Date().toISOString(),
    tool: 'check-links',
    scope,
    valid_slugs: validSlugs.size,
  },
  summary: {
    files_scanned: targets.length,
    links_checked: linksChecked,
    HIGH: highCount,
    INFO: infoCount,
    by_status: byStatus,
  },
  findings,
};

// --- Step 6: 出力 ---
function buildMarkdownReport(r) {
  const out = [];
  out.push('# 内部リンク監査レポート');
  out.push('');
  out.push(`- 生成: ${r.meta.generated_at}`);
  out.push(`- スコープ: ${r.meta.scope}`);
  out.push(`- 走査ファイル: ${r.summary.files_scanned}`);
  out.push(`- チェックしたリンク: ${r.summary.links_checked}`);
  out.push(`- リンク切れ（HIGH）: ${r.summary.HIGH}`);
  out.push(`- プレースホルダ（INFO）: ${r.summary.INFO}`);
  out.push('');

  const high = r.findings.filter((f) => f.severity === 'HIGH');
  if (high.length === 0) {
    out.push('## リンク切れ');
    out.push('');
    out.push('リンク切れはありません。');
    out.push('');
  } else {
    out.push('## リンク切れ（要修正）');
    out.push('');
    const grouped = {};
    for (const f of high) (grouped[f.file] ??= []).push(f);
    for (const [file, items] of Object.entries(grouped)) {
      out.push(`### ${file}`);
      out.push('');
      for (const f of items) {
        const detail =
          f.status === 'BROKEN_ANCHOR'
            ? `${f.status} (slug=${f.slug}, #${f.anchor})`
            : f.status;
        out.push(`- L${f.line} \`${detail}\` — ${f.href}`);
      }
      out.push('');
    }
  }

  const info = r.findings.filter((f) => f.severity === 'INFO');
  if (info.length > 0) {
    out.push('## プレースホルダ（未発売・対応不要）');
    out.push('');
    const grouped = {};
    for (const f of info) (grouped[f.file] ??= []).push(f);
    for (const [file, items] of Object.entries(grouped)) {
      out.push(`### ${file}`);
      out.push('');
      for (const f of items) out.push(`- L${f.line} — ${f.href}`);
      out.push('');
    }
  }

  return out.join('\n') + '\n';
}

if (reportDir) {
  fs.mkdirSync(reportDir, { recursive: true });
  const ts = result.meta.generated_at.replace(/[:.]/g, '-');
  fs.writeFileSync(
    path.join(reportDir, `audit-${ts}.json`),
    JSON.stringify(result, null, 2),
  );
  fs.writeFileSync(path.join(reportDir, 'latest-report.md'), buildMarkdownReport(result));
  console.log(`レポート出力: ${reportDir}`);
}

if (jsonOut) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`\n🔍 内部リンクチェック（scope=${scope}）`);
  console.log(`   走査ファイル: ${targets.length}`);
  console.log(`   チェックしたリンク: ${linksChecked}`);
  console.log(`   有効スラッグ: ${validSlugs.size}\n`);

  if (highCount === 0) {
    console.log('✅ リンク切れはありません。');
  } else {
    console.log(`❌ リンク切れ: ${highCount} 件\n`);
    const grouped = {};
    for (const f of findings.filter((x) => x.severity === 'HIGH')) {
      (grouped[f.file] ??= []).push(f);
    }
    for (const [file, items] of Object.entries(grouped)) {
      console.log(`  📄 ${file}`);
      for (const f of items) {
        const detail =
          f.status === 'BROKEN_ANCHOR' ? `${f.status} (#${f.anchor})` : f.status;
        console.log(`     L${f.line}: [${detail}] ${f.href}`);
      }
      console.log('');
    }
  }

  if (infoCount > 0) {
    console.log(`ℹ️  プレースホルダ（未発売・対応不要）: ${infoCount} 件`);
  }
  console.log('');
}

process.exit(highCount > 0 ? 1 : 0);

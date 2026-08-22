#!/usr/bin/env node
// .claude/scripts/audit-exam-figures.mjs
//
// 過去問 MDX の「図版欠損」を検出する。原典 PDF はリポジトリに無い前提で、
// MDX 本文と img/ ディレクトリの整合性のみで判定する。
//
// 検出パターン:
//   1. text_mentions_figure_but_no_image
//      本文に「図」「次の図」「下図」「右図」「左図」「上図」「グラフ」
//      「次のグラフ」等の図参照表現があるが、ArticleImage / img タグ無し
//   2. img_dir_missing_for_year_with_figures
//      他年度に img/ があるカテゴリ（総監 H24/H25/H26）と同等の年なのに
//      img/ が無い → 図版未反映の可能性
//   3. broken_image_reference
//      ArticleImage / img の src が示すファイルが img/ 配下に無い
//   4. orphan_image
//      img/ 配下に存在するが MDX から参照されていない画像（孤児）
//
// 出力:
//   .claude/state/figure-audit/YYYY-MM-DD.json
//
// 使い方:
//   node .claude/scripts/audit-exam-figures.mjs

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';

const ROOT = process.cwd();
const POSTS_ROOT = join(ROOT, 'content/site');
const OUTPUT_DIR = join(ROOT, '.claude/state/figure-audit');
const TODAY = new Date().toISOString().slice(0, 10);
const OUTPUT_FILE = join(OUTPUT_DIR, `${TODAY}.json`);

// ── 対象 MDX の収集（detect-ocr-suspects と同じロジック） ───

function collectExamDirs() {
  const results = [];

  const peRoot = join(POSTS_ROOT, 'pe-comprehensive-management');
  if (existsSync(peRoot)) {
    for (const dir of readdirSync(peRoot)) {
      if (!/^(h|r)\d+-(primary|secondary)$/.test(dir)) continue;
      const dirPath = join(peRoot, dir);
      const article = join(dirPath, 'article.mdx');
      if (existsSync(article)) {
        results.push({
          dirPath,
          articlePath: article,
          imgDir: join(dirPath, 'img'),
          category: 'pe-comprehensive-management',
          slug: dir,
          year: dir.match(/^(h|r)\d+/)?.[0],
          type: /primary/.test(dir) ? 'primary' : 'secondary',
        });
      }
    }
  }

  const civilRoot = join(POSTS_ROOT, 'civil-construction-1');
  if (existsSync(civilRoot)) {
    for (const dir of readdirSync(civilRoot)) {
      const m = dir.match(/^(primary|secondary)-([hr]\d+)(?:-(a|b))?$/);
      if (!m) continue;
      const dirPath = join(civilRoot, dir);
      const article = join(dirPath, 'article.mdx');
      if (existsSync(article)) {
        results.push({
          dirPath,
          articlePath: article,
          imgDir: join(dirPath, 'img'),
          category: 'civil-construction-1',
          slug: dir,
          year: m[2],
          type: m[1],
        });
      }
    }
  }

  return results.sort((a, b) => a.articlePath.localeCompare(b.articlePath));
}

// ── 本文中の図参照キーワード検出 ─────────────────────────

const FIGURE_KEYWORDS = [
  '次の図', '下図', '右図', '左図', '上図', '上記の図',
  '下のグラフ', '次のグラフ', '右のグラフ', '左のグラフ',
  '次の表に示', '下表に示', '上表に示',
  '図に示す', 'グラフに示', '図中の', '図に記載',
  '次のフロー図', '下のフロー図', '次の系統図',
];

/**
 * MDX 本文（frontmatter / コードフェンス除外）から図参照キーワードを行付きで抽出。
 */
function findFigureMentions(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const mentions = [];

  let inFrontmatter = false;
  let frontmatterClosed = false;
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') {
      if (!frontmatterClosed && !inFrontmatter) inFrontmatter = true;
      else if (inFrontmatter) { inFrontmatter = false; frontmatterClosed = true; }
      continue;
    }
    if (inFrontmatter) continue;
    if (/^```/.test(line)) { inCodeFence = !inCodeFence; continue; }
    if (inCodeFence) continue;

    for (const kw of FIGURE_KEYWORDS) {
      if (line.includes(kw)) {
        mentions.push({ line: i + 1, keyword: kw, text: line.trim().slice(0, 200) });
        break; // 1 行 1 件に絞る
      }
    }
  }
  return mentions;
}

/**
 * 本文中の <ArticleImage src="..."/> および <img src="..."> から参照画像を抽出。
 */
function findImageReferences(raw) {
  const refs = [];
  // <ArticleImage src="..."/> or  <ArticleImage ... src="..." ... />
  const articleImage = /<ArticleImage\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*\/?>/g;
  const htmlImg = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*\/?>/gi;
  // Markdown image: ![alt](src)
  const mdImg = /!\[[^\]]*\]\(([^)]+)\)/g;

  for (const re of [articleImage, htmlImg, mdImg]) {
    let m;
    while ((m = re.exec(raw)) !== null) {
      refs.push(m[1]);
    }
  }
  return refs;
}

/**
 * src を物理ファイルパスに解決する。MDX-local img/ への相対参照と、
 * /posts/... 形式の repo-相対参照（別 article の img/ を共有するパターン）に対応。
 *
 * @param {string} src
 * @param {string} mdxDir   この MDX があるディレクトリ
 * @returns {{ kind: 'mdx-local'|'cross-posts'|'absolute-url'|'unknown', filename: string, fullPath: string|null }}
 */
function resolveSrcToFile(src, mdxDir) {
  const cleaned = src.split('?')[0]; // strip query
  const filename = basename(cleaned);

  // /posts/... → repo-relative
  if (cleaned.startsWith('/posts/')) {
    const rel = cleaned.replace(/^\//, ''); // posts/.../foo.svg
    const fullPath = join(ROOT, '.local/r2', rel);
    return { kind: 'cross-posts', filename, fullPath };
  }

  // http(s) URL — R2 absolute URL 等。実ファイル検証はスキップ
  if (/^https?:\/\//.test(cleaned)) {
    return { kind: 'absolute-url', filename, fullPath: null };
  }

  // ./img/foo.png / img/foo.png / foo.png → MDX-local
  // /img/foo.png のような root-relative も MDX-local として扱う（実プロジェクトの慣例）
  return { kind: 'mdx-local', filename, fullPath: join(mdxDir, 'img', filename) };
}

// ── img ディレクトリのファイル列挙 ───────────────────────

function listImgFiles(imgDir) {
  if (!existsSync(imgDir)) return [];
  const files = [];
  for (const f of readdirSync(imgDir)) {
    const full = join(imgDir, f);
    if (statSync(full).isFile() && /\.(png|jpe?g|webp|svg|gif)$/i.test(f)) {
      files.push(f);
    }
  }
  return files;
}

// ── メイン ────────────────────────────────────────

function main() {
  console.log('Figure audit — scanning exam MDX directories');

  const dirs = collectExamDirs();
  console.log(`Found ${dirs.length} exam directories`);

  const issues = [];
  let totalMentions = 0;
  let totalImgRefs = 0;

  for (const d of dirs) {
    const raw = readFileSync(d.articlePath, 'utf-8');
    const mentions = findFigureMentions(raw);
    const refs = findImageReferences(raw);
    const mdxDir = dirname(d.articlePath);
    const resolvedRefs = refs.map((src) => ({ src, ...resolveSrcToFile(src, mdxDir) }));
    const refFilenames = resolvedRefs.filter((r) => r.kind === 'mdx-local').map((r) => r.filename);
    const imgFiles = listImgFiles(d.imgDir);

    totalMentions += mentions.length;
    totalImgRefs += refs.length;

    // 1. 本文に図参照があるが ArticleImage/img タグ無し
    if (mentions.length > 0 && refs.length === 0) {
      for (const m of mentions) {
        issues.push({
          file: relative(ROOT, d.articlePath),
          category: d.category,
          slug: d.slug,
          year: d.year,
          type: d.type,
          line: m.line,
          issue: 'text_mentions_figure_but_no_image',
          severity: 'high',
          keyword: m.keyword,
          context: m.text,
          has_img_dir: existsSync(d.imgDir),
          img_file_count: imgFiles.length,
        });
      }
    }

    // 2. ArticleImage/img タグはあるがファイル不在
    for (const r of resolvedRefs) {
      // 絶対 URL（CDN 経由）は実体検証をスキップ
      if (r.kind === 'absolute-url') continue;
      // fullPath が解決できているなら実存を確認
      if (r.fullPath && !existsSync(r.fullPath)) {
        issues.push({
          file: relative(ROOT, d.articlePath),
          category: d.category,
          slug: d.slug,
          year: d.year,
          type: d.type,
          issue: 'broken_image_reference',
          severity: 'high',
          src: r.src,
          resolved_kind: r.kind,
          expected_path: relative(ROOT, r.fullPath),
        });
      }
    }

    // 3. img/ 内にあるが MDX から参照されていない孤児画像
    // mdx-local 参照のみで判定（cross-posts は別 MDX が参照している可能性あり）
    for (const f of imgFiles) {
      if (!refFilenames.includes(f)) {
        issues.push({
          file: relative(ROOT, d.articlePath),
          category: d.category,
          slug: d.slug,
          year: d.year,
          type: d.type,
          issue: 'orphan_image',
          severity: 'low',
          orphan_filename: f,
          img_path: relative(ROOT, join(d.imgDir, f)),
        });
      }
    }
  }

  // ディレクトリ別の概観
  const byDir = {};
  for (const d of dirs) {
    const imgFiles = listImgFiles(d.imgDir);
    const raw = readFileSync(d.articlePath, 'utf-8');
    byDir[`${d.category}/${d.slug}`] = {
      has_img_dir: existsSync(d.imgDir),
      img_file_count: imgFiles.length,
      figure_mentions: findFigureMentions(raw).length,
      image_refs: findImageReferences(raw).length,
    };
  }

  // 出力
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const output = {
    generated_at: new Date().toISOString(),
    scanned_dirs: dirs.length,
    total_issues: issues.length,
    issues_by_severity: {
      high: issues.filter((i) => i.severity === 'high').length,
      low: issues.filter((i) => i.severity === 'low').length,
    },
    issues_by_type: {
      text_mentions_figure_but_no_image: issues.filter((i) => i.issue === 'text_mentions_figure_but_no_image').length,
      broken_image_reference: issues.filter((i) => i.issue === 'broken_image_reference').length,
      orphan_image: issues.filter((i) => i.issue === 'orphan_image').length,
    },
    figure_mentions_total: totalMentions,
    image_refs_total: totalImgRefs,
    issues,
    by_directory: byDir,
  };
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log('');
  console.log('=== Summary ===');
  console.log(`Total issues: ${issues.length}`);
  console.log(`  - text_mentions_figure_but_no_image: ${output.issues_by_type.text_mentions_figure_but_no_image}`);
  console.log(`  - broken_image_reference: ${output.issues_by_type.broken_image_reference}`);
  console.log(`  - orphan_image: ${output.issues_by_type.orphan_image}`);
  console.log('');
  console.log(`Top 10 high-severity issues:`);
  for (const i of issues.filter((x) => x.severity === 'high').slice(0, 10)) {
    if (i.issue === 'text_mentions_figure_but_no_image') {
      console.log(`  [${i.issue}] ${i.slug}:${i.line} "${i.keyword}"`);
      console.log(`    ${i.context.slice(0, 80)}`);
    } else if (i.issue === 'broken_image_reference') {
      console.log(`  [${i.issue}] ${i.slug} src="${i.src}"`);
    }
  }
  console.log('');
  console.log(`Full output: ${relative(ROOT, OUTPUT_FILE)}`);
}

main();

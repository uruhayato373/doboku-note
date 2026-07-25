#!/usr/bin/env node
/**
 * Cross-Exam Keyword Index ビルダー
 *
 * 全 MDX の frontmatter `exams` 配列を走査し、試験別インデックスと
 * 真のクロス試験エントリ (exams.length >= 2) を src/config/cross-exam-keywords.json に出力する。
 *
 * 参照: .claude/knowledge/reference/data-storage-decision.md
 *
 * Usage:
 *   node .claude/scripts/build-cross-exam-keyword-index.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, basename, extname } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const POSTS_ROOT = join(ROOT, '.local/r2/posts');
const OUT_PATH = join(ROOT, 'src/config/cross-exam-keywords.json');

// ── MDX 列挙 ────────────────────────────────────────────────────

function walkMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMdx(p));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.mdx') {
      out.push(p);
    }
  }
  return out;
}

// ── slug 生成 ──────────────────────────────────────────────────
// `.local/r2/posts/<category>/path/to/file.mdx` → `<category>-path-to-file`
// `.local/r2/posts/<category>/dir/article.mdx` → `<category>-dir` (Convention B)

function toSlug(filePath) {
  const rel = relative(POSTS_ROOT, filePath);
  const withoutExt = rel.replace(/\.mdx$/i, '');
  const parts = withoutExt.split(/[\\/]/).filter((s) => s && s !== 'article');
  return parts.join('-');
}

// ── メイン処理 ─────────────────────────────────────────────────

function main() {
  const files = walkMdx(POSTS_ROOT);
  console.log(`[cross-exam] ${files.length} MDX を走査`);

  const byExam = {}; // { examId: [ entry, ... ] }
  const crossExamEntries = []; // exams.length >= 2
  const summary = {
    total_mdx_files: files.length,
    with_exams_field: 0,
    cross_exam_count: 0,
    by_exam: {},
  };

  for (const filePath of files) {
    let parsed;
    try {
      const raw = readFileSync(filePath, 'utf8');
      parsed = matter(raw);
    } catch (e) {
      console.error(`[cross-exam] skip (parse error): ${filePath} ${e.message}`);
      continue;
    }

    const data = parsed.data || {};
    const exams = Array.isArray(data.exams) ? data.exams.filter((e) => typeof e === 'string') : [];
    if (exams.length === 0) continue;

    summary.with_exams_field += 1;

    const slug = toSlug(filePath);
    const entry = {
      slug,
      title: data.title || null,
      category: data.category || null,
      group: data.group || null,
      tags: Array.isArray(data.tags) ? data.tags : [],
      sections: data.sections && typeof data.sections === 'object' ? data.sections : null,
      exams,
      source_path: relative(ROOT, filePath),
    };

    for (const examId of exams) {
      if (!byExam[examId]) byExam[examId] = [];
      byExam[examId].push(entry);
      summary.by_exam[examId] = (summary.by_exam[examId] || 0) + 1;
    }

    if (exams.length >= 2) {
      crossExamEntries.push(entry);
      summary.cross_exam_count += 1;
    }
  }

  // スラッグ順でソート (決定論的出力)
  for (const examId of Object.keys(byExam)) {
    byExam[examId].sort((a, b) => a.slug.localeCompare(b.slug));
  }
  crossExamEntries.sort((a, b) => a.slug.localeCompare(b.slug));

  const output = {
    version: 1,
    generated_at: new Date().toISOString(),
    summary,
    by_exam: byExam,
    cross_exam_entries: crossExamEntries,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(`[cross-exam] ✓ ${relative(ROOT, OUT_PATH)} に出力`);
  console.log(`  total: ${summary.total_mdx_files}`);
  console.log(`  with exams field: ${summary.with_exams_field}`);
  console.log(`  cross-exam (exams.length >= 2): ${summary.cross_exam_count}`);
  for (const [examId, count] of Object.entries(summary.by_exam)) {
    console.log(`  ${examId}: ${count}`);
  }
}

main();

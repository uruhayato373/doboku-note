#!/usr/bin/env node
/**
 * Keyword Summaries ビルダー（audit-exam-mapping skill 用事前資産）
 *
 * pe-comprehensive-management 配下の `group: keyword` MDX を走査し、
 * slug → { title, section, tags, definition } のマップを生成する。
 * `exam-keyword-mapping-auditor` agent の Stage 2（候補発見）で、
 * 692 件の本文を都度 Read せずに「候補ショートリスト化」できるようにする。
 *
 * ── 出力スキーマ ──
 *   {
 *     version, generated_at,
 *     summary: { total, skipped },
 *     keywords: {
 *       "dcf-method": {
 *         title: "DCF法",
 *         section: "2.1",
 *         tags: ["keyword"],
 *         definition: "DCF 法（Discounted Cash Flow 法）とは…"
 *       }
 *     }
 *   }
 *
 * Usage:
 *   node .claude/scripts/build-keyword-summaries.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const PE_ROOT = join(ROOT, 'content/site/pe-comprehensive-management');
const OUT_PATH = join(ROOT, '.claude/state/keyword-summaries.json');

const DEFINITION_MAX_CHARS = 200;

function findArticleMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const articlePath = join(dir, entry.name, 'article.mdx');
    if (existsSync(articlePath)) out.push({ slug: entry.name, path: articlePath });
  }
  return out;
}

function extractDefinition(body) {
  // 候補 H2 パターン（出現頻度順）: 「○○とは」「定義」「概要」「○○の定義」「○○の概要」
  const HEADING_PATTERNS = [
    /^##\s+[^\n]*?とは\s*\n+([\s\S]+?)(?=\n##\s|\n<|$)/m,
    /^##\s+定義\s*\n+([\s\S]+?)(?=\n##\s|\n<|$)/m,
    /^##\s+概要\s*\n+([\s\S]+?)(?=\n##\s|\n<|$)/m,
    /^##\s+[^\n]*?の定義\s*\n+([\s\S]+?)(?=\n##\s|\n<|$)/m,
    /^##\s+[^\n]*?の概要\s*\n+([\s\S]+?)(?=\n##\s|\n<|$)/m,
  ];
  let captured = null;
  for (const re of HEADING_PATTERNS) {
    const m = body.match(re);
    if (m) {
      captured = m[1];
      break;
    }
  }
  if (!captured) return '';
  let text = captured.split(/\n\s*\n/)[0].trim();
  text = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length > DEFINITION_MAX_CHARS) text = text.slice(0, DEFINITION_MAX_CHARS - 1) + '…';
  return text;
}

function main() {
  const entries = findArticleMdx(PE_ROOT);
  const keywords = {};
  let skipped = 0;

  for (const { slug, path } of entries) {
    let parsed;
    try {
      parsed = matter(readFileSync(path, 'utf8'));
    } catch (e) {
      console.warn(`[keyword-summaries] parse failed: ${slug}: ${e.message}`);
      continue;
    }
    const { data, content } = parsed;

    if (data.group !== 'keyword') {
      skipped++;
      continue;
    }

    keywords[slug] = {
      title: typeof data.title === 'string' ? data.title : '',
      section: typeof data.section === 'string' ? data.section : '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      definition: extractDefinition(content),
    };
  }

  const sortedKeywords = Object.fromEntries(Object.entries(keywords).sort(([a], [b]) => a.localeCompare(b)));

  const output = {
    version: 1,
    generated_at: new Date().toISOString(),
    summary: {
      total: Object.keys(sortedKeywords).length,
      skipped_non_keyword: skipped,
      empty_definition: Object.values(sortedKeywords).filter((k) => !k.definition).length,
    },
    keywords: sortedKeywords,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(`[keyword-summaries] ✓ ${relative(ROOT, OUT_PATH)}`);
  console.log(`  total keywords: ${output.summary.total}`);
  console.log(`  skipped (not group=keyword): ${output.summary.skipped_non_keyword}`);
  console.log(`  empty definition: ${output.summary.empty_definition}`);
}

main();

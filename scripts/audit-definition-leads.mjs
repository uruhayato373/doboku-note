// scripts/audit-definition-leads.mjs
//
// 強調スニペット（Featured Snippet）取得のため、pe-comprehensive-management
// の全 keyword ページで「本文先頭に 40〜200 字の独立した定義段落を置く」
// 原則からの逸脱を監査する。
//
// 逸脱判定:
//   - 本文先頭が H2（`## `）で始まる（リード段落なし）
//   - 本文先頭段落が空行
//   - 本文先頭段落が 40 字未満（情報量不足）
//   - 本文先頭段落が 200 字超（冗長・スニペット対象外）
//   - 本文先頭段落が「{用語}とは〜」パターンに合致しない（定義文として認識されにくい）
//
// 出力: .claude/state/definition-audit.json
//   {
//     "summary": {
//       "total": 649,
//       "compliant": 600,
//       "deviating": 49,
//       "deviationRate": 0.075,
//       "recommendation": "ok" | "needs-rewrite"
//     },
//     "items": [ { slug, issues: [...], firstParagraph: "..." }, ... ]
//   }
//
// 逸脱率 20% 以上のとき `recommendation: 'needs-rewrite'` を返し、
// keyword-rewriter エージェントへの再発注を示唆する。
//
// 使い方:
//   node scripts/audit-definition-leads.mjs

import { readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import matter from 'gray-matter';
import { readMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';

const BASE = 'content/site/pe-comprehensive-management';
const OUTPUT = '.claude/state/definition-audit.json';
const MIN_LEN = 40;
const MAX_LEN = 200;
const DEVIATION_THRESHOLD = 0.20;

function listArticles() {
  const out = [];
  for (const slug of readdirSync(BASE)) {
    const dir = join(BASE, slug);
    try { if (!statSync(dir).isDirectory()) continue; } catch { continue; }
    const file = join(dir, 'article.mdx');
    try { statSync(file); } catch { continue; }
    out.push({ slug, file });
  }
  return out;
}

function extractFirstParagraph(content) {
  // 想定構造: `# タイトル` → `## {用語}とは` → リード段落 ...
  // H1 と先頭の H2 をスキップして、最初のリード段落を取る。
  // もし H1 直後にリード段落があればそれを取る（どちらの構造も許容）。
  const lines = content.split(/\r?\n/);
  let i = 0;
  let skippedHeadings = 0;
  const skipBlanks = () => { while (i < lines.length && lines[i].trim() === '') i++; };
  skipBlanks();
  // Skip up to 2 consecutive leading headings (H1 + 先頭 H2)
  while (skippedHeadings < 2 && i < lines.length && /^#{1,2}\s/.test(lines[i])) {
    i++;
    skipBlanks();
    skippedHeadings++;
    // Don't skip further headings once we hit a non-heading line
    if (i < lines.length && !/^#{1,6}\s/.test(lines[i])) break;
  }
  // If we land on H3 or deeper (or further H2), treat as heading-only (no lead)
  if (i < lines.length && /^#{3,6}\s/.test(lines[i])) {
    return { paragraph: '', startsWithHeading: true };
  }
  if (i >= lines.length) {
    return { paragraph: '', startsWithHeading: true };
  }
  const buf = [];
  while (i < lines.length && lines[i].trim() !== '' && !/^#{1,6}\s/.test(lines[i])) {
    buf.push(lines[i]);
    i++;
  }
  const paragraph = buf.join(' ').replace(/\s+/g, ' ').trim();
  return { paragraph, startsWithHeading: false };
}

function stripMarkdown(text) {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\{[^}]+\}/g, '')
    .trim();
}

function auditPage({ slug, file }) {
  const { raw } = readMdxFile(file);
  const parsed = matter(raw);
  const fm = parsed.data || {};
  if (fm.published === false) return null;
  if (fm.group !== 'keyword') return null;

  const title = (fm.title || '').trim();
  const { paragraph, startsWithHeading } = extractFirstParagraph(parsed.content || '');
  const cleaned = stripMarkdown(paragraph);

  const issues = [];
  if (startsWithHeading) {
    issues.push('starts-with-heading');
  } else if (!cleaned) {
    issues.push('empty-first-paragraph');
  } else {
    if (cleaned.length < MIN_LEN) issues.push(`too-short(${cleaned.length})`);
    if (cleaned.length > MAX_LEN) issues.push(`too-long(${cleaned.length})`);
    // Title の主要部分で始まっているかチェック（「〜とは」パターン）
    const titleKey = title.split(/[（\(]/)[0].trim();
    if (titleKey && cleaned.length >= MIN_LEN) {
      const startsWithTitle = cleaned.startsWith(titleKey) || cleaned.includes(`${titleKey}とは`);
      if (!startsWithTitle) issues.push('missing-title-prefix');
    }
  }
  return { slug, title, length: cleaned.length, firstParagraph: cleaned.slice(0, 200), issues };
}

function main() {
  const articles = listArticles();
  const results = [];
  for (const a of articles) {
    const r = auditPage(a);
    if (r) results.push(r);
  }
  const deviating = results.filter(r => r.issues.length > 0);
  const compliant = results.filter(r => r.issues.length === 0);
  const total = results.length;
  const deviationRate = total === 0 ? 0 : deviating.length / total;

  const issueBreakdown = {};
  for (const r of deviating) {
    for (const i of r.issues) {
      const key = i.replace(/\(.*\)/, '');
      issueBreakdown[key] = (issueBreakdown[key] || 0) + 1;
    }
  }

  const summary = {
    total,
    compliant: compliant.length,
    deviating: deviating.length,
    deviationRate: Math.round(deviationRate * 10000) / 10000,
    issueBreakdown,
    recommendation: deviationRate >= DEVIATION_THRESHOLD ? 'needs-rewrite' : 'ok',
    threshold: DEVIATION_THRESHOLD,
    auditedAt: new Date().toISOString(),
  };

  const output = { summary, items: deviating };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(output, null, 2));

  console.log('=== Definition Lead Audit ===');
  console.log(`Total: ${total}`);
  console.log(`Compliant: ${compliant.length} (${Math.round((1 - deviationRate) * 100)}%)`);
  console.log(`Deviating: ${deviating.length} (${Math.round(deviationRate * 100)}%)`);
  console.log(`Recommendation: ${summary.recommendation}`);
  console.log(`\nIssue breakdown:`);
  for (const [key, count] of Object.entries(issueBreakdown)) {
    console.log(`  ${key}: ${count}`);
  }
  if (deviating.length > 0) {
    console.log(`\n--- first 5 deviating ---`);
    for (const r of deviating.slice(0, 5)) {
      console.log(`[${r.slug}] issues: ${r.issues.join(', ')}`);
      console.log(`  title: ${r.title}`);
      console.log(`  lead (${r.length}): ${r.firstParagraph.slice(0, 150)}`);
    }
  }
  console.log(`\nOutput: ${OUTPUT}`);
}

main();

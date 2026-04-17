#!/usr/bin/env node
/**
 * バッチ承認スクリプト
 *
 * reviewStatus: needs-review のキーワードページを一括で approved に変更する。
 * quality-scores.json のスコアに基づき、閾値以上のページのみを対象とする。
 *
 * Usage:
 *   node scripts/batch-approve.mjs --dry-run                # 対象リスト表示のみ
 *   node scripts/batch-approve.mjs --dry-run --threshold 2.5 # 閾値指定
 *   node scripts/batch-approve.mjs --spot-check 5           # 5件をランダム表示して確認
 *   node scripts/batch-approve.mjs --sync                   # state.json にリライト済みページを同期
 *   node scripts/batch-approve.mjs                          # 実行（デフォルト閾値 2.5）
 *   node scripts/batch-approve.mjs --threshold 2.0          # 閾値 2.0 で実行
 *   node scripts/batch-approve.mjs --section 4              # セクション 4.x のみ
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { transformMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import {
  readState, writeState, updatePageState,
  readScores,
} from '../.claude/skills/content/quality-cycle/scripts/lib/quality-state.mjs';

const POSTS_DIR = '.local/r2/posts/pe-comprehensive-management';

// ── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const syncMode = args.includes('--sync');
const thresholdIdx = args.indexOf('--threshold');
const threshold = thresholdIdx >= 0 ? parseFloat(args[thresholdIdx + 1]) : 2.5;
const spotCheckIdx = args.indexOf('--spot-check');
const spotCheckCount = spotCheckIdx >= 0 ? parseInt(args[spotCheckIdx + 1], 10) : 0;
const sectionIdx = args.indexOf('--section');
const sectionFilter = sectionIdx >= 0 ? args[sectionIdx + 1] : null;

// ── ヘルパー ────────────────────────────────────────────────────────────────

function getKeywordPages() {
  const pages = [];
  if (!existsSync(POSTS_DIR)) return pages;
  for (const entry of readdirSync(POSTS_DIR)) {
    const mdxPath = join(POSTS_DIR, entry, 'article.mdx');
    if (!existsSync(mdxPath)) continue;
    const content = readFileSync(mdxPath, 'utf8');
    if (!content.includes('group: keyword')) continue;

    // Extract frontmatter fields
    const reviewMatch = content.match(/reviewStatus:\s*(.+)/);
    const sectionMatch = content.match(/section:\s*'?([^'\n]+)'?/);
    const rewrittenMatch = content.match(/lastRewrittenAt:\s*'?([^'\n]+)'?/);

    pages.push({
      slug: entry,
      path: mdxPath,
      reviewStatus: reviewMatch ? reviewMatch[1].trim() : null,
      section: sectionMatch ? sectionMatch[1].trim() : null,
      lastRewrittenAt: rewrittenMatch ? rewrittenMatch[1].trim() : null,
    });
  }
  return pages;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Sync Mode ───────────────────────────────────────────────────────────────

if (syncMode) {
  console.log('=== State Sync Mode ===\n');
  const pages = getKeywordPages();
  const state = readState();
  let added = 0;

  for (const page of pages) {
    if (!page.lastRewrittenAt) continue;
    if (state.pages[page.slug]) continue; // already tracked

    updatePageState(state, page.slug, page.reviewStatus === 'approved' ? 'approved' : 'rewritten', {
      action: page.reviewStatus === 'approved' ? 'approved' : 'rewritten',
      wave: 'backfill',
      date: new Date(page.lastRewrittenAt).toISOString(),
    });
    added++;
  }

  if (added > 0) {
    if (dryRun) {
      console.log(`[dry-run] Would add ${added} pages to state.json`);
    } else {
      writeState(state);
      console.log(`Added ${added} pages to quality-cycle-state.json`);
    }
  } else {
    console.log('All rewritten pages are already tracked in state.');
  }
  process.exit(0);
}

// ── Approve Mode ────────────────────────────────────────────────────────────

console.log('=== Batch Approve ===\n');
console.log(`Threshold: weighted >= ${threshold}`);
if (sectionFilter) console.log(`Section filter: ${sectionFilter}.x`);
console.log();

const allPages = getKeywordPages();
const scores = readScores();

// Filter: needs-review + score >= threshold + optional section filter
const candidates = allPages.filter(p => {
  if (p.reviewStatus !== 'needs-review') return false;
  const scoreEntry = scores.pages?.[p.slug];
  if (!scoreEntry || scoreEntry.weighted < threshold) return false;
  if (sectionFilter && p.section && !p.section.startsWith(sectionFilter)) return false;
  return true;
});

candidates.sort((a, b) => {
  const sa = scores.pages[a.slug]?.weighted || 0;
  const sb = scores.pages[b.slug]?.weighted || 0;
  return sb - sa; // highest score first
});

console.log(`Found ${candidates.length} pages eligible for approval\n`);

if (candidates.length === 0) {
  console.log('No pages to approve.');
  process.exit(0);
}

// Spot check mode
if (spotCheckCount > 0) {
  const sample = shuffle([...candidates]).slice(0, spotCheckCount);
  console.log(`=== Spot Check (${sample.length} random pages) ===\n`);
  for (const p of sample) {
    const w = scores.pages[p.slug]?.weighted?.toFixed(2) || '?';
    console.log(`  ${p.slug} (weighted: ${w})`);
    console.log(`    File: ${p.path}`);
    console.log(`    URL:  http://localhost:3020/docs/pe-comprehensive-management-${p.slug}`);
    console.log();
  }
  if (dryRun) {
    console.log('[dry-run] Review the pages above, then run without --dry-run to approve.');
    process.exit(0);
  }
}

// Dry run: show list
if (dryRun) {
  console.log('=== Dry Run: Pages to approve ===\n');
  const bySection = {};
  for (const p of candidates) {
    const sec = p.section ? p.section.split('.')[0] : '?';
    if (!bySection[sec]) bySection[sec] = [];
    bySection[sec].push(p);
  }
  for (const [sec, pages] of Object.entries(bySection).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`Section ${sec}.x: ${pages.length} pages`);
    for (const p of pages.slice(0, 3)) {
      const w = scores.pages[p.slug]?.weighted?.toFixed(2) || '?';
      console.log(`  ${p.slug} (${w})`);
    }
    if (pages.length > 3) console.log(`  ... and ${pages.length - 3} more`);
    console.log();
  }
  console.log(`Total: ${candidates.length} pages`);
  console.log('\nRun without --dry-run to execute.');
  process.exit(0);
}

// Execute approval
const state = readState();
let approved = 0;
let failed = 0;

for (const p of candidates) {
  const changed = transformMdxFile(p.path, (raw) => {
    return raw.replace(/reviewStatus:\s*needs-review/, 'reviewStatus: approved');
  });

  if (changed) {
    updatePageState(state, p.slug, 'approved', {
      wave: 'G-7-batch',
      weighted: scores.pages[p.slug]?.weighted,
      method: 'batch-approve',
    });
    approved++;
  } else {
    console.warn(`  [SKIP] ${p.slug}: no change made (reviewStatus pattern not found)`);
    failed++;
  }
}

writeState(state);

console.log(`\n=== Results ===`);
console.log(`Approved: ${approved}`);
if (failed > 0) console.log(`Skipped:  ${failed}`);
console.log(`\nState updated: .claude/state/quality-cycle-state.json`);

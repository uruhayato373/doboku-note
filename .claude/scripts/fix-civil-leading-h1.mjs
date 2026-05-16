#!/usr/bin/env node
// .claude/scripts/fix-civil-leading-h1.mjs
//
// lint 2-1 HIGH 修正:
//   frontmatter 直後の `# H1` を削除（page.tsx が frontmatter.title から server-side 描画する）
//
// AdSense 不合格対策の追加施策 (2026-05-16)

import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE = resolve('.local/r2/posts/civil-construction-1');
const DRY_RUN = process.argv.includes('--dry-run');

function collectMdx(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      collectMdx(p, out);
    } else if (entry === 'article.mdx') {
      out.push(p);
    }
  }
  return out;
}

function stripLeadingH1(raw) {
  // frontmatter（--- ... ---）の直後にある最初の `# Heading` 行を削除
  const fmRe = /^---\n[\s\S]*?\n---\n+/;
  const fmMatch = raw.match(fmRe);
  if (!fmMatch) return { newRaw: raw, removed: 0 };

  const body = raw.slice(fmMatch[0].length);
  // 本文の最初の非空行が `# ...` ならそれを削除
  const h1Re = /^#\s+[^\n]+\n+/;
  const h1Match = body.match(h1Re);
  if (!h1Match) return { newRaw: raw, removed: 0 };

  const newBody = body.slice(h1Match[0].length);
  return { newRaw: fmMatch[0] + newBody, removed: 1 };
}

function main() {
  const files = collectMdx(BASE);
  let totalRemoved = 0;
  let filesChanged = 0;

  for (const file of files) {
    const { raw } = readMdxFile(file);
    const { newRaw, removed } = stripLeadingH1(raw);
    if (removed === 0) continue;
    const rel = file.replace(BASE + '/', '');
    if (DRY_RUN) {
      console.log(`[dry-run] ${rel}: would remove leading # H1`);
    } else {
      transformMdxFile(file, () => newRaw);
      console.log(`[removed] ${rel}: removed leading # H1`);
    }
    totalRemoved += removed;
    filesChanged++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files ${DRY_RUN ? 'would-change' : 'changed'}: ${filesChanged}`);
  console.log(`Leading # H1 ${DRY_RUN ? 'would-remove' : 'removed'}: ${totalRemoved}`);
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();

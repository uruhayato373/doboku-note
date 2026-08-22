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

const baseArg = process.argv.find((a) => a.startsWith('--base='));
const BASE = resolve(baseArg ? baseArg.slice('--base='.length) : 'content/site/civil-construction-1');
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
  // CRLF / LF どちらでも動くよう、行末の \r も trim 比較で吸収
  const lines = raw.split('\n');
  const trimmed = (s) => s.replace(/\r$/, '').trim();

  if (trimmed(lines[0]) !== '---') return { newRaw: raw, removed: 0 };

  // frontmatter の閉じ `---` を探す
  let fmEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (trimmed(lines[i]) === '---') { fmEnd = i; break; }
  }
  if (fmEnd === -1) return { newRaw: raw, removed: 0 };

  // body の最初の非空行を探す
  let firstContent = -1;
  for (let i = fmEnd + 1; i < lines.length; i++) {
    if (trimmed(lines[i]) !== '') { firstContent = i; break; }
  }
  if (firstContent === -1) return { newRaw: raw, removed: 0 };

  // `# ` で始まる H1 か?
  const firstLine = lines[firstContent].replace(/\r$/, '');
  if (!/^#\s+\S/.test(firstLine)) return { newRaw: raw, removed: 0 };

  // H1 行を削除（直後の空行も 1 行まで折りたたむ）
  lines.splice(firstContent, 1);
  if (firstContent < lines.length && trimmed(lines[firstContent]) === '') {
    lines.splice(firstContent, 1);
  }
  return { newRaw: lines.join('\n'), removed: 1 };
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

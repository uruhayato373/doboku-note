#!/usr/bin/env node
// .claude/scripts/fix-civil-simple-math-to-unicode.mjs
//
// lint 1-1 HIGH 修正の一部:
//   表セル内に簡単な KaTeX (`$\pm N$` `$\pm N.N$`) があると hasLongMath で HIGH 違反。
//   Unicode (±N, ±N.N) に置換すれば KaTeX 不要で同じ表現になる。
//
//   対象パターン:
//     $\pm 1.5$     → ±1.5
//     $\pm 2$       → ±2
//     $\pm 10$      → ±10
//     $\times$      → ×
//
//   primary-r06-a の表は本物の数式比較問題 (rho_t = m/V 等) なので
//   置換対象にならず温存される。
//
// AdSense 不合格対策の追加施策 (2026-05-16)

import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE = resolve('content/site/civil-construction-1');
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

function convertSimpleMath(raw) {
  let count = 0;
  let result = raw;
  // $\pm 1.5$ → ±1.5 / $\pm 2$ → ±2 など
  result = result.replace(/\$\\pm\s+(\d+(?:\.\d+)?)\$/g, (_m, n) => {
    count++;
    return `±${n}`;
  });
  // $\times$ → ×
  result = result.replace(/\$\\times\$/g, () => {
    count++;
    return '×';
  });
  return { newRaw: result, fixed: count };
}

function main() {
  const files = collectMdx(BASE);
  let totalFixed = 0;
  let filesChanged = 0;

  for (const file of files) {
    const { raw } = readMdxFile(file);
    const { newRaw, fixed } = convertSimpleMath(raw);
    if (fixed === 0) continue;
    const rel = file.replace(BASE + '/', '');
    if (DRY_RUN) {
      console.log(`[dry-run] ${rel}: would convert ${fixed} simple math`);
    } else {
      transformMdxFile(file, () => newRaw);
      console.log(`[fixed] ${rel}: converted ${fixed} simple math`);
    }
    totalFixed += fixed;
    filesChanged++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files ${DRY_RUN ? 'would-change' : 'changed'}: ${filesChanged}`);
  console.log(`Simple math ${DRY_RUN ? 'would-convert' : 'converted'}: ${totalFixed}`);
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();

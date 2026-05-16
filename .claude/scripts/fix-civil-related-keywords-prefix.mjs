#!/usr/bin/env node
// .claude/scripts/fix-civil-related-keywords-prefix.mjs
//
// lint 9-9 MEDIUM 修正:
//   <RelatedKeywords slugs={["civil-construction-1-textbook-foo", ...]} />
//   ↓
//   <RelatedKeywords slugs={["textbook-foo", ...]} />
//
// カテゴリ接頭辞「civil-construction-1-」を bare slug にする。
//
// AdSense 不合格対策の追加施策 (2026-05-16)

import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE = resolve('.local/r2/posts/civil-construction-1');
const DRY_RUN = process.argv.includes('--dry-run');
const PREFIX = 'civil-construction-1-';

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

function stripPrefix(raw) {
  // <RelatedKeywords> 内の slug 文字列リテラルから接頭辞を剥がす
  // ブロック全体をキャプチャしてから個別処理
  let count = 0;
  const blockRe = /<RelatedKeywords[\s\S]*?(?:\/>|<\/RelatedKeywords>)/g;
  const result = raw.replace(blockRe, (block) => {
    return block.replace(/"civil-construction-1-([\w-]+)"/g, (_m, bare) => {
      count++;
      return `"${bare}"`;
    });
  });
  return { newRaw: result, fixed: count };
}

function main() {
  const files = collectMdx(BASE);
  let totalFixed = 0;
  let filesChanged = 0;

  for (const file of files) {
    const { raw } = readMdxFile(file);
    const { newRaw, fixed } = stripPrefix(raw);
    if (fixed === 0) continue;
    const rel = file.replace(BASE + '/', '');
    if (DRY_RUN) {
      console.log(`[dry-run] ${rel}: would strip ${fixed} prefix`);
    } else {
      transformMdxFile(file, () => newRaw);
      console.log(`[fixed] ${rel}: stripped ${fixed} prefix`);
    }
    totalFixed += fixed;
    filesChanged++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files ${DRY_RUN ? 'would-change' : 'changed'}: ${filesChanged}`);
  console.log(`Prefixes ${DRY_RUN ? 'would-strip' : 'stripped'}: ${totalFixed}`);
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();

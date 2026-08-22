#!/usr/bin/env node
// .claude/scripts/restore-civil-related-keywords-prefix.mjs
//
// 240 件のリンク切れ修復スクリプト (2026-05-17)
//
// 背景:
//   commit 5e584ca0 で fix-civil-related-keywords-prefix.mjs が civil-construction-1
//   配下 42 ファイル × 240 slug から「civil-construction-1-」接頭辞を機械的に剥がした
//   結果、RelatedKeywords コンポーネントが PE フォールバックで 404 を生成。
//
// 動作:
//   civil-construction-1 配下の article.mdx を走査し、
//   <RelatedKeywords items={[...]} /> 内の bare slug ("textbook-foo")
//   に対応する civil ページが実在する場合のみ "civil-construction-1-textbook-foo"
//   へ復元する。
//
//   - 既に prefix 付きの slug は触らない
//   - 対応する civil ページが存在しない slug は警告して触らない（安全側）
//
// Usage:
//   node .claude/scripts/restore-civil-related-keywords-prefix.mjs --dry-run
//   node .claude/scripts/restore-civil-related-keywords-prefix.mjs --apply

import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';

const BASE = resolve('content/site/civil-construction-1');
const PREFIX = 'civil-construction-1-';
const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');

if (!DRY_RUN && !APPLY) {
  console.error('Usage: restore-civil-related-keywords-prefix.mjs (--dry-run | --apply)');
  process.exit(1);
}

function collectMdx(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) collectMdx(p, out);
    else if (entry === 'article.mdx') out.push(p);
  }
  return out;
}

function collectValidSlugs(dir) {
  const valid = new Set();
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) valid.add(entry);
  }
  return valid;
}

function restorePrefix(raw, validSlugs) {
  let restored = 0;
  let skipped = 0;
  const blockRe = /<RelatedKeywords[\s\S]*?(?:\/>|<\/RelatedKeywords>)/g;
  const slugRe = /(slug:\s*")([^"]+)(")/g;
  const newRaw = raw.replace(blockRe, (block) => {
    return block.replace(slugRe, (_match, pre, slug, post) => {
      if (slug.startsWith(PREFIX) || slug.startsWith('pe-comprehensive-management-')) {
        return `${pre}${slug}${post}`;
      }
      if (validSlugs.has(slug)) {
        restored++;
        return `${pre}${PREFIX}${slug}${post}`;
      }
      skipped++;
      console.warn(`  WARN: slug "${slug}" は civil-construction-1 配下に存在せず — そのまま保持`);
      return `${pre}${slug}${post}`;
    });
  });
  return { newRaw, restored, skipped };
}

function main() {
  const validSlugs = collectValidSlugs(BASE);
  const files = collectMdx(BASE);
  let totalRestored = 0;
  let totalSkipped = 0;
  let filesChanged = 0;

  for (const file of files) {
    const { raw } = readMdxFile(file);
    const { newRaw, restored, skipped } = restorePrefix(raw, validSlugs);
    if (restored === 0 && skipped === 0) continue;
    const rel = file.replace(BASE + '/', '');
    if (restored > 0) {
      if (DRY_RUN) {
        console.log(`[dry-run] ${rel}: would restore ${restored} prefix${skipped ? ` (skip ${skipped})` : ''}`);
      } else {
        transformMdxFile(file, () => newRaw);
        console.log(`[fixed] ${rel}: restored ${restored} prefix${skipped ? ` (skip ${skipped})` : ''}`);
      }
      filesChanged++;
    }
    totalRestored += restored;
    totalSkipped += skipped;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Files scanned: ${files.length}`);
  console.log(`Files ${DRY_RUN ? 'would-change' : 'changed'}: ${filesChanged}`);
  console.log(`Prefixes ${DRY_RUN ? 'would-restore' : 'restored'}: ${totalRestored}`);
  if (totalSkipped > 0) console.log(`Slugs skipped (not found in civil): ${totalSkipped}`);
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();

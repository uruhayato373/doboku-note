// scripts/fix-duplicated-description-suffix.mjs
//
// bulk-rewrite-descriptions.mjs --apply を 2 回実行したことで
// description に suffix が 2 重に付与されたファイルを修復する。
//
// 修復ロジック: description 内で最初に現れる
// `5管理トレードオフ・過去問演習リンク付き。` を境に、以降を丸ごと削除して
// suffix 1 つだけに整える。
//
// 使い方:
//   node scripts/fix-duplicated-description-suffix.mjs
//   node scripts/fix-duplicated-description-suffix.mjs --apply

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { readMdxFile, transformMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';

const BASE = 'content/site/pe-comprehensive-management';
const MARKER = '5管理トレードオフ・過去問演習リンク付き。';

const APPLY = process.argv.includes('--apply');

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

function trimAtMarker(desc) {
  const idx = desc.indexOf(MARKER);
  if (idx < 0) return null;
  const endOfFirst = idx + MARKER.length;
  const rest = desc.slice(endOfFirst);
  if (!rest.trim()) return null; // no duplication
  return desc.slice(0, endOfFirst);
}

function replaceDescriptionInFrontmatter(raw, newDesc) {
  const foldedRe = /^description:\s*>-?\r?\n((?:[ \t]+.*\r?\n)+)/m;
  if (foldedRe.test(raw)) {
    return raw.replace(foldedRe, `description: ${JSON.stringify(newDesc)}\n`);
  }
  const singleRe = /^description:\s*.*$/m;
  if (singleRe.test(raw)) {
    return raw.replace(singleRe, `description: ${JSON.stringify(newDesc)}`);
  }
  return null;
}

function main() {
  const articles = listArticles();
  let fixed = 0, skipped = 0, errors = 0;
  const samples = [];

  for (const { slug, file } of articles) {
    try {
      const { raw } = readMdxFile(file);
      const parsed = matter(raw);
      const desc = (parsed.data.description || '').toString();
      const trimmed = trimAtMarker(desc);
      if (!trimmed) { skipped++; continue; }
      if (samples.length < 3) samples.push({ slug, before: desc, after: trimmed });
      if (APPLY) {
        const ok = transformMdxFile(file, (r) => replaceDescriptionInFrontmatter(r, trimmed));
        if (ok) fixed++;
      } else {
        fixed++;
      }
    } catch (e) {
      errors++;
      console.error(`ERROR ${slug}: ${e.message}`);
    }
  }
  console.log(`Files ${APPLY ? 'fixed' : 'to-fix'}: ${fixed}`);
  console.log(`Skipped (no duplication): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('\n--- samples ---');
  for (const s of samples) {
    console.log(`\n[${s.slug}]`);
    console.log(`  before(${s.before.length}): ${s.before}`);
    console.log(`  after (${s.after.length}): ${s.after}`);
  }
}

main();

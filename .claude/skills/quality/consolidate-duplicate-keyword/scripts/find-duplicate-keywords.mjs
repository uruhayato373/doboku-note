#!/usr/bin/env node
/**
 * 重複キーワード検出スクリプト
 *
 * `src/config/pe-chapters.json` をスキャンして、同一タイトルだが異なるスラグで登録されている
 * キーワードペアを検出し、`/consolidate-duplicate-keyword` スキルで統合すべき候補として出力する。
 *
 * また、タイトルは異なるがスラグにサフィックス（-osh, -security, -labor, -process, -comm 等）
 * が付いているペアも「類似候補」として検出し、正規スラグ選定の参考にする。
 *
 * Usage:
 *   node scripts/find-duplicate-keywords.mjs
 *   node scripts/find-duplicate-keywords.mjs --json
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CHAPTERS_PATH = join(ROOT, 'src/config/pe-chapters.json');

const SUFFIXES = ['-osh', '-security', '-labor', '-process', '-comm'];
const JSON_OUTPUT = process.argv.includes('--json');

function collectKeywords(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectKeywords(item, out);
    return out;
  }
  if (node && typeof node === 'object') {
    if (node.slug && node.title) {
      // section コンテキストを親から拾う簡易実装: pe-chapters.json は chapter > sections > keywords 構造
      out.push({ slug: node.slug, title: node.title });
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'slug' || k === 'title') continue;
      collectKeywords(v, out);
    }
  }
  return out;
}

function main() {
  const data = JSON.parse(readFileSync(CHAPTERS_PATH, 'utf8'));

  // section id 付きで keyword を収集する
  const entries = []; // { slug, title, sectionId }
  for (const chapter of data.chapters || []) {
    for (const section of chapter.sections || []) {
      for (const kw of section.keywords || []) {
        entries.push({
          slug: kw.slug,
          title: kw.title,
          sectionId: section.id,
          sectionTitle: section.title,
        });
      }
    }
  }

  // 同一タイトルで異スラグのグループ
  const byTitle = new Map();
  for (const e of entries) {
    if (!byTitle.has(e.title)) byTitle.set(e.title, []);
    byTitle.get(e.title).push(e);
  }

  const sameTitle = [];
  for (const [title, items] of byTitle.entries()) {
    const uniqueSlugs = Array.from(new Set(items.map((i) => i.slug)));
    if (uniqueSlugs.length >= 2) {
      sameTitle.push({
        title,
        slugs: uniqueSlugs,
        occurrences: items.map((i) => ({ slug: i.slug, section: `${i.sectionId} ${i.sectionTitle}` })),
      });
    }
  }

  // サフィックスペア候補: 同じ base slug + サフィックスのペア
  const bySlug = new Map();
  for (const e of entries) bySlug.set(e.slug, e);

  const suffixPairs = [];
  for (const [slug, entry] of bySlug.entries()) {
    for (const suf of SUFFIXES) {
      if (slug.endsWith(suf)) {
        const base = slug.slice(0, -suf.length);
        if (bySlug.has(base)) {
          suffixPairs.push({
            canonical: base,
            duplicate: slug,
            suffix: suf,
            canonicalTitle: bySlug.get(base).title,
            duplicateTitle: entry.title,
          });
        }
      }
    }
  }

  const result = {
    version: 1,
    generated_at: new Date().toISOString(),
    source: 'src/config/pe-chapters.json',
    summary: {
      total_keywords: entries.length,
      unique_titles: byTitle.size,
      unique_slugs: bySlug.size,
      same_title_groups: sameTitle.length,
      suffix_pairs: suffixPairs.length,
    },
    same_title_duplicates: sameTitle,
    suffix_pair_candidates: suffixPairs,
  };

  if (JSON_OUTPUT) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }

  console.log('[find-duplicate-keywords] pe-chapters.json を scan');
  console.log(`  total keywords: ${entries.length}`);
  console.log(`  unique titles:  ${byTitle.size}`);
  console.log(`  unique slugs:   ${bySlug.size}`);
  console.log(`  same-title groups: ${sameTitle.length}`);
  console.log(`  suffix-pair candidates: ${suffixPairs.length}`);

  if (sameTitle.length > 0) {
    console.log('\n── 同一タイトル異スラグ (統合の最有力候補) ──');
    for (const g of sameTitle) {
      console.log(`\n  "${g.title}"`);
      for (const o of g.occurrences) {
        console.log(`    ${o.slug.padEnd(40)} @ ${o.section}`);
      }
    }
  }

  if (suffixPairs.length > 0) {
    console.log('\n── サフィックスペア候補 (正規←重複) ──');
    for (const p of suffixPairs) {
      console.log(`  ${p.canonical.padEnd(40)} ← ${p.duplicate}  (${p.suffix})`);
    }
  }
}

main();

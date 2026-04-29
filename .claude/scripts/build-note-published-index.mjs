#!/usr/bin/env node
// docs/note-drafts/{NN}/article.md を走査し、frontmatter に noteUrl を持つ
// 公開済み記事の一覧を .claude/state/note-published.json に集計する。
//
// 使い方:
//   node .claude/scripts/build-note-published-index.mjs
//
// 出力例:
// {
//   "version": 1,
//   "updatedAt": "2026-04-29T12:00:00.000Z",
//   "items": [
//     {
//       "directory": "90-総監択一式17年分分析",
//       "noteUrl": "https://note.com/dobokunote/n/n3bcb87efddad",
//       "noteId": "n3bcb87efddad",
//       "publishedAt": "2026-04-29",
//       "pricing": "free",
//       "series": "総監択一式分析",
//       "utmCampaign": "90-soukan-analysis",
//       "title": "..."
//     }
//   ]
// }

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const DRAFTS_DIR = join(ROOT, 'docs/note-drafts');
const OUT_PATH = join(ROOT, '.claude/state/note-published.json');

function extractH1(body) {
  const line = body.split('\n').find((l) => l.startsWith('# '));
  if (!line) return null;
  return line.replace(/^#\s+/, '').trim();
}

function build() {
  const items = [];
  const dirs = readdirSync(DRAFTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  for (const d of dirs) {
    const articlePath = join(DRAFTS_DIR, d, 'article.md');
    let raw;
    try {
      raw = readFileSync(articlePath, 'utf-8');
    } catch {
      continue;
    }
    const { data, content } = matter(raw);
    if (!data?.noteUrl) continue;
    items.push({
      directory: d,
      noteUrl: data.noteUrl,
      noteId: data.noteId || null,
      publishedAt: data.notePublishedAt
        ? new Date(data.notePublishedAt).toISOString().slice(0, 10)
        : null,
      pricing: data.notePricing || null,
      series: data.noteSeries || null,
      utmCampaign: data.utmCampaign || null,
      title: extractH1(content),
    });
  }
  return items;
}

function main() {
  const items = build();
  const out = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items,
  };
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`[build-note-published-index] 完了`);
  console.log(`  公開済み: ${items.length}件`);
  console.log(`  出力: ${OUT_PATH}`);
  for (const it of items) {
    console.log(`    - ${it.directory} (${it.publishedAt}) → ${it.noteUrl}`);
  }
}

main();

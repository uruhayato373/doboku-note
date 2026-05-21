#!/usr/bin/env node
// docs/note/{slug}/article.md および
// docs/note/magazines/{magazine}/{year}/article.md を走査し、frontmatter に
// noteUrl を持つ公開済み記事の一覧を .claude/state/note-published.json に集計する。
// マガジン記事は slug を "magazines/{magazine}/{year}" とし magazine フィールドを付す。
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
//       "slug": "総監択一式17年分分析",
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
//
// 他 note 記事を本文中で参照する時は、対象記事 frontmatter の noteUrl を
// 直書きする運用とする（slug → noteUrl の逆引きは本 JSON で行える）。

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const NOTE_DIR = join(ROOT, 'docs/note');
const OUT_PATH = join(ROOT, '.claude/state/note-published.json');

function extractH1(body) {
  const line = body.split('\n').find((l) => l.startsWith('# '));
  if (!line) return null;
  return line.replace(/^#\s+/, '').trim();
}

function toItem(slug, data, content, extra = {}) {
  return {
    slug,
    ...extra,
    noteUrl: data.noteUrl,
    noteId: data.noteId || null,
    publishedAt: data.notePublishedAt
      ? new Date(data.notePublishedAt).toISOString().slice(0, 10)
      : null,
    pricing: data.notePricing || null,
    series: data.noteSeries || null,
    utmCampaign: data.utmCampaign || null,
    title: extractH1(content),
  };
}

/** ディレクトリ直下のサブディレクトリ名一覧（存在しなければ空配列） */
function subDirs(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

function build() {
  const items = [];
  // 1. フラットな単独記事 docs/note/{slug}/article.md
  for (const d of subDirs(NOTE_DIR)) {
    if (d === 'magazines') continue;
    let raw;
    try {
      raw = readFileSync(join(NOTE_DIR, d, 'article.md'), 'utf-8');
    } catch {
      continue;
    }
    const { data, content } = matter(raw);
    if (!data?.noteUrl) continue;
    items.push(toItem(d, data, content));
  }
  // 2. マガジン記事 docs/note/magazines/{magazine}/{year}/article.md
  const MAG_DIR = join(NOTE_DIR, 'magazines');
  for (const mag of subDirs(MAG_DIR)) {
    for (const y of subDirs(join(MAG_DIR, mag))) {
      let raw;
      try {
        raw = readFileSync(join(MAG_DIR, mag, y, 'article.md'), 'utf-8');
      } catch {
        continue;
      }
      const { data, content } = matter(raw);
      if (!data?.noteUrl) continue;
      items.push(toItem(`magazines/${mag}/${y}`, data, content, { magazine: mag }));
    }
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
    console.log(`    - ${it.slug} (${it.publishedAt}) → ${it.noteUrl}`);
  }
}

main();

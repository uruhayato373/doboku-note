#!/usr/bin/env node
// content/note/**/article*.md を走査し、frontmatter に noteUrl を持つ公開済み記事の
// 一覧を .claude/state/note-published.json に集計する。マガジン記事は magazine
// フィールドを付し、全記事に contentType を付す。
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

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { listNoteArticleFiles, normalizeRepoPath } from '../../scripts/lib/note-content-type.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const NOTE_DIR = join(ROOT, 'content/note');
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
    // notePublishedAt は未設定や "TBD" 等の不正値があり得るため、
    // 無効な日付は null にフォールバックして集計をクラッシュさせない。
    publishedAt: (() => {
      if (!data.notePublishedAt) return null;
      const d = new Date(data.notePublishedAt);
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    })(),
    pricing: data.notePricing || null,
    contentType: data.noteContentType || null,
    series: data.noteSeries || null,
    utmCampaign: data.utmCampaign || null,
    title: extractH1(content),
  };
}

function build() {
  const items = [];
  for (const path of listNoteArticleFiles(NOTE_DIR)) {
    const { data, content } = matter(readFileSync(path, 'utf-8'));
    if (!data?.noteUrl) continue;
    const slug = normalizeRepoPath(relative(NOTE_DIR, dirname(path)));
    const parts = slug.split('/');
    const magazineIndex = parts.indexOf('magazines');
    const extra = magazineIndex >= 0 ? { magazine: parts[magazineIndex + 1] || null } : {};
    items.push(toItem(slug, data, content, extra));
  }
  return items.sort((a, b) => a.slug.localeCompare(b.slug, 'ja'));
}

function main() {
  const items = build();
  const out = {
    version: 2,
    updatedAt: new Date().toISOString(),
    items,
  };
  const checkOnly = process.argv.includes('--check');
  if (!checkOnly) {
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  }
  console.log(`[build-note-published-index] ${checkOnly ? '検査完了（書き込みなし）' : '完了'}`);
  console.log(`  公開済み: ${items.length}件`);
  if (!checkOnly) console.log(`  出力: ${OUT_PATH}`);
  if (items.some((item) => !item.contentType)) {
    console.error('  FAIL: contentType のない公開記事があります');
    process.exit(1);
  }
}

main();

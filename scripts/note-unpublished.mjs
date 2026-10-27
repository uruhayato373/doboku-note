#!/usr/bin/env node
/**
 * note-unpublished.mjs — note でまだ公開していない記事と、公開の前に足りないものを一覧にする。
 *
 * 公開状態は frontmatter（noteId・noteStatus）を gray-matter で読んで決める（scripts/lib/note-publication-state.mjs）。
 * 「note で公開できるものは？」に答える前に必ずこれを使う。手で書いた正規表現で frontmatter を読まない
 * （2026-10-28、CRLF の記事 692 本を未公開と数えた）。
 *
 * 使い方:
 *   npm run note-unpublished            # 未公開の一覧（足りないもの付き）
 *   npm run note-unpublished -- --json
 *
 * exit 0: 走査が成立した / exit 1: 記事 0 本、読めない frontmatter、公開状態の食い違いがある
 */
import { existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseNoteArticle } from './lib/note-frontmatter.mjs';
import { collectArticleFiles, loadNoteCoverInventory } from './lib/note-cover-inventory.mjs';
import { NOTE_STATE_SOURCE, notePublicationState, notePublishGaps } from './lib/note-publication-state.mjs';

const flags = parseCliArgs({ json: { type: 'boolean' } });
const rel = (p) => relative(REPO_ROOT, p).split(sep).join('/');

const files = collectArticleFiles(REPO_ROOT);
const coverTargets = new Set((await loadNoteCoverInventory(REPO_ROOT)).targets.filter((t) => t.kind === 'article').map((t) => t.source));
const counts = { scanned: files.length, published: 0, draft: 0, unrecorded: 0 };
const unreadable = [];
const conflicts = [];
const unpublished = [];

for (const abs of files) {
  let article;
  try {
    article = parseNoteArticle(abs);
  } catch (error) {
    unreadable.push({ path: rel(abs), reason: error.message.split('\n')[0] });
    continue;
  }
  if (!Object.keys(article.data).length) {
    unreadable.push({ path: rel(abs), reason: 'frontmatter が無いか読めない' });
    continue;
  }
  const { state, conflicts: found } = notePublicationState(article.data);
  counts[state] += 1;
  for (const c of found) conflicts.push({ path: rel(abs), reason: c });
  if (state === 'published') continue;
  const suffix = abs.match(/article-([^/\\]+)\.md$/)?.[1];
  const tagFiles = [suffix && join(dirname(abs), `hashtags-${suffix}.txt`), join(dirname(abs), 'hashtags.txt')].filter(Boolean);
  const gaps = notePublishGaps(article, { hasHashtags: tagFiles.some(existsSync), coverTarget: coverTargets.has(rel(abs)) });
  unpublished.push({ path: rel(abs), state, pricing: article.isPaid ? `paid ¥${article.price ?? '?'}` : (article.notePricing || 'free'), gaps });
}

const result = { source: NOTE_STATE_SOURCE, counts, unreadable, conflicts, unpublished };
if (flags.json) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  console.log(`[note-unpublished] 公開状態の正本: ${NOTE_STATE_SOURCE}`);
  console.log(`[note-unpublished] 記事 ${counts.scanned} 本を走査 / 読めた ${counts.scanned - unreadable.length} 本: 公開済み ${counts.published}・下書き ${counts.draft}・状態の記録なし ${counts.unrecorded}`);
  for (const u of unpublished) {
    console.log(`  ${u.gaps.length ? '✗' : '○'} [${u.state}] ${u.pricing}  ${u.path.replace(/^content\/note\//, '')}`);
    for (const g of u.gaps) console.log(`      - ${g}`);
  }
  const ready = unpublished.filter((u) => !u.gaps.length).length;
  console.log(`[note-unpublished] 未公開 ${unpublished.length} 本（準備が揃っている ${ready} 本）。公開日・運営者の判断で止めている記事かは backlog のカードで確かめる`);
  for (const u of unreadable) console.error(`  ! 読めない: ${u.path}（${u.reason}）`);
  for (const c of conflicts) console.error(`  ! 食い違い: ${c.path}（${c.reason}）`);
}
if (!counts.scanned) { console.error('[note-unpublished] 記事を 1 本も見つけられない（走査の起点が違う）'); process.exitCode = 1; }
if (unreadable.length || conflicts.length) process.exitCode = 1;

#!/usr/bin/env node

import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { readMdxFile, writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import {
  inferNoteContentType,
  isKnownNoteContentType,
  listNoteArticleFiles,
  normalizeRepoPath,
  NOTE_CONTENT_TYPES,
} from './lib/note-content-type.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTE_DIR = join(ROOT, 'content', 'note');
const write = process.argv.includes('--write');
const files = listNoteArticleFiles(NOTE_DIR);
const counts = Object.fromEntries(NOTE_CONTENT_TYPES.map((type) => [type, 0]));
let changed = 0;

function addField(raw, type) {
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.replace(/^\uFEFF/, '') !== '---') throw new Error('frontmatter の開始区切りがありません');
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error('frontmatter の終了区切りがありません');

  const preferredKeys = ['noteSeries:', 'notePricing:', 'noteStatus:', 'title:'];
  let insertAt = 1;
  for (const key of preferredKeys) {
    const index = lines.slice(1, end).findIndex((line) => line.startsWith(key));
    if (index >= 0) {
      insertAt = index + 2;
      break;
    }
  }
  lines.splice(insertAt, 0, `noteContentType: ${type}`);
  return lines.join(eol);
}

for (const path of files) {
  const { raw, eol } = readMdxFile(path);
  const { data } = matter(raw);
  const existing = data.noteContentType;
  const type = isKnownNoteContentType(existing)
    ? existing
    : inferNoteContentType({ path, root: ROOT, data });
  counts[type] += 1;
  if (existing === type) continue;

  changed += 1;
  if (write) writeMdxFile(path, addField(raw, type), eol);
  else console.log(`${normalizeRepoPath(relative(ROOT, path))}: ${type}`);
}

console.log(`[migrate-note-content-type] 対象 ${files.length}件 / 変更 ${changed}件 / mode=${write ? 'write' : 'dry-run'}`);
console.log(`  ${NOTE_CONTENT_TYPES.map((type) => `${type}=${counts[type]}`).join(' / ')}`);


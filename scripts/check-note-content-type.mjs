#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import {
  isKnownNoteContentType,
  listNoteArticleFiles,
  normalizeRepoPath,
  NOTE_CONTENT_TYPES,
} from './lib/note-content-type.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const NOTE_DIR = join(ROOT, 'content', 'note');

const files = listNoteArticleFiles(NOTE_DIR);
const counts = Object.fromEntries(NOTE_CONTENT_TYPES.map((type) => [type, 0]));
const errors = [];

for (const path of files) {
  const rel = normalizeRepoPath(relative(ROOT, path));
  let data;
  try {
    ({ data } = matter(readFileSync(path, 'utf8')));
  } catch (error) {
    errors.push(`${rel}: frontmatter を読めません (${error.message})`);
    continue;
  }

  const type = data.noteContentType;
  if (!isKnownNoteContentType(type)) {
    errors.push(`${rel}: noteContentType が未設定または不正 (${String(type)})`);
    continue;
  }
  counts[type] += 1;

  if (data.noteSeries === '総合案内' && type !== 'index') {
    errors.push(`${rel}: noteSeries=総合案内 は noteContentType=index が必要です`);
  }
  if (type === 'index' && data.noteSeries !== '総合案内') {
    errors.push(`${rel}: noteContentType=index は noteSeries=総合案内 が必要です`);
  }
  if (data.utmCampaign === 'career' && type !== 'career') {
    errors.push(`${rel}: utmCampaign=career は noteContentType=career が必要です`);
  }
}

console.log(`[check-note-content-type] 対象 ${files.length}件 / 検査 ${files.length}件`);
console.log(`  ${NOTE_CONTENT_TYPES.map((type) => `${type}=${counts[type]}`).join(' / ')}`);

if (files.length === 0) {
  console.error('[check-note-content-type] FAIL: 検査対象が0件です');
  process.exit(2);
}
if (errors.length > 0) {
  console.error(`[check-note-content-type] FAIL: ${errors.length}件`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('[check-note-content-type] PASS');


#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
const DISCLOSURE = JSON.parse(readFileSync(join(ROOT, '.claude/config/youtube-production-disclosure.json'), 'utf8'));
const COMMIT = process.argv.includes('--commit');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (entry.name === 'youtube.json') out.push(path);
  }
  return out;
}

function withAuthorityNotice(description) {
  const marker = '【この動画の制作について】';
  const withoutOldNotice = String(description ?? '')
    .replace(new RegExp(`\\n*${marker.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\n[^\\n]*(?:\\n[^\\n]*)?`), '')
    .trim();
  const anchor = withoutOldNotice.search(/^▼ /m);
  if (anchor < 0) return `${withoutOldNotice}\n\n${DISCLOSURE.authorityNotice}`.trim();
  const before = withoutOldNotice.slice(0, anchor).trimEnd();
  const after = withoutOldNotice.slice(anchor).trimStart();
  return `${before}\n\n${DISCLOSURE.authorityNotice}\n\n${after}`;
}

let filesChanged = 0;
let videosChanged = 0;
for (const path of walk(PACKS_ROOT)) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let changed = false;
  for (const item of [data.longform, ...(Array.isArray(data.shorts) ? data.shorts : [])]) {
    if (!item?.description) continue;
    const next = withAuthorityNotice(item.description);
    if (next === item.description) continue;
    item.description = next;
    changed = true;
    videosChanged += 1;
  }
  if (!changed) continue;
  filesChanged += 1;
  if (COMMIT) writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

console.log(`${COMMIT ? 'updated' : 'would update'}: files=${filesChanged} videos=${videosChanged}`);

export { withAuthorityNotice };

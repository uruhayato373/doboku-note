#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readDataset } from './lib/dataset-io.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { listFiles } from './lib/fs-walk.mjs';

const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
const DISCLOSURE = readDataset(ROOT, 'config.youtube-production-disclosure');
const COMMIT = process.argv.includes('--commit');

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
for (const path of listFiles(PACKS_ROOT, { match: (_p, name) => name === 'youtube.json' })) {
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

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { listFiles } from '../scripts/lib/fs-walk.mjs';

const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
const disclosure = JSON.parse(readFileSync(join(ROOT, 'config/youtube-production-disclosure.json'), 'utf8'));

test('全YouTubeメタデータが著者主体・AI制作補助の表記を持つ', () => {
  const files = listFiles(PACKS_ROOT, { match: (_p, name) => name === 'youtube.json' });
  assert.equal(files.length, 112);
  let videos = 0;
  for (const path of files) {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    for (const item of [data.longform, ...(data.shorts ?? [])]) {
      videos += 1;
      assert.ok(item.description.includes(disclosure.authorityNotice), path);
    }
  }
  assert.equal(videos, 336); // 112 longform + 112 packs × 2 Shorts
  assert.equal(disclosure.containsSyntheticMedia, false);
});

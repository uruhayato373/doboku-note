import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';

const ROOT = resolve(import.meta.dirname, '..');
const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
const disclosure = JSON.parse(readFileSync(join(ROOT, '.claude/config/youtube-production-disclosure.json'), 'utf8'));

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (entry.name === 'youtube.json') out.push(path);
  }
  return out;
}

test('全YouTubeメタデータが著者主体・AI制作補助の表記を持つ', () => {
  const files = walk(PACKS_ROOT);
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

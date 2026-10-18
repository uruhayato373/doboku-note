import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { listFiles } from '../scripts/lib/fs-walk.mjs';

const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
const disclosure = JSON.parse(readFileSync(join(ROOT, 'config/youtube-production-disclosure.json'), 'utf8'));

test('全YouTubeメタデータが著者主体・AI制作補助の表記を持つ', () => {
  const files = listFiles(PACKS_ROOT, { match: (_path, name) => name === 'youtube.json' });
  assert.equal(files.length, 124); // DN-0110 の112パック＋総まとめ1本（matome-2kyu-chokuzen・Shorts なし）＋#967 で足した 2 本＋2級 答案具体化シリーズ 8 パックと改訂の記録 1
  let videos = 0;
  for (const path of files) {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    for (const item of [data.longform, ...(data.shorts ?? [])]) {
      videos += 1;
      assert.ok(item.description.includes(disclosure.authorityNotice), path);
    }
  }
  assert.ok(videos >= files.length, '各パックの通常動画を実検査する');
  assert.equal(disclosure.containsSyntheticMedia, false);
});

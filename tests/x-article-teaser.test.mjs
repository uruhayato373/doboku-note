import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('Article延期後も元計画に公開URLを結び、告知原稿は新しい日時で生成する', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'x-teaser-'));
  try {
    const draft = path.join(root, 'content/sns/x/draft/094-career-longform-pilot');
    const planDir = path.join(root, '.claude/config/x-campaigns');
    fs.mkdirSync(draft, { recursive: true });
    fs.mkdirSync(planDir, { recursive: true });
    const tweets = {}, posts = [], blocks = [];
    for (let n = 1; n <= 4; n++) {
      const day = String(n).padStart(2, '0');
      tweets[2 * n - 1] = { status: 'scheduled' };
      tweets[2 * n] = { status: 'scheduled', manual_only: true, blocked_reason: 'article_url_pending',
        title: `10/${n} 08:00 告知`, original_scheduled_at: `2026-09-${day}T07:20:00+09:00`,
        scheduled_at: `2026-10-${day}T08:00:00+09:00` };
      posts.push({ date: `2026-09-${day}`, time: '07:20', funnel: 'x-article', awaitingTarget: true });
      blocks.push(`## Tweet ${2 * n}: 9/${n} 07:20 告知\n\n本文 {{ARTICLE_URL_${String(n).padStart(2, '0')}}}`);
    }
    fs.writeFileSync(path.join(draft, 'status.json'), JSON.stringify({ tweets }));
    fs.writeFileSync(path.join(draft, 'teasers.template.md'), blocks.join('\n\n'));
    const planPath = path.join(planDir, '2026-09-civil.json');
    fs.writeFileSync(planPath, JSON.stringify({ posts }));
    const url = 'https://x.com/doboku373/article/123';
    const result = spawnSync(process.execPath, [path.resolve('scripts/prepare-x-article-teaser.mjs'), '--article', '1', '--url', url], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const after = JSON.parse(fs.readFileSync(path.join(draft, 'status.json')));
    assert.equal(after.tweets[1].status, 'posted');
    assert.equal(after.tweets[2].manual_only, false);
    assert.equal(after.tweets[2].scheduled_at, '2026-10-01T08:00:00+09:00');
    assert.match(fs.readFileSync(path.join(draft, 'tweets.md'), 'utf8'), /^## Tweet 2: 10\/1 08:00 告知/);
    const saved = JSON.parse(fs.readFileSync(planPath));
    assert.equal(saved.posts[0].date, '2026-09-01');
    assert.equal(saved.posts[0].target, url);
    assert.equal(saved.posts[1].target, undefined);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { classifyPublicKeys, parseDeleteList } from '../scripts/lib/r2-orphans.mjs';

const base = {
  manifestPublicKeys: ['posts/a/ogp.png', 'sns/x.png'],
  trackedSitePaths: ['content/site/a/img/fig.svg', 'content/site/a/article.mdx'],
  pendingDeleteKeys: ['posts/old/gone.png'],
  referencedBasenames: ['still-used.svg'],
};

test('孤児の判定: 台帳・OGP 縮小・git 管理の画像は残し、MDX と台帳に無いものは孤児', () => {
  const r = classifyPublicKeys({
    ...base,
    keys: [
      'posts/a/ogp.png', 'posts/a/ogp-thumb-336.webp', 'sns/x.png', 'posts/a/img/fig.svg',
      'posts/a/article.mdx', 'posts/b/ogp-thumb-336.webp', 'posts/a/ogp.webp',
      'posts/old/gone.png', 'posts/c/img/still-used.svg', 'posts/c/img/still-used.png',
    ],
  });
  assert.equal(r.kept, 4);
  assert.deepEqual(r.pending, ['posts/old/gone.png']);
  assert.deepEqual(r.referencedOrphans, ['posts/c/img/still-used.svg']);
  // 拡張子が違えば参照ではない（2026-10-20 に拡張子を無視した照合で偽の参照が出た）
  assert.deepEqual(r.orphans, ['posts/a/article.mdx', 'posts/b/ogp-thumb-336.webp', 'posts/a/ogp.webp', 'posts/c/img/still-used.png']);
});

test('削除リスト: コメントと空行を除いたキーだけを読む', () => {
  assert.deepEqual(parseDeleteList('# 見出し\n\na/b.png\n  c/d.svg  \n# x/y.png\n'), ['a/b.png', 'c/d.svg']);
});

test('R2 へのアップロード対象は画像の拡張子だけ（MDX・テキストを公開バケットへ送らない）', () => {
  const src = readFileSync(join(REPO_ROOT, '.claude/scripts/upload-images-to-r2.mjs'), 'utf8');
  const block = src.match(/const MIME_TYPES = \{([\s\S]*?)\};/);
  assert.ok(block, 'MIME_TYPES が見つからない（アップロード対象の決め方を変えたらこのテストも直す）');
  const exts = [...block[1].matchAll(/'(\.[a-z0-9]+)'\s*:\s*'([^']+)'/g)];
  assert.ok(exts.length > 0);
  for (const [, ext, mime] of exts) assert.match(mime, /^image\//, `${ext} は画像ではない`);
  assert.ok(!exts.some(([, ext]) => ['.mdx', '.md', '.json', '.txt'].includes(ext)));
});

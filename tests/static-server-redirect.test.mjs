// E2E の配信サーバーが _redirects の :splat を本番（Cloudflare Pages）と同じく置き換えることを固定する。
// 2026-10-08: 置き換えずに `…/posts/:splat` へ転送し、out/ に無い画像の要求が失敗を繰り返して E2E が時間切れになった（PR #921）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRedirect } from '../scripts/static-server.mjs';

test('ワイルドカード転送は * に当たった残りを :splat に入れる', () => {
  const redirects = {
    exact: new Map([['/old', { to: '/new', status: 301 }]]),
    prefixes: [{ prefix: '/posts/', to: 'https://storage.doboku-note.com/posts/:splat', status: 301 }],
  };
  assert.deepEqual(resolveRedirect('/posts/c/a/img/x.svg', redirects), { to: 'https://storage.doboku-note.com/posts/c/a/img/x.svg', status: 301 });
  assert.deepEqual(resolveRedirect('/old', redirects), { to: '/new', status: 301 });
  assert.equal(resolveRedirect('/exam/x', redirects), null);
});

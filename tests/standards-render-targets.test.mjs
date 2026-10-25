import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { SITE_CONTENT_ROOT } from '../scripts/lib/repository-paths.mjs';
import { standardsRenderTargets } from '../scripts/lib/standards-render-targets.mjs';

const ROOT = join(SITE_CONTENT_ROOT, 'standards-articles');

test('scope all は既定の対象をすべて含み、比較の外の文書（北海道独自など）を足す', () => {
  const distinct = standardsRenderTargets(ROOT);
  const all = standardsRenderTargets(ROOT, { scope: 'all' });
  assert.ok(distinct.length > 100);
  assert.ok(distinct.every((url) => all.includes(url)));
  assert.ok(!distinct.some((url) => url.startsWith('/standards/hokkaido/local/')));
  assert.ok(all.includes('/standards/hokkaido/local/chapters/2-2'));
  // 共通仕様書で中身が基準と同じ文書（identical）は all でも重ねて描画しない
  assert.ok(!all.some((url) => url.startsWith('/standards/kanto/common/')));
  assert.equal(new Set(all).size, all.length);
});

test('scope の打ち間違いは黙って既定にしない', () => {
  assert.throws(() => standardsRenderTargets(ROOT, { scope: 'everything' }), /scope/);
});

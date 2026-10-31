import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { igPubId } from '../scripts/lib/registry-ig-store.mjs';

test('投稿スクリプトが渡す絶対パスでも固定投稿の台帳IDを引ける', async () => {
  const folder = 'profile-pinned/start-guide';
  const expected = 'account/ig-start-guide/instagram.carousel';
  assert.equal(await igPubId(REPO_ROOT, folder, 'carousel'), expected);
  assert.equal(await igPubId(REPO_ROOT, join(REPO_ROOT, 'content/sns/instagram', folder), 'carousel'), expected);
  assert.equal(await igPubId(REPO_ROOT, join(REPO_ROOT, 'content/sns/instagram/../', folder), 'carousel'), null);
});

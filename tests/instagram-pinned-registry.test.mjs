import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadRegistry } from '../scripts/lib/content-registry.mjs';
import { assertIgScheduleApproval, igPubId } from '../scripts/lib/registry-ig-store.mjs';

test('投稿スクリプトが渡す絶対パスでも固定投稿の台帳IDを引ける', async () => {
  const folder = 'profile-pinned/start-guide';
  const expected = 'account/ig-start-guide/instagram.carousel';
  assert.equal(await igPubId(REPO_ROOT, folder, 'carousel'), expected);
  assert.equal(await igPubId(REPO_ROOT, join(REPO_ROOT, 'content/sns/instagram', folder), 'carousel'), expected);
  assert.equal(await igPubId(REPO_ROOT, join(REPO_ROOT, 'content/sns/instagram/../', folder), 'carousel'), null);
});

test('プランナー照合後の予約済み行も現版の承認と予定日時を照合できる', () => {
  const row = loadRegistry(REPO_ROOT).publications.find((p) => p.id === 'account/ig-start-guide/instagram.carousel');
  assert.equal(row?.status, 'scheduled');
  assert.doesNotThrow(() => assertIgScheduleApproval(REPO_ROOT, row, row.publishAt));
  assert.throws(() => assertIgScheduleApproval(REPO_ROOT, row, new Date(Date.parse(row.publishAt) + 3600_000).toISOString()), /予約日時と投稿日時が違う/);
});

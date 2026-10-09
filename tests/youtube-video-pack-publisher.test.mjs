import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { videoSnippet, videoStatus, assertLongformPublishable, assertRegistryFinalApproval, FINAL_APPROVAL_PHASES } = require('../.claude/scripts/youtube/publish-video-pack.cjs');

test('videoSnippet は新規投稿と既存動画の再同期で同じメタデータを返す', () => {
  assert.deepEqual(videoSnippet({
    title: '題名',
    description: '概要',
    tags: ['土木'],
  }), {
    title: '題名',
    description: '概要',
    tags: ['土木'],
    categoryId: '27',
    defaultLanguage: 'ja',
    defaultAudioLanguage: 'ja',
  });
});

test('videoSnippet は明示したカテゴリを保持する', () => {
  assert.equal(videoSnippet({ title: '題名', description: '概要', tags: [], categoryId: '28' }).categoryId, '28');
});

test('videoStatus は公開状態と予約日時を保ち、強いAI生成ラベルを付けない', () => {
  const status = videoStatus({
    status: {
      privacyStatus: 'private',
      publishAt: '2026-10-23T11:00:00Z',
      embeddable: true,
      license: 'youtube',
      publicStatsViewable: true,
    },
  });
  assert.equal(status.privacyStatus, 'private');
  assert.equal(status.publishAt, '2026-10-23T11:00:00Z');
  assert.equal(status.containsSyntheticMedia, false);
});

test('assertLongformPublishable は未承認と予約日時の無い（即時公開になる）通常動画を上げない', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  const item = { key: 'longform', publishAt: '2026-10-23T11:00:00Z' };
  assert.doesNotThrow(() => assertLongformPublishable({ status: 'rendered', approvedBy: 'user' }, item, now));
  assert.doesNotThrow(() => assertLongformPublishable({ status: 'approved', approvedBy: 'user' }, item, now));
  assert.throws(() => assertLongformPublishable(undefined, item, now), /ユーザー承認/);
  assert.throws(() => assertLongformPublishable({ status: 'qa_passed' }, item, now), /ユーザー承認/);
  assert.throws(() => assertLongformPublishable({ status: 'scheduled', approvedBy: 'user' }, item, now), /ユーザー承認/);
  assert.throws(() => assertLongformPublishable({ status: 'rendered', approvedBy: 'user' }, { key: 'longform' }, now), /publishAt/);
  assert.throws(() => assertLongformPublishable({ status: 'rendered', approvedBy: 'user' }, { key: 'longform', publishAt: '2026-10-08T12:03:00Z' }, now), /publishAt/);
});

test('assertRegistryFinalApproval は台帳に承認ハッシュの無い（grandfathered・台帳に無い）パックを止めない', async () => {
  await assert.doesNotReject(() => assertRegistryFinalApproval('no-such-exam', 'no-such-pack-for-test'));
});

test('最終承認の関門は longform だけでなく thumbnail の段にも掛かる（表紙は承認の digest に入っている）', async () => {
  assert.deepEqual([...FINAL_APPROVAL_PHASES].sort(), ['longform', 'thumbnail']);
  const media = [{ id: 'e/w/youtube.longform/video', sha256: 'a'.repeat(64) }];
  const stale = { id: 'e/w/youtube.longform', work: 'w', exam: 'e', channel: 'youtube', format: 'longform', account: 'acc', publishAt: '2026-10-23T11:00:00Z', media: { video: media[0].id }, approval: { by: 'user', contentSha256: 'f'.repeat(64) } };
  await assert.rejects(() => assertRegistryFinalApproval('e', 'w', { reg: { publications: [stale], media } }), /最終承認が今の中身と合わない/);
  // 別資格の同じ作品 ID の古い承認では止まらない
  await assert.doesNotReject(() => assertRegistryFinalApproval('other', 'w', { reg: { publications: [stale], media } }));
});

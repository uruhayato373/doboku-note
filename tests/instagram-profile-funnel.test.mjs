import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { checkInstagramProfileFunnel, checkInstagramPinnedPlan } from '../scripts/lib/instagram-profile-funnel.mjs';

const account = { profile: {
  bio: '技術士一次・コンクリートの無料解説と教材はリンクから',
  websiteUrl: 'https://doboku-note.com/links?utm_source=instagram&utm_medium=social&utm_campaign=bio-link&utm_content=bio',
} };
const utm = { source: 'instagram', medium: 'social', content: 'bio' };

test('Instagram bio は /links と4つの UTM パラメータを揃える', () => {
  assert.deepEqual(checkInstagramProfileFunnel(account, utm, 'https://doboku-note.com'), []);
  const wrong = structuredClone(account);
  wrong.profile.websiteUrl = 'http://doboku-note.com/links?utm_source=ig&utm_medium=social&utm_content=link_in_bio';
  const errors = checkInstagramProfileFunnel(wrong, utm, 'https://doboku-note.com');
  assert.ok(errors.some((x) => x.includes('HTTPS')));
  assert.ok(errors.some((x) => x.includes('utm_source')));
  assert.ok(errors.some((x) => x.includes('utm_campaign')));
  assert.ok(errors.some((x) => x.includes('utm_content')));
});

test('固定済みの記録には実表示URLが必要', () => {
  const pinned = { profile: { pinnedPosts: [
    { order: 1, key: 'start-guide', status: 'pinned' },
    { order: 2, key: 'pe-first-stage-route', status: 'planned' },
    { order: 3, key: 'concrete-route', status: 'planned' },
  ] } };
  const posts = pinned.profile.pinnedPosts.map(({ key }) => ({ key, caption: 'プロフィールのリンクから無料解説と教材へ' }));
  assert.ok(checkInstagramPinnedPlan(pinned, { posts }).some((x) => x.includes('実表示URL')));
});

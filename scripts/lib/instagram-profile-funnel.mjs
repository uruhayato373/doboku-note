/** Instagram プロフィールから /links へ入る URL と自己紹介の契約。 */
export function checkInstagramProfileFunnel(account, utm, siteOrigin) {
  const problems = [];
  const bio = account?.profile?.bio ?? '';
  if (!bio.includes('技術士一次') || !bio.includes('コンクリート') || !bio.includes('リンク')) {
    problems.push('自己紹介に優先資格とリンク案内が揃っていない');
  }
  let url;
  try { url = new URL(account?.profile?.websiteUrl); }
  catch { return [...problems, 'bio リンク URL が不正']; }
  if (url.origin !== siteOrigin || url.pathname !== '/links' || url.protocol !== 'https:') {
    problems.push('bio リンクが HTTPS の /links に着地しない');
  }
  const expected = {
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: 'bio-link',
    utm_content: utm.content,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (url.searchParams.get(key) !== value) problems.push(`${key} が契約と違う`);
  }
  return problems;
}

/** 固定投稿の計画が、作成済みのカルーセルと同じ3本を指すことを検査する。 */
export function checkInstagramPinnedPlan(account, manifest) {
  const problems = [];
  const pins = account?.profile?.pinnedPosts ?? [];
  const posts = manifest?.posts ?? [];
  if (pins.length !== 3 || posts.length !== 3) problems.push('固定投稿の計画と原稿は3本ずつ必要');
  for (let i = 0; i < Math.min(pins.length, posts.length); i++) {
    const pin = pins[i];
    const post = posts[i];
    if (pin.order !== i + 1 || pin.key !== post.key) problems.push(`固定投稿 ${i + 1} の順序・IDが原稿と違う`);
    if (!['planned', 'scheduled', 'published', 'pinned'].includes(pin.status)) problems.push(`${pin.key}: 固定状態が不正`);
    if (pin.status === 'pinned' && !pin.url) problems.push(`${pin.key}: 実表示URLのない固定完了記録`);
    if (post.caption?.length > 2200 || !post.caption?.includes('プロフィールのリンク') || !post.caption?.includes('無料') || !post.caption?.includes('教材')) {
      problems.push(`${post.key}: キャプションの長さまたは導線が不足`);
    }
  }
  return problems;
}

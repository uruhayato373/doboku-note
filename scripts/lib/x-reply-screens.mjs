/**
 * X の返信候補を内蔵ブラウザで読む画面と、その画面で実行する取り出しのスクリプト（純関数）。
 * 画面は config/x-reply-trial.json の xScreens（ホームのフォロー中・おすすめなど）と、話題ごとの X の検索（最新）。
 * 読むだけで、送信・いいね・フォローはしない。投稿用アカウントの Playwright プロファイルでは読まない（x-post-policy §11.7）。
 */
import { escapeRegExp } from './regexp-escape.mjs';

/** 読む画面の一覧。検索は話題ごとに 1 画面（queries の 1 語目 ＋ xSearch.suffix）。 */
export function xScreens(config) {
  const home = (config.xScreens ?? []).map((s) => ({ ...s, kind: 'timeline' }));
  const search = config.xSearch
    ? config.topics.map((t) => {
      const q = [t.queries[0], config.xSearch.suffix].filter(Boolean).join(' ');
      return {
        id: `search-${t.id}`,
        label: `X の検索（最新）: ${q}`,
        url: `https://x.com/search?q=${encodeURIComponent(q)}&f=live`,
        scrolls: config.xSearch.scrolls,
        kind: 'search',
      };
    })
    : [];
  return [...home, ...search];
}

/**
 * 画面で javascript_tool に渡すスクリプト。タブ（フォロー中・おすすめ）を選び、スクロールしながら投稿を集め、
 * 本文に話題の語（全話題の match）を含むか、表示名に話題の語があり本文に試験の文脈の語（nameContextWords）を含む、
 * lookbackHours 以内の投稿だけを JSON の文字列で返す（判定の本体は x-reply-candidates.mjs の topicOf。ここは運ぶ量を絞るだけ）。
 * 返り値: { screen, read（読んだ投稿の数）, kept: [{ id, user, name, text, createdAt, isReply }] }
 * 広告とリポストの表示は捨てる（リポストの元の投稿者は返信の相手にならない）。
 */
export function buildExtractorJs(screen, config) {
  const words = [...new Set(config.topics.flatMap((t) => t.match))];
  const pattern = words.map(escapeRegExp).join('|');
  const context = (config.nameContextWords ?? []).map(escapeRegExp).join('|') || '(?!)';
  const lookbackMs = config.limits.lookbackHours * 3600_000;
  return `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tab = ${JSON.stringify(screen.tab ?? null)};
  if (tab) {
    const el = [...document.querySelectorAll('[role="tab"]')].find((t) => t.innerText.trim() === tab);
    if (!el) return JSON.stringify({ screen: ${JSON.stringify(screen.id)}, error: 'タブ「' + tab + '」が見つからない' });
    el.click();
    await wait(3000);
  }
  const match = new RegExp(${JSON.stringify(pattern)});
  const context = new RegExp(${JSON.stringify(context)});
  const acc = new Map();
  const read = () => {
    for (const a of document.querySelectorAll('article[data-testid="tweet"]')) {
      const head = a.innerText.slice(0, 300);
      if (/プロモーション|Promoted|広告/.test(head)) continue;
      const social = a.querySelector('[data-testid="socialContext"]')?.innerText ?? '';
      if (/リポスト|reposted/i.test(social)) continue;
      const link = [...a.querySelectorAll('a[href*="/status/"]')].find((x) => x.querySelector('time'));
      const m = link?.getAttribute('href')?.match(/^\\/([A-Za-z0-9_]{1,15})\\/status\\/(\\d+)/);
      if (!m) continue;
      acc.set(m[2], {
        id: m[2],
        user: m[1],
        name: (a.querySelector('[data-testid="User-Name"]')?.innerText ?? '').split('\\n')[0].trim(),
        text: (a.querySelector('[data-testid="tweetText"]')?.innerText ?? '').replace(/\\s+/g, ' ').trim().slice(0, 280),
        createdAt: Date.parse(link.querySelector('time').getAttribute('datetime')),
        isReply: /返信先|Replying to/.test(head),
      });
    }
  };
  for (let i = 0; i < ${Number(screen.scrolls)}; i += 1) {
    read();
    window.scrollBy(0, 2500);
    await wait(1800 + Math.random() * 1200);
  }
  read();
  const since = Date.now() - ${lookbackMs};
  const all = [...acc.values()];
  const kept = all.filter((p) => p.createdAt >= since && (match.test(p.text) || (match.test(p.name) && context.test(p.text))));
  return JSON.stringify({ screen: ${JSON.stringify(screen.id)}, read: all.length, kept });
})()`;
}

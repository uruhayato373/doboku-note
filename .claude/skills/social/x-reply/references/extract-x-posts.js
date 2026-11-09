// X のタイムライン・検索（最新）の画面から、見えている投稿を取り出す（内蔵ブラウザの javascript_tool で実行する）。
// 読むだけで、画面を操作しない。広告とリポストの表示は捨てる（リポストの元の投稿者は返信の相手にならない）。
// 出力は scripts/lib/x-reply-candidates.mjs の parseXPosts が読む形:
//   [{ id, user, text, createdAt(ms), isReply }]
// 使い方: スクロールして読み込んだあとで実行し、返った配列を .tmp/x-outreach/x-posts/<画面>-<時刻>.json に保存する。
(() => {
  const rows = [];
  for (const a of document.querySelectorAll('article[data-testid="tweet"]')) {
    const head = a.innerText.slice(0, 300);
    if (/プロモーション|Promoted|広告/.test(head)) continue;
    const social = a.querySelector('[data-testid="socialContext"]')?.innerText ?? '';
    if (/リポスト|reposted/i.test(social)) continue;
    const link = [...a.querySelectorAll('a[href*="/status/"]')].find((x) => x.querySelector('time'));
    const m = link?.getAttribute('href')?.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/);
    if (!m) continue;
    rows.push({
      id: m[2],
      user: m[1],
      text: (a.querySelector('[data-testid="tweetText"]')?.innerText ?? '').replace(/\s+/g, ' ').trim(),
      createdAt: Date.parse(link.querySelector('time').getAttribute('datetime')),
      isReply: /返信先|Replying to/.test(head),
    });
  }
  return rows;
})();

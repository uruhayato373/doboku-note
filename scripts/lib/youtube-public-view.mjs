/**
 * youtube-public-view.mjs — YouTube の公開動画を「未ログインの視聴者にどう見えるか」で判定する純関数群。
 *
 * 公開状態の照合（Data API）は既存の verify-yt-status が持つが、ドリフトを出しても workflow は緑のまま
 * 誰も読んでいなかった（2026-09-17〜 recorded_but_gone 6 件）。ここは視聴者から見られるかを oEmbed で
 * 判定して週次の失敗にし、代表動画の見た目（画面幅ごとの撮影）を扱う。
 * 実行側: scripts/check-youtube-public-view.mjs（週次 note-public-view.yml に同居）。
 */

/**
 * 2 つの台帳から公開中の動画を集める（videoId で重複を除く）。
 * - .claude/state/youtube-schedule.json: status=uploaded かつ publishAt を過ぎたもの（予約投稿の Shorts）
 * - .claude/state/video-content-status.json: privacyStatus=public のもの（入れ子のどこにあってもよい）
 */
export function collectPublicVideos(schedule, contentStatus, now = new Date()) {
  const out = new Map();
  for (const e of schedule?.items || []) {
    if (e.status !== 'uploaded' || !e.videoId || !e.publishAt) continue;
    if (new Date(e.publishAt) > now) continue;
    out.set(e.videoId, { videoId: e.videoId, title: e.title || '', kind: /#shorts/i.test(e.title || '') ? 'shorts' : 'long', date: String(e.publishAt).slice(0, 10), source: 'youtube-schedule' });
  }
  const walk = (o, path) => {
    if (!o || typeof o !== 'object') return;
    if (o.videoId && o.privacyStatus === 'public' && !out.has(o.videoId)) {
      out.set(o.videoId, { videoId: o.videoId, title: o.title || o.key || '', kind: /\/shorts(\/|$)/.test(path) ? 'shorts' : 'long', date: String(o.publishedAt || o.uploadedAt || '').slice(0, 10), source: 'video-content-status' });
    }
    for (const [k, v] of Object.entries(o)) walk(v, `${path}/${k}`);
  };
  walk(contentStatus, '');
  return [...out.values()];
}

/** Shorts は /shorts/、通常動画は /watch で開く（視聴者が実際に見るページ）。 */
export function watchUrl(v) {
  return v.kind === 'shorts' ? `https://www.youtube.com/shorts/${v.videoId}` : `https://www.youtube.com/watch?v=${v.videoId}`;
}

/**
 * YouTube oEmbed（ログイン不要・API キー不要）の HTTP ステータスで、視聴者から見られるかを判定する。
 * 200 = 公開、404 = 削除・再生不可、403 = 非公開、401 = 埋め込み不可（公開だが埋め込みを禁止）。
 * CI のブラウザでは YouTube が bot 確認でプレーヤーを隠すため、再生可否をページの文言では判定しない
 * （2026-09-23: CI で 15 本中 14 本が「Video unavailable」に見えたが、oEmbed では 2 本が 200）。
 * @returns {{ bad: string[], warn: string[], unknown: boolean }}
 */
export function classifyOembed(status) {
  if (status === 200) return { bad: [], warn: [], unknown: false };
  if (status === 404) return { bad: ['YouTube 上で削除・再生不可（oEmbed 404・台帳では公開）'], warn: [], unknown: false };
  if (status === 403) return { bad: ['非公開になっている（oEmbed 403・台帳では公開）'], warn: [], unknown: false };
  if (status === 401) return { bad: [], warn: ['埋め込みが無効（oEmbed 401）'], unknown: false };
  return { bad: [], warn: [`oEmbed を判定できない（HTTP ${status || '000'}）`], unknown: true };
}

/** 種類（Shorts / 通常動画）ごとに、公開がいちばん新しい 1 本を代表にする。同日は videoId 順。 */
export function pickYoutubeRepresentatives(list) {
  const best = new Map();
  for (const v of list) {
    const cur = best.get(v.kind);
    if (!cur || v.date > cur.date || (v.date === cur.date && v.videoId < cur.videoId)) best.set(v.kind, v);
  }
  return [...best.values()].sort((a, b) => a.kind.localeCompare(b.kind));
}

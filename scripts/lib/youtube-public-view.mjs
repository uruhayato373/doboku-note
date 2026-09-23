/**
 * youtube-public-view.mjs — YouTube の公開動画を「未ログインの視聴者にどう見えるか」で判定する純関数群。
 *
 * 公開状態の照合（API）は既存の verify-yt-status（週次・Data API）が持つ。ここは視聴ページそのものが
 * 見られるか（非公開・削除・再生不可の表示が出ていないか）と、代表動画の見た目（画面幅ごとの撮影）を扱う。
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

const UNAVAILABLE = /この動画は非公開です|動画を再生できません|この動画は利用できません|この動画は削除されました|Video unavailable|This video is private|This video isn['’]t available|This video has been removed/;
const BOT_CHECK = /ロボットではないことを確認|confirm you['’]re not a bot|Sign in to confirm/;

/**
 * 視聴ページの見え方を判定する。bot 確認に当たったときは「見られない」ではなく「検査できない」（blocked）。
 * @param {{ status: number, text: string }} m text は document.body.innerText
 * @returns {{ bad: string[], warn: string[], blocked: boolean }}
 */
export function evaluateYoutubePage({ status, text }) {
  if (BOT_CHECK.test(text || '')) return { bad: [], warn: ['YouTube の bot 確認に当たり検査できない'], blocked: true };
  const bad = [];
  if (status >= 400) bad.push(`HTTP ${status}`);
  const hit = (text || '').match(UNAVAILABLE);
  if (hit) bad.push(`視聴ページに「${hit[0]}」と出る（台帳では公開）`);
  return { bad, warn: [], blocked: false };
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

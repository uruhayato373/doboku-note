/**
 * youtube-listing.mjs — YouTube のチャンネル一覧（/videos・/shorts）を yt-dlp で読み、動画ごとの再生数・尺を返す。
 *
 * 一覧（browse）だけを使い、動画の再生用 API（player）は呼ばない。player はクラウドの IP でロボット確認に止まりやすく、
 * 映像本体は 403 になる（docs/marketing/07c §3）。一覧は止まりにくい。
 * 日本語表示の一覧は「1.2万回」を数値にできない（yt-dlp が null を返す）ので、題名は日本語表示、再生数は英語表示の
 * 一覧から取り、動画 ID で結合する。投稿日は一覧に無い。
 *
 * 書き手: scripts/youtube-own-metrics.mjs（自社）・scripts/scout-youtube-competitors.mjs（競合）。集計の純関数はテストが読む。
 */
import { execFileSync } from 'node:child_process';

const YTDLP = process.env.YTDLP_BIN || 'yt-dlp';

/** 中央値（空なら null） */
export function median(values) {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : Math.round((xs[mid - 1] + xs[mid]) / 2);
}

/** 尺の区分（分）。07c の集計と同じ区切り */
export const LENGTH_BUCKETS = [
  { key: 'under5', label: '5分未満', min: 0, max: 300 },
  { key: '5to15', label: '5〜15分', min: 300, max: 900 },
  { key: '15to30', label: '15〜30分', min: 900, max: 1800 },
  { key: '30to60', label: '30〜60分', min: 1800, max: 3600 },
  { key: 'over60', label: '60分以上', min: 3600, max: Infinity },
];

/** 尺の区分ごとの本数と再生中央値（尺か再生数が無い動画は数えない） */
export function lengthBuckets(videos) {
  return LENGTH_BUCKETS.map(({ key, min, max }) => {
    const hit = videos.filter((v) => Number.isFinite(v.durationSec) && Number.isFinite(v.views) && v.durationSec >= min && v.durationSec < max);
    return { key, videos: hit.length, medianViews: median(hit.map((v) => v.views)) };
  });
}

/** 題名に語を含む動画の本数と再生中央値。語は config/youtube-formats.json の titleSignals が正本 */
export function titleSignals(videos, signals) {
  return signals.map((word) => {
    const hit = videos.filter((v) => typeof v.title === 'string' && v.title.includes(word) && Number.isFinite(v.views));
    return { word, videos: hit.length, medianViews: median(hit.map((v) => v.views)) };
  });
}

/** 一覧全体の要約 */
export function summarize(videos) {
  const withViews = videos.filter((v) => Number.isFinite(v.views));
  return {
    sampled: videos.length,
    withViews: withViews.length,
    totalViews: withViews.reduce((sum, v) => sum + v.views, 0),
    medianViews: median(withViews.map((v) => v.views)),
    medianDurationSec: median(videos.map((v) => v.durationSec)),
  };
}

/** 日本語の題名の一覧と英語の数値の一覧を動画 ID で結合する（並びは日本語の一覧＝新しい順） */
export function joinListings(jaEntries, enEntries) {
  const counts = new Map(enEntries.map((e) => [e.id, e]));
  return jaEntries.map((e) => {
    const en = counts.get(e.id);
    const views = Number.isFinite(en?.view_count) ? en.view_count : Number.isFinite(e.view_count) ? e.view_count : null;
    const duration = Number.isFinite(e.duration) ? e.duration : Number.isFinite(en?.duration) ? en.duration : null;
    return { id: e.id, title: e.title ?? en?.title ?? null, views, durationSec: duration === null ? null : Math.round(duration) };
  });
}

function flatListing(url, lang, limit) {
  const out = execFileSync(YTDLP, ['--flat-playlist', '-J', '--playlist-end', String(limit), '--extractor-args', `youtube:lang=${lang}`, url], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 240_000, stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(out);
}

/**
 * チャンネルの一覧を読む。tab は 'videos'（通常動画）か 'shorts'。
 * 「タブが無い」（Shorts を出していない等）は空の一覧として返し、それ以外の失敗は投げる。
 * @returns {{ channelId: string, title: string|null, subscriberCount: number|null, videos: {id,title,views,durationSec}[] }}
 */
export function listChannel(channelId, tab, { limit = 100 } = {}) {
  const url = channelId.startsWith('@') ? `https://www.youtube.com/${channelId}/${tab}` : `https://www.youtube.com/channel/${channelId}/${tab}`;
  let ja;
  try {
    ja = flatListing(url, 'ja', limit);
  } catch (e) {
    if (/does not have a \w+ tab/.test(String(e.stderr ?? e.message))) return { channelId, title: null, subscriberCount: null, videos: [] };
    throw new Error(`一覧を取得できない（${channelId}/${tab}）: ${String(e.stderr ?? e.message).trim().split('\n').pop()}`);
  }
  const en = flatListing(url, 'en', limit);
  return {
    channelId: ja.channel_id ?? channelId,
    title: ja.channel ?? null,
    subscriberCount: Number.isFinite(en.channel_follower_count) ? en.channel_follower_count : Number.isFinite(ja.channel_follower_count) ? ja.channel_follower_count : null,
    videos: joinListings(ja.entries ?? [], en.entries ?? []),
  };
}

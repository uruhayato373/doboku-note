// youtube-purge-shorts.mjs — チャンネルに残る古い非公開ショートを消す対象の判定（純関数）。
// 2026-11-10: 運営者が、旧工程のショートを消してから新しい通常動画の派生として企画し直すと決めた。
// 実際の API 呼び出しは scripts/youtube-purge-shorts.mjs。リポジトリは公開なので、非公開動画の ID・題名はログへ出さない。
import { createHash } from 'node:crypto';
import { durationSeconds } from './youtube-migration.mjs';

export const SHORT_MAX_SEC = 180;

/** 台帳で守る動画 ID（予約済み・公開済みの行と、止めていない通常動画の行） */
export function protectedIds(publications) {
  const keep = (p) => ['scheduled', 'published'].includes(p.status) || (p.format === 'longform' && p.status !== 'stopped');
  return new Set(publications.filter((p) => p.channel === 'youtube' && keep(p)).flatMap((p) => [p.platform?.id, p.delivery?.videoId]).filter(Boolean));
}

/**
 * 1 本の扱いを決める。消すのは「非公開・予約なし・縦長・3 分以内・台帳で守られていない」をすべて満たすものだけ。
 * 縦横が読めないものは消さない（判定できないものを対象に入れない）。
 */
export function classify(video, keep) {
  const status = video.status ?? {};
  if (keep.has(video.id)) return 'protected';
  if (status.privacyStatus !== 'private') return 'not-private';
  if (status.publishAt) return 'scheduled';
  const stream = video.fileDetails?.videoStreams?.[0];
  if (!stream?.widthPixels || !stream?.heightPixels) return 'shape-unknown';
  // 回転の情報つきの縦動画は幅と高さが入れ替わって記録される
  const rotated = ['clockwise', 'counterClockwise'].includes(stream.rotation);
  const [w, h] = rotated ? [stream.heightPixels, stream.widthPixels] : [stream.widthPixels, stream.heightPixels];
  if (h <= w) return 'landscape';
  let sec;
  try { sec = durationSeconds(video.contentDetails?.duration); } catch { return 'shape-unknown'; }
  return sec <= SHORT_MAX_SEC ? 'purge' : 'long-vertical';
}

/** 消す計画。digest は対象の ID の集合で決まり、実行は同じ digest を渡したときだけ進む */
export function purgePlan(videos, publications) {
  const keep = protectedIds(publications);
  const counts = {};
  const targets = [];
  for (const video of videos) {
    const kind = classify(video, keep);
    counts[kind] = (counts[kind] ?? 0) + 1;
    if (kind === 'purge') targets.push(video);
  }
  targets.sort((a, b) => a.id.localeCompare(b.id));
  const digest = createHash('sha256').update(targets.map((v) => v.id).join('\n')).digest('hex');
  const byMonth = {};
  for (const v of targets) { const m = (v.snippet?.publishedAt ?? '不明').slice(0, 7); byMonth[m] = (byMonth[m] ?? 0) + 1; }
  // 台帳の行（公開 ID はリポジトリで公開済み）と結べるものは、後で台帳を止めるために返す
  const rowById = new Map(publications.filter((p) => p.platform?.id).map((p) => [p.platform.id, p.id]));
  const ledgerRows = targets.map((v) => rowById.get(v.id)).filter(Boolean).sort();
  return { checked: videos.length, counts, targets, digest, byMonth, ledgerRows };
}

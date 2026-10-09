#!/usr/bin/env node
/**
 * youtube-own-metrics.mjs — 自社 YouTube チャンネルの動画ごとの再生数・尺を一覧から取り、月次の時系列に残す（read-only）。
 *
 * チャンネルは config/youtube-formats.json の channel。動画パックとの対応はコンテンツ台帳（content/registry）の
 * videoId で取り、型は youtube-formats の packIds（試作など）→ 動画パック由来の Shorts は pack-shorts → 残りの通常動画は
 * single-topic-text とする。取得の仕組みと限界は scripts/lib/youtube-listing.mjs。
 * 出力: data/youtube/own-videos/<JST の日付>.json（台帳 youtube.own-videos）。同じ日にもう一度回すと上書きする。
 *
 * 使い方:
 *   npm run youtube-own-metrics                 # 取得して保存
 *   npm run youtube-own-metrics -- --dry-run    # 取得して要約だけ表示（保存しない）
 *   npm run youtube-own-metrics -- --limit 600  # 一覧から取る本数の上限（既定 500・タブごと）
 * 取得に失敗したら何も書かず exit 1。
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDataset } from './lib/dataset-io.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { loadVideoState } from './lib/registry-video-state.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { lengthBuckets, listChannel, summarize, titleSignals } from './lib/youtube-listing.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const li = argv.indexOf('--limit');
const LIMIT = li >= 0 ? Math.max(1, parseInt(argv[li + 1], 10) || 500) : 500;

/** videoId → { packId, kind }（動画パックの公開状態から） */
export function packIndex(status) {
  const index = new Map();
  for (const [packId, pack] of Object.entries(status?.packs ?? {})) {
    const lf = pack.derivatives?.longform;
    if (lf?.videoId) index.set(lf.videoId, { packId, kind: 'longform' });
    for (const s of pack.derivatives?.shorts ?? []) if (s.videoId) index.set(s.videoId, { packId, kind: 'short' });
  }
  return index;
}

/** 型 id を決める（試作パックの packIds が最優先） */
export function formatOf(video, pack, formats) {
  if (!pack) return null;
  const listed = formats.find((f) => (f.packIds ?? []).includes(pack.packId));
  if (listed) return listed.id;
  return video.kind === 'short' ? 'pack-shorts' : 'single-topic-text';
}

/** 一覧と対応表から記録を組み立てる（ネットワークに出ない純関数） */
export function buildOwnSnapshot({ fetchedAt, channel, subscriberCount, longform, shorts, index, formats, signals }) {
  const videos = [
    ...longform.map((v) => ({ ...v, kind: 'longform' })),
    ...shorts.map((v) => ({ ...v, kind: 'short' })),
  ].map((v) => {
    const pack = index.get(v.id) ?? null;
    return { id: v.id, title: v.title, views: v.views, durationSec: v.durationSec, kind: v.kind, packId: pack?.packId ?? null, format: formatOf(v, pack, formats) };
  });
  const groups = new Map();
  for (const v of videos) {
    const key = `${v.format ?? ''}\u0000${v.kind}`;
    if (!groups.has(key)) groups.set(key, { format: v.format, kind: v.kind, videos: [] });
    groups.get(key).videos.push(v);
  }
  return {
    schemaVersion: 1,
    fetchedAt,
    source: 'yt-dlp のチャンネル一覧（/videos・/shorts。日本語表示の題名と英語表示の再生数を動画 ID で結合）',
    caveat: '再生数は累計で、公開日の新しい動画ほど小さい。視聴維持率・インプレッションのクリック率・流入元は一覧に無い（YouTube Analytics が要る）。Shorts の尺は一覧に出ないことがある',
    channel: { id: channel.id, handle: channel.handle, subscriberCount },
    summary: { longform: summarize(longform), shorts: summarize(shorts) },
    lengthBuckets: lengthBuckets(longform),
    titleSignals: titleSignals(longform, signals),
    byFormat: [...groups.values()].map((g) => ({ format: g.format, kind: g.kind, stats: summarize(g.videos) })),
    videos,
  };
}

function main() {
  const config = readDataset(ROOT, 'config.youtube-formats');
  const status = loadVideoState(ROOT);
  const long = listChannel(config.channel.id, 'videos', { limit: LIMIT });
  const short = listChannel(config.channel.id, 'shorts', { limit: LIMIT });
  const snapshot = buildOwnSnapshot({
    fetchedAt: new Date().toISOString(),
    channel: config.channel,
    subscriberCount: long.subscriberCount ?? short.subscriberCount,
    longform: long.videos,
    shorts: short.videos,
    index: packIndex(status),
    formats: config.formats,
    signals: config.titleSignals,
  });
  const { longform, shorts } = snapshot.summary;
  console.log(`[youtube-own-metrics] 通常動画 ${longform.sampled} 本（再生数あり ${longform.withViews}・合計 ${longform.totalViews}・中央値 ${longform.medianViews}）／Shorts ${shorts.sampled} 本（再生数あり ${shorts.withViews}）・登録者 ${snapshot.channel.subscriberCount ?? '不明'}`);
  for (const g of snapshot.byFormat) console.log(`  ${g.kind} ${g.format ?? '(パック外)'}: ${g.stats.sampled} 本・中央値 ${g.stats.medianViews}`);
  if (longform.sampled + shorts.sampled === 0) {
    console.error('[youtube-own-metrics] 一覧が 0 本（取得の失敗を疑う）。保存しない');
    process.exit(1);
  }
  if (DRY) return;
  const stamp = todayJst();
  const { file } = writeDataset(ROOT, 'youtube.own-videos', snapshot, { values: { date: stamp } });
  console.log(`[youtube-own-metrics] 保存: ${file}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (e) {
    console.error(`[youtube-own-metrics] 失敗: ${e.message}`);
    process.exit(1);
  }
}

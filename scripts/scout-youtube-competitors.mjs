#!/usr/bin/env node
/**
 * scout-youtube-competitors.mjs — YouTube の競合チャンネルの時系列偵察（read-only・四半期）
 * ---------------------------------------------------------------------------
 * config/competitors.json の youtube の各チャンネル（handle＝チャンネル ID）について、通常動画の一覧（新しい順・既定 100 本）
 * から再生数・尺を取り、要約（中央値）・尺の区分・題名の語（config/youtube-formats.json の titleSignals）ごとの再生中央値・
 * 再生上位を残す。前回の時系列と比べて登録者数の変化と新しい動画の本数を drift に出す。
 * 取得の仕組みと限界は scripts/lib/youtube-listing.mjs（一覧だけを読み、動画の再生用 API と映像は触らない）。
 * 登録者数の推移は scan-qualification-market（市場スキャン）も取る。こちらは動画の中身（尺・型・再生）を見るための記録。
 *
 * 使い方:
 *   npm run scout-youtube-competitors                       # 全チャンネル → data/youtube/competitors/<日付>.json
 *   npm run scout-youtube-competitors -- --handle UC...     # 1 チャンネルだけ（時系列を汚さず .tmp/ に書く）
 *   npm run scout-youtube-competitors -- --limit 150        # 一覧から取る本数（既定 100）
 * 1 チャンネルの失敗は error の行として残して続ける。全チャンネルが失敗したら保存せず exit 1（検査不成立）。
 * ---------------------------------------------------------------------------
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { loadPreviousSnapshot, saveSnapshot } from './lib/competitor-history.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { lengthBuckets, listChannel, summarize, titleSignals } from './lib/youtube-listing.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ID = 'youtube.competitors';
const argv = process.argv.slice(2);
const opt = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const HANDLE = opt('--handle') ?? null;
const LIMIT = Math.max(10, parseInt(opt('--limit') ?? '100', 10) || 100);
const RECENT = 30;

/** 1 チャンネルの一覧から行を作る（ネットワークに出ない純関数） */
export function buildRow(entry, listing, signals) {
  const { handle, label = null, exams = [], note = null } = entry;
  const videos = listing.videos;
  const top = videos.filter((v) => Number.isFinite(v.views)).sort((a, b) => b.views - a.views).slice(0, 5);
  return {
    handle, label, exams, note,
    profile: { title: listing.title, subscriberCount: listing.subscriberCount },
    counts: summarize(videos),
    cadence: null,
    platformExtra: {
      lengthBuckets: lengthBuckets(videos),
      titleSignals: titleSignals(videos, signals),
      recentIds: videos.slice(0, RECENT).map((v) => v.id),
      top,
    },
  };
}

/** 前回の時系列との違い */
export function computeDrift(rows, previous) {
  if (!previous) return [];
  const before = new Map((previous.competitors ?? []).map((r) => [r.handle, r]));
  const now = new Map(rows.map((r) => [r.handle, r]));
  const drift = [];
  for (const r of rows) {
    const p = before.get(r.handle);
    if (!p) { drift.push({ handle: r.handle, type: 'new-entrant', detail: `${r.label ?? r.handle} を追跡に追加` }); continue; }
    if (r.error || p.error) continue;
    const a = p.profile?.subscriberCount, b = r.profile?.subscriberCount;
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) drift.push({ handle: r.handle, type: 'subscribers', before: a, after: b, detail: `登録者 ${a}→${b}（${b - a >= 0 ? '+' : ''}${b - a}）` });
    const seen = new Set(p.platformExtra?.recentIds ?? []);
    if (seen.size > 0) {
      const fresh = (r.platformExtra?.recentIds ?? []).filter((id) => !seen.has(id)).length;
      if (fresh > 0) drift.push({ handle: r.handle, type: 'new-videos', after: fresh, detail: `新しい通常動画 ${fresh} 本${fresh >= RECENT ? '以上' : ''}（一覧の先頭 ${RECENT} 本で比較）` });
    }
  }
  for (const [handle, p] of before) if (!now.has(handle)) drift.push({ handle, type: 'dropped', detail: `${p.label ?? handle} を追跡から外した` });
  return drift;
}

async function main() {
  const config = readDataset(ROOT, 'config.competitors').youtube.competitors;
  const signals = readDataset(ROOT, 'config.youtube-formats').titleSignals;
  const targets = HANDLE ? config.filter((c) => c.handle === HANDLE) : config;
  if (targets.length === 0) {
    console.error(`[scout-youtube-competitors] 対象 0 件（--handle ${HANDLE} は台帳 config.competitors の youtube に無い）`);
    process.exit(1);
  }
  const rows = [];
  for (const [i, entry] of targets.entries()) {
    if (i > 0) await sleep(6000);
    try {
      const listing = listChannel(entry.handle, 'videos', { limit: LIMIT });
      rows.push(buildRow(entry, listing, signals));
      const c = rows.at(-1).counts;
      console.log(`  ${entry.label ?? entry.handle}: ${c.sampled} 本・中央値 ${c.medianViews}・登録者 ${listing.subscriberCount ?? '不明'}`);
    } catch (e) {
      rows.push({ handle: entry.handle, label: entry.label ?? null, exams: entry.exams ?? [], note: entry.note ?? null, profile: null, error: e.message.slice(0, 300) });
      console.log(`  ${entry.label ?? entry.handle}: 失敗（${e.message.slice(0, 120)}）`);
    }
  }
  const ok = rows.filter((r) => !r.error).length;
  console.log(`[scout-youtube-competitors] 対象 ${targets.length} 件・取得 ${ok} 件・失敗 ${targets.length - ok} 件`);
  if (ok === 0) {
    console.error('[scout-youtube-competitors] 全件失敗（検査不成立）。保存しない');
    process.exit(1);
  }
  const stamp = todayJst();
  const partial = Boolean(HANDLE);
  const previous = partial ? null : loadPreviousSnapshot(ROOT, ID, stamp);
  const snapshot = {
    schemaVersion: 1,
    fetchedAt: new Date().toISOString(),
    platform: 'youtube',
    source: 'yt-dlp のチャンネル一覧（/videos・新しい順。日本語表示の題名と英語表示の再生数・登録者数を動画 ID で結合）',
    caveat: `通常動画の一覧の先頭 ${LIMIT} 本だけ（Shorts・ライブは含まない）。再生数は累計で、古い動画・登録者の多いチャンネルほど大きい。投稿日は一覧に無いため cadence は null。登録者数は一覧ページの概数`,
    driftBasis: previous?.file ?? null,
    drift: computeDrift(rows, previous?.data ?? null),
    competitors: rows,
  };
  if (partial) {
    console.log(`[scout-youtube-competitors] 部分実行: ${saveSnapshot(ROOT, ID, stamp, snapshot, { partial: true })}`);
    return;
  }
  const { file } = writeDataset(ROOT, ID, snapshot, { values: { date: stamp } });
  console.log(`[scout-youtube-competitors] 保存: ${file}（drift ${snapshot.drift.length} 件・基準 ${snapshot.driftBasis ?? 'なし'}）`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(`[scout-youtube-competitors] 失敗: ${e.message}`);
    process.exit(1);
  });
}

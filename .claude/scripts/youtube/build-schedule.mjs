#!/usr/bin/env node
/**
 * YouTube Shorts 予約投稿の台帳（schedule）を生成する。
 *
 * content/sns/youtube/*-qN/meta.json を全件読み、publishAt を 1日 N本（既定3本）・
 * JST スロット（07:30/12:30/20:00）で順に割り当て、`.claude/state/youtube-schedule.json`
 * に書き出す。これが「どの動画を・いつ予約したか」の真実源。
 *
 * 投稿実体（CI: post-from-schedule.cjs）はこの台帳を読み、publishAt が近い pending を
 * R2 から取得して YouTube に private+publishAt でアップし、videoId/uploadedAt/status を書き戻す。
 *
 * Usage:
 *   node .claude/scripts/youtube/build-schedule.mjs --start 2026-06-08
 *   node .claude/scripts/youtube/build-schedule.mjs --start 2026-06-08 --per-day 3
 *   （--preserve: 既存台帳の status/videoId/uploadedAt を key 単位で引き継ぐ）
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

const args = process.argv.slice(2);
const getArg = (k, def) => { const i = args.indexOf(k); return i !== -1 ? args[i + 1] : def; };
const startStr = getArg('--start', null);
const perDay = Number(getArg('--per-day', '3'));
const slotsJST = ['07:30', '12:30', '20:00'].slice(0, perDay);
const preserve = args.includes('--preserve');
const R2_PUBLIC_BASE = 'https://storage.doboku-note.com/sns/youtube-shorts/';
const LEDGER = '.claude/state/youtube-schedule.json';

if (!startStr || !/^\d{4}-\d{2}-\d{2}$/.test(startStr)) {
  console.error('Error: --start YYYY-MM-DD（公開開始日・JST）が必須');
  process.exit(1);
}

function stableKey(dir) {
  const m = dir.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
  return m ? m[1] : dir;
}
/** startDate(JST) に dayOffset 日足した YYYY-MM-DD を返す（UTC 正午基準で DST 無し JST 固定）。 */
function addDays(ymd, n) {
  const [y, mo, d] = ymd.split('-').map(Number);
  const base = Date.UTC(y, mo - 1, d) + n * 86400000;
  const dt = new Date(base);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// 既存台帳の引き継ぎ（再生成しても投稿済み状態を失わない）
const prev = preserve && existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : null;
const prevByKey = {};
if (prev) for (const it of prev.items || []) prevByKey[it.key] = it;

const root = 'content/sns/youtube';
const dirs = readdirSync(root).filter((d) => /-q\d+$/.test(d) && statSync(join(root, d)).isDirectory());
// 安定キーで一意化＋ソート（同一 key の重複 dir は最後を採用）
const byKey = {};
for (const d of dirs) byKey[stableKey(d)] = d;
const keys = Object.keys(byKey).sort();

const items = keys.map((key, i) => {
  const meta = JSON.parse(readFileSync(join(root, byKey[key], 'meta.json'), 'utf8'));
  const day = Math.floor(i / perDay);
  const slot = i % perDay;
  const publishAt = `${addDays(startStr, day)}T${slotsJST[slot]}:00+09:00`;
  const carry = prevByKey[key] || {};
  return {
    key,
    title: meta.title,
    description: meta.description,
    tags: meta.tags || [],
    categoryId: meta.categoryId || '27',
    r2Key: `sns/youtube-shorts/${key}.mp4`,
    r2Url: `${R2_PUBLIC_BASE}${key}.mp4`,
    durationSeconds: meta.durationSeconds,
    publishAt,
    status: carry.status || 'pending',
    videoId: carry.videoId || null,
    uploadedAt: carry.uploadedAt || null,
  };
});

const ledger = {
  meta: {
    perDay,
    slotsJST,
    startDate: startStr,
    uploadBatchPerDay: 6,           // YouTube videos.insert quota（約6本/日）
    leadDays: 4,                    // publishAt の何日前までを先行アップ対象にするか
    r2Bucket: 'doboku-note',
    r2PublicBase: R2_PUBLIC_BASE,
    total: items.length,
    note: 'publishAt=公開予約時刻(JST)。CI post-from-schedule.cjs が pending を先行アップしてvideoIdを記録する。',
  },
  items,
};

mkdirSync(dirname(LEDGER), { recursive: true });
writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
const lastDay = Math.ceil(items.length / perDay) - 1;
console.log(`台帳生成: ${items.length} 本 → ${LEDGER}`);
console.log(`  公開: ${perDay}本/日 × スロット ${slotsJST.join('/')} JST`);
console.log(`  期間: ${startStr} 〜 ${addDays(startStr, lastDay)}（${lastDay + 1}日間）`);
console.log(`  引き継ぎ status: ${items.filter((x) => x.status !== 'pending').length} 本`);

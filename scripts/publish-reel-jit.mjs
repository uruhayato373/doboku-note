#!/usr/bin/env node
/**
 * JIT（Just-In-Time）IG リール予約: 生成 → 予約 → mp4 削除 を1コマンドで。
 *
 * 設計思想（2026-06-09）: 動画 mp4 は再生成可能な派生物。**在庫として持たず**、
 * 投稿の直前に slide-data から生成し、Business Suite に予約したら**即削除**する。
 * これでリポジトリ/ディスクに mp4 を溜めない（SoT は slide-data.json + reels/wav）。
 *
 * フロー:
 *   1. per-problem-shorts.mjs --ig-mode で reels-pp/q<N>/{video.mp4, caption.txt} を生成
 *   2. publish-ig-bs.ts post <q-dir> --reel --schedule <dt> で予約（Meta 側が動画を保持）
 *   3. 予約成功なら video.mp4 を削除（caption.txt / status.json は記録として残す）
 *
 * Usage:
 *   node scripts/publish-reel-jit.mjs --pack r07-pack-01 --question 1 --schedule 2026-06-20T12:30
 *   node scripts/publish-reel-jit.mjs --pack r07-pack-06 --question 2 --schedule 2026-06-21T12:30 --keep
 *
 * オプション:
 *   --pack r07-pack-01   対象パック（必須）
 *   --question 1         問番（必須・1-4）
 *   --schedule <dt>      予約日時 JST（YYYY-MM-DDTHH:MM、必須）
 *   --exam-dir 技術士総監  試験軸（既定）
 *   --keep               予約後も mp4 を残す（デバッグ用）
 *   --dry-run            生成＋publish --dry-run まで（実予約せず、mp4 も残す）
 *
 * 前提: ffmpeg。問題短ナレ wav（.tmp/yt-gen/narration）＋ reels/wav（コミット済）。
 *   ナレ未生成の環境では先に短ナレ生成が必要（Phase 2 で恒久化予定）。
 */
import { spawnSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = resolve(import.meta.dirname, '..');
const PPS = join(ROOT, '.claude/skills/social/yt-shorts-create/scripts/per-problem-shorts.mjs');
const PUBLISH = join(ROOT, '.claude/skills/social/publish-ig-bs/publish-ig-bs.ts');

const { values } = parseArgs({
  options: {
    pack: { type: 'string' },
    question: { type: 'string' },
    schedule: { type: 'string' },
    'exam-dir': { type: 'string', default: '技術士総監' },
    keep: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
  },
});

const pack = values.pack;
const q = values.question;
const schedule = values.schedule;
if (!pack || !/^r\d{2}-pack-\d{2}$/.test(pack)) { console.error('🚨 --pack r07-pack-01 形式で指定'); process.exit(1); }
if (!q || !/^[1-4]$/.test(q)) { console.error('🚨 --question 1-4 を指定'); process.exit(1); }
if (!schedule || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(schedule)) { console.error('🚨 --schedule YYYY-MM-DDTHH:MM を指定'); process.exit(1); }

const examDir = values['exam-dir'];
const year = pack.split('-')[0];          // r07
const packNum = pack.split('-')[2];       // 01
const qRel = `${examDir}/exam-packs/${year}/pack-${packNum}/reels-pp/q${q}`;
const qAbs = join(ROOT, 'content/sns/instagram', qRel);
const mp4 = join(qAbs, 'video.mp4');
const coverPng = join(qAbs, 'cover.png');

function run(cmd, args, label) {
  console.log(`\n▶ ${label}: ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0) { console.error(`🚨 ${label} 失敗 (exit ${r.status})`); process.exit(r.status || 1); }
}

console.log(`🎬 JIT リール: ${pack} q${q} → ${schedule}`);

// 1. 生成
run('node', [PPS, '--ig-mode', '--year', year, '--pack', pack, '--questions', q], '生成(per-problem --ig-mode)');
if (!existsSync(mp4)) { console.error(`🚨 生成 mp4 が見つからない: ${mp4}`); process.exit(1); }

// 2. 予約
const pubArgs = ['tsx', PUBLISH, 'post', qRel, '--reel', '--schedule', schedule];
if (values['dry-run']) pubArgs.push('--dry-run');
run('npx', pubArgs, values['dry-run'] ? '予約(dry-run)' : '予約(本番)');

// 3. mp4 / cover.png 削除（在庫を持たない）
if (values['dry-run']) {
  console.log('🧪 dry-run: mp4 / cover.png は残します');
} else if (values.keep) {
  console.log('ℹ️  --keep: mp4 / cover.png を残します');
} else {
  rmSync(mp4, { force: true });
  rmSync(coverPng, { force: true });
  console.log(`🗑  mp4 / cover.png 削除（在庫ゼロ）: ${qRel}/`);
}
console.log('✅ JIT 完了（caption.txt / status.json は記録として保持）');

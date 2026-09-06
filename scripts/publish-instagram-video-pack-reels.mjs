#!/usr/bin/env node
/**
 * video-pack 派生 Instagram Reels を、Meta の29日予約窓内だけ Business Suite へ投入する。
 * 既定 dry-run（先頭1件で最終確定直前まで）。--commit で予約する。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const BASE = join(ROOT, 'content/sns/instagram/video-packs');
const PUBLISHER = join(ROOT, '.claude/skills/social/publish-ig-bs/publish-ig-bs.ts');
const argv = process.argv.slice(2);
const commit = argv.includes('--commit');
const arg = (name, fallback) => {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const max = Math.max(1, Number(arg('--max', commit ? '999' : '1')) || 1);
const now = Date.now();
const minTime = now + 20 * 60 * 1000;
const maxTime = now + 29 * 24 * 60 * 60 * 1000;
const metaPaths = [];
function sha256(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name === 'meta.json' && dirname(path).endsWith('/reels')) metaPaths.push(path);
  }
}
walk(BASE);

const candidates = metaPaths.map((metaPath) => {
  const reelsDir = dirname(metaPath);
  const packDir = dirname(reelsDir);
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const statusPath = join(packDir, 'status.json');
  const status = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf8')).reel : null;
  return { meta, packDir, reelsDir, status };
}).filter((row) => {
  const at = new Date(row.meta.publishAt).getTime();
  return !['scheduled', 'posted'].includes(row.status?.status) && at >= minTime && at <= maxTime;
}).sort((a, b) => a.meta.publishAt.localeCompare(b.meta.publishAt)).slice(0, max);

console.log(`[ig-video-pack-reels] ${commit ? 'commit' : 'dry-run'} 対象 ${candidates.length}本（Meta 29日窓）`);
for (const row of candidates) console.log(`  ${row.meta.publishAt} ${relative(ROOT, row.packDir)}`);
if (candidates.length === 0) process.exit(0);

for (const row of candidates) {
  const video = join(row.reelsDir, 'video.mp4');
  const cover = join(row.reelsDir, 'cover.png');
  if (!existsSync(video) || !existsSync(cover)) throw new Error(`${row.meta.sourcePackId}/${row.meta.key}: video/cover がありません`);
  if (row.meta.sha256 !== sha256(video) || row.meta.coverSha256 !== sha256(cover)
      || !(Number(row.meta.durationSeconds) >= 30 && Number(row.meta.durationSeconds) <= 60)) {
    throw new Error(`${row.meta.sourcePackId}/${row.meta.key}: 検証済みレンダーではありません`);
  }
}

if (commit && candidates.length > 1) {
  const batchDir = join(ROOT, '.tmp/instagram-video-pack-reels');
  mkdirSync(batchDir, { recursive: true });
  const batchFile = join(batchDir, 'publish-batch.json');
  writeFileSync(batchFile, `${JSON.stringify({ items: candidates.map((row) => ({
    packArg: row.packDir,
    schedule: row.meta.publishAt.slice(0, 16),
  })) }, null, 2)}\n`);
  const result = spawnSync('npx', ['tsx', PUBLISHER, 'batch', batchFile], { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Business Suite 一括予約失敗');
} else for (const [index, row] of candidates.entries()) {
  const dt = row.meta.publishAt.slice(0, 16);
  const command = ['tsx', PUBLISHER, 'post', row.packDir, '--reel', '--schedule', dt];
  if (!commit) command.push('--dry-run');
  console.log(`[${index + 1}/${candidates.length}] ${row.meta.sourcePackId}/${row.meta.key} @ ${dt}`);
  const result = spawnSync('npx', command, { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${row.meta.sourcePackId}/${row.meta.key}: Business Suite 予約失敗`);
}
console.log(`[ig-video-pack-reels] ${commit ? '予約投入' : 'dry-run'} 完了 ${candidates.length}本`);

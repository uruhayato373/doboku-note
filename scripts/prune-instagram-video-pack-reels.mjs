#!/usr/bin/env node
/**
 * Driveクラウド照合済みのInstagram Reelsだけを、ローリング29日作業セットへ縮小する。
 * 既定dry-run。--commitで scheduled/posted と29日枠外の video.mp4 を削除する。
 */
import {
  existsSync, readFileSync, readdirSync, rmdirSync, statSync, unlinkSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const BASE = join(ROOT, 'content/sns/instagram/video-packs');
const DRIVE_MANIFEST = join(ROOT, '.claude/state/assets/drive-manifest.json');
const DRIVE_CONFIG = join(ROOT, '.claude/config/drive-vault.json');
const TMP_ROOT = join(ROOT, '.tmp/instagram-video-pack-reels');
const argv = process.argv.slice(2);
const commit = argv.includes('--commit');
const verifyCloud = argv.includes('--cloud');
const purgeIntermediates = argv.includes('--intermediates');
const arg = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
};
const verifiedListPath = resolve(ROOT, arg('--verified-list') ?? '.tmp/ig-reels-drive-ok.txt');
const now = Date.now();
const maxTime = now + 29 * 24 * 60 * 60 * 1000;

function sha256(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function walkMeta(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkMeta(path, out);
    else if (name === 'meta.json' && dirname(path).endsWith('/reels')) out.push(path);
  }
  return out;
}
function clearIntermediates(dir) {
  let files = 0;
  let bytes = 0;
  if (!existsSync(dir)) return { files, bytes };
  const visit = (current) => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      const info = statSync(path);
      if (info.isDirectory()) visit(path);
      else {
        files += 1;
        bytes += info.size;
        unlinkSync(path);
      }
    }
    if (current !== dir) rmdirSync(current);
  };
  visit(dir);
  rmdirSync(dir);
  return { files, bytes };
}

if (!existsSync(DRIVE_MANIFEST)) throw new Error('Drive台帳がありません');
if (!verifyCloud && !existsSync(verifiedListPath)) throw new Error(`クラウド照合済み一覧がありません: ${verifiedListPath}`);
const manifest = JSON.parse(readFileSync(DRIVE_MANIFEST, 'utf8'));
let verified;
if (verifyCloud) {
  const config = JSON.parse(readFileSync(DRIVE_CONFIG, 'utf8'));
  const group = config.groups.find((entry) => entry.id === 'sns-archived-media');
  if (!group) throw new Error('sns-archived-media group がありません');
  const remote = `${config.cloud.rcloneRemote}:${config.cloud.remoteRoot}/${group.vaultDir}`;
  const result = spawnSync('rclone', ['lsjson', '--hash', '--recursive', '--files-only', remote], {
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`Driveクラウド一覧を取得できません: ${result.stderr}`);
  const cloud = new Map(JSON.parse(result.stdout || '[]').map((item) => [item.Path, {
    md5: item.Hashes?.md5 ?? item.Hashes?.MD5,
    bytes: item.Size,
  }]));
  verified = new Set(Object.entries(manifest.entries ?? {}).flatMap(([rel, entry]) => {
    if (entry.group !== group.id || !rel.startsWith('content/sns/instagram/video-packs/')) return [];
    const key = entry.vaultPath.replace(`${group.vaultDir}/`, '');
    const actual = cloud.get(key);
    return actual?.md5 === entry.md5 && actual.bytes === entry.bytes ? [rel] : [];
  }));
} else {
  verified = new Set(readFileSync(verifiedListPath, 'utf8').split(/\r?\n/u).filter(Boolean));
}
const rows = walkMeta(BASE).map((metaPath) => {
  const reelsDir = dirname(metaPath);
  const packDir = dirname(reelsDir);
  const videoPath = join(reelsDir, 'video.mp4');
  const rel = relative(ROOT, videoPath).replace(/\\/g, '/');
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const statusPath = join(packDir, 'status.json');
  const status = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf8')).reel : null;
  const entry = manifest.entries?.[rel];
  const localMatches = !existsSync(videoPath) || sha256(videoPath) === meta.sha256;
  const archived = entry?.group === 'sns-archived-media'
    && entry.sha256 === meta.sha256
    && verified.has(rel)
    && localMatches;
  const scheduled = ['scheduled', 'posted'].includes(status?.status);
  const outsideWindow = new Date(meta.publishAt).getTime() > maxTime;
  return { videoPath, rel, archived, scheduled, outsideWindow };
});

const unsafe = rows.filter((row) => !row.archived);
if (rows.length !== 224 || verified.size !== 224 || unsafe.length) {
  throw new Error(`purge gate失敗: rows=${rows.length} verified=${verified.size} unsafe=${unsafe.length}`);
}
const targets = rows.filter((row) => existsSync(row.videoPath) && (row.scheduled || row.outsideWindow));
const keep = rows.filter((row) => existsSync(row.videoPath) && !row.scheduled && !row.outsideWindow);
const bytes = targets.reduce((sum, row) => sum + statSync(row.videoPath).size, 0);
console.log(JSON.stringify({ mode: commit ? 'commit' : 'dry-run', archived: rows.length, prune: targets.length, keep: keep.length, pruneMiB: Number((bytes / 1048576).toFixed(2)), purgeIntermediates }, null, 2));

if (!commit) process.exit(0);
for (const row of targets) unlinkSync(row.videoPath);
let intermediate = { files: 0, bytes: 0 };
if (purgeIntermediates) intermediate = clearIntermediates(TMP_ROOT);
console.log(JSON.stringify({ pruned: targets.length, prunedMiB: Number((bytes / 1048576).toFixed(2)), intermediates: intermediate.files, intermediateMiB: Number((intermediate.bytes / 1048576).toFixed(2)) }, null, 2));

#!/usr/bin/env node
/**
 * Driveクラウド照合済みの動画レンダーだけをローカルから除去する。
 * QA待ち・rendered の通常動画とサムネイルは作業セットとして残す。
 * 既定dry-run。--commitで削除する。
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync, readFileSync, readdirSync, rmdirSync, statSync, unlinkSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const BASE = join(ROOT, '.tmp/video-render');
const STATE_PATH = join(ROOT, '.claude/state/video-content-status.json');
const DRIVE_MANIFEST = join(ROOT, '.claude/state/assets/drive-manifest.json');
const DRIVE_CONFIG = join(ROOT, '.claude/config/drive-vault.json');
const argv = process.argv.slice(2);
const commit = argv.includes('--commit');
const verifyCloud = argv.includes('--cloud');
const arg = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
};
const verifiedListPath = resolve(ROOT, arg('--verified-list') ?? '.tmp/video-render-drive-ok.txt');

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function removeEmptyDirs(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) removeEmptyDirs(path);
  }
  if (dir !== BASE && readdirSync(dir).length === 0) rmdirSync(dir);
}

if (!existsSync(STATE_PATH)) throw new Error('動画公開台帳がありません');
if (!existsSync(DRIVE_MANIFEST)) throw new Error('Drive台帳がありません');
if (!verifyCloud && !existsSync(verifiedListPath)) throw new Error(`クラウド照合済み一覧がありません: ${verifiedListPath}`);

const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
const manifest = JSON.parse(readFileSync(DRIVE_MANIFEST, 'utf8'));
const archived = Object.entries(manifest.entries ?? {})
  .filter(([rel, entry]) => rel.startsWith('.tmp/video-render/') && entry.group === 'video-render-artifact');
const archivedPaths = new Set(archived.map(([rel]) => rel));
let verified;
if (verifyCloud) {
  const config = JSON.parse(readFileSync(DRIVE_CONFIG, 'utf8'));
  const group = config.groups.find((entry) => entry.id === 'video-render-artifact');
  if (!group) throw new Error('video-render-artifact group がありません');
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
  verified = new Set(archived.flatMap(([rel, entry]) => {
    const key = entry.vaultPath.replace(`${group.vaultDir}/`, '');
    const actual = cloud.get(key);
    return actual?.md5 === entry.md5 && actual.bytes === entry.bytes ? [rel] : [];
  }));
} else {
  verified = new Set(readFileSync(verifiedListPath, 'utf8').split(/\r?\n/u).filter(Boolean));
}
if (verified.size === 0 || [...verified].some((rel) => !archivedPaths.has(rel))) {
  throw new Error(`purge gate失敗: verified=${verified.size} archived=${archived.length}`);
}

const rows = [];
for (const rel of [...verified].sort()) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) continue;
  const entry = manifest.entries[rel];
  const info = statSync(abs);
  if (!info.isFile() || info.size !== entry.bytes || sha256(abs) !== entry.sha256) {
    throw new Error(`purge gate失敗: ローカル実体がDrive台帳と不一致 ${rel}`);
  }
  const inside = relative(BASE, abs).replace(/\\/g, '/');
  if (inside.startsWith('../') || inside === '..') throw new Error(`対象外パスです: ${rel}`);
  const packId = inside.split('/')[0];
  const longformStatus = state.packs?.[packId]?.derivatives?.longform?.status;
  const isLongformFinal = inside === `${packId}/video.mp4` || inside === `${packId}/img/00-cover.png`;
  const keep = isLongformFinal && !['scheduled', 'published'].includes(longformStatus);
  rows.push({ rel, abs, bytes: info.size, keep });
}

const targets = rows.filter((row) => !row.keep);
const kept = rows.filter((row) => row.keep);
const bytes = targets.reduce((sum, row) => sum + row.bytes, 0);
console.log(JSON.stringify({
  mode: commit ? 'commit' : 'dry-run',
  archived: archived.length,
  cloudVerified: verified.size,
  local: rows.length,
  prune: targets.length,
  keep: kept.length,
  pruneMiB: Number((bytes / 1048576).toFixed(2)),
}, null, 2));
for (const row of kept) console.log(`  KEEP ${row.rel}`);

if (!commit) process.exit(0);
for (const row of targets) unlinkSync(row.abs);
removeEmptyDirs(BASE);
console.log(`[video-render-prune] ${targets.length}件 / ${(bytes / 1048576).toFixed(2)} MiB を削除しました`);

#!/usr/bin/env node
/** 派生 Reels の meta/status/media を video-content-status.json へ集約する。 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';

const ROOT = process.cwd();
const BASE = join(ROOT, 'content/sns/instagram/video-packs');
const STATE_PATH = join(ROOT, '.claude/state/video-content-status.json');
const DRIVE_MANIFEST_PATH = join(ROOT, '.claude/state/assets/drive-manifest.json');
const write = process.argv.includes('--write');
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
const state = existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, 'utf8')) : { schemaVersion: 1, packs: {} };
const driveManifest = existsSync(DRIVE_MANIFEST_PATH)
  ? JSON.parse(readFileSync(DRIVE_MANIFEST_PATH, 'utf8'))
  : { entries: {} };
let approved = 0;
let rendered = 0;
let scheduled = 0;
for (const metaPath of metaPaths) {
  const reelsDir = dirname(metaPath);
  const packDir = dirname(reelsDir);
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const statusPath = join(packDir, 'status.json');
  const local = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf8')).reel : null;
  const videoPath = join(reelsDir, 'video.mp4');
  const coverPath = join(reelsDir, 'cover.png');
  const videoRel = relative(ROOT, videoPath).replace(/\\/g, '/');
  const archived = driveManifest.entries?.[videoRel];
  const validVideo = (existsSync(videoPath) && meta.sha256 === sha256(videoPath))
    || (archived?.group === 'sns-archived-media' && archived.sha256 === meta.sha256);
  const validMedia = validVideo && existsSync(coverPath) && meta.coverSha256 === sha256(coverPath)
    && Number(meta.durationSeconds) >= 30 && Number(meta.durationSeconds) <= 60;
  let status = 'approved';
  if (validMedia) status = 'rendered';
  if (local?.status === 'scheduled') status = 'scheduled';
  if (local?.status === 'posted') status = 'published';
  if (status === 'approved') approved += 1;
  else if (status === 'rendered') rendered += 1;
  else if (status === 'scheduled') scheduled += 1;
  const entry = {
    key: meta.key,
    status,
    approvedBy: 'user',
    approvedAt: meta.approvedAt,
    publishAt: local?.scheduled_at ?? meta.publishAt,
    sourcePath: relative(ROOT, packDir).replace(/\\/g, '/'),
    productionDisclosure: meta.productionDisclosure,
    ...(meta.renderedAt ? { renderedAt: meta.renderedAt } : {}),
    ...(local?.updated_at ? { scheduledAt: local.updated_at } : {}),
  };
  const packState = (state.packs[meta.sourcePackId] ||= { derivatives: {} });
  packState.derivatives ||= {};
  const list = Array.isArray(packState.derivatives.instagramReel) ? packState.derivatives.instagramReel : [];
  const existing = list.find((item) => item.key === meta.key);
  if (existing?.status === 'published' || existing?.status === 'measured') Object.assign(entry, existing);
  const next = list.filter((item) => item.key !== meta.key);
  next.push(entry);
  next.sort((a, b) => a.key.localeCompare(b.key));
  packState.derivatives.instagramReel = next;
}
if (write) writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', reels: metaPaths.length, approved, rendered, scheduled }, null, 2));

#!/usr/bin/env node
/** Local verified renders → immutable private transfer plan. Never changes YouTube. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { MIGRATION, sha256, assertPlan } from './lib/youtube-migration.mjs';
import { migrationStorage } from './lib/youtube-migration-storage.mjs';
import { loadCoverSources } from './lib/youtube-cover-rollout.mjs';
const { values: args } = parseArgs({ options: {
  inventory: { type: 'string' }, progress: { type: 'string' }, verification: { type: 'string' },
  out: { type: 'string', default: '.tmp/youtube-migration-20260909' }, commit: { type: 'boolean', default: false },
} });
const read = p => JSON.parse(readFileSync(resolve(p)));
const root = process.cwd(), out = resolve(args.out);
async function main() {
  if (!args.inventory || !args.progress || !args.verification || !out.startsWith(join(root, '.tmp') + '/')) throw new Error('Private input paths and .tmp output required');
  const inventory = read(args.inventory), progress = read(args.progress), verification = read(args.verification), sources = loadCoverSources(root);
  if (!inventory.complete || inventory.checked !== inventory.videos.length) throw new Error('Complete channel inventory required');
  const assets = new Map();
  const entries = inventory.videos.map(oldVideo => {
    let matches = sources.filter(s => s.knownVideoId === oldVideo.id);
    if (!matches.length) matches = sources.filter(s => s.title === oldVideo.snippet.title);
    if (matches.length !== 1 || matches[0].title !== oldVideo.snippet.title) throw new Error('Missing/ambiguous source');
    const source = matches[0], entry = { sourceKey: source.sourceKey, oldVideo };
    if (source.sourceKey.startsWith('legacy/')) {
      const reportPath = '.tmp/video-render/legacy-brand-a/verification.json';
      const v = existsSync(reportPath) ? read(reportPath)[source.key] : null;
      if (v?.status !== 'passed' || v.revision !== MIGRATION || v.visualVerification !== 'passed') return entry;
      for (const [kind, localPath, expectedSha, ext] of [['media', v.mediaPath, v.sha256, 'mp4'], ['thumbnail', v.thumbnailPath, v.thumbnailSha256, 'png']]) {
        const bytes = readFileSync(localPath), sha = sha256(bytes), key = `youtube-migration/${MIGRATION}/media/${sha}.${ext}`;
        if (sha !== expectedSha || (kind === 'thumbnail' && sha !== source.spec.approvedImage.sha256)) throw new Error('Legacy verified media differs');
        entry[kind] = { key, sha256: sha, bytes: bytes.length }; assets.set(key, bytes);
      }
      Object.assign(entry.media, { duration: v.duration, width: v.width, height: v.height });
      entry.verification = { status: 'passed', revision: MIGRATION, checkedAt: v.checkedAt, checks: v.checks };
      entry.desiredSnippet = read('content/sns/youtube/legacy-metadata.json').entries[source.key];
      return entry;
    }
    const packDir = dirname(source.designPath), pack = packDir.split('/').at(-1), p = progress[pack], v = verification[pack];
    if (p?.status !== 'done' || p.revision !== MIGRATION || v?.status !== 'passed') return entry;
    const pub = read(packDir + '/youtube.json'), short = source.key !== 'longform';
    const item = short ? pub.shorts.find(s => s.key === source.key) : pub.longform;
    const folder = `.tmp/video-render/${pack}${short ? '/shorts/' + source.key : ''}`;
    const mediaPath = `${folder}/${short ? 'shorts' : 'video'}.mp4`, thumbnailPath = `${folder}/${short ? 'thumbnail.png' : 'img/00-cover.png'}`;
    const media = readFileSync(mediaPath), thumb = readFileSync(thumbnailPath);
    if (sha256(media) !== item.sha256 || sha256(thumb) !== item.thumbnailSha256 || sha256(thumb) !== source.spec.approvedImage.sha256) throw new Error('Publication/approved cover mismatch');
    const recorded = p.outputs.find(o => o.path === mediaPath);
    if (recorded?.sha256 !== item.sha256 || recorded.bytes !== media.length) throw new Error('Verified render differs');
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', mediaPath], { encoding: 'utf8' });
    if (probe.status !== 0) throw new Error('Video probe failed');
    const parsed = JSON.parse(probe.stdout), video = parsed.streams.find(s => s.codec_type === 'video');
    if (!parsed.streams.some(s => s.codec_type === 'audio') || video.width !== (short ? 1080 : 1920) || video.height !== (short ? 1920 : 1080)) throw new Error('Missing audio/wrong dimensions');
    for (const [kind, bytes, ext] of [['media', media, 'mp4'], ['thumbnail', thumb, 'png']]) {
      const sha = sha256(bytes), key = `youtube-migration/${MIGRATION}/media/${sha}.${ext}`;
      entry[kind] = { key, sha256: sha, bytes: bytes.length }; assets.set(key, bytes);
    }
    Object.assign(entry.media, { duration: Number(parsed.format.duration), width: video.width, height: video.height });
    entry.verification = { status: 'passed', revision: MIGRATION, checkedAt: v.checkedAt, checks: v.checks };
    return entry;
  }).sort((a, b) => Number(!a.media) - Number(!b.media) || Number(a.sourceKey.split('/').at(-1) !== 'longform') - Number(b.sourceKey.split('/').at(-1) !== 'longform') || Number(a.oldVideo.status.privacyStatus !== 'public') - Number(b.oldVideo.status.privacyStatus !== 'public') || (a.oldVideo.status.publishAt ?? '9999').localeCompare(b.oldVideo.status.publishAt ?? '9999') || a.sourceKey.localeCompare(b.sourceKey));
  const plan = { schemaVersion: 1, migration: MIGRATION, channel: inventory.channel, sourceInventoryAt: inventory.generatedAt, entries };
  assertPlan(plan);
  const bytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n'), hash = sha256(bytes);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `plan-${hash}.json`), bytes, { mode: 0o600 });
  const summary = { planSha256: hash, total: entries.length, ready: entries.filter(e => e.media).length, assets: assets.size, youtubeWrites: 0, staged: false };
  if (args.commit) {
    const storage = migrationStorage();
    for (const [key, value] of assets) {
      const prior = await storage.get(key);
      if (prior && sha256(prior) !== sha256(value)) throw new Error('Immutable transfer key differs');
      if (!prior) await storage.put(key, value, key.endsWith('.mp4') ? 'video/mp4' : 'image/png');
    }
    await storage.put(`${storage.prefix}plans/${hash}.json`, bytes);
    summary.staged = true;
  }
  writeFileSync(join(out, 'staged-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
}
main().catch(() => { console.error('Migration preparation failed; no YouTube changes.'); process.exitCode = 1; });

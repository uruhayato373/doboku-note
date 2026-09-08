#!/usr/bin/env node
/** Single-video thumbnail update. Default: local dry-run, no network and no external writes. */
import { readFileSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { google } from 'googleapis';
import { thumbnailInput, updateThumbnail } from '../../../scripts/lib/youtube-thumbnail-update.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const { values: args } = parseArgs({ options: {
  'video-id': { type: 'string' }, image: { type: 'string' }, 'channel-file': { type: 'string' },
  'expect-sha256': { type: 'string' }, 'check-live': { type: 'boolean' },
  commit: { type: 'boolean' }, 'dry-run': { type: 'boolean' },
} });

async function main() {
  if (!args['video-id'] || !args.image || !args['channel-file']) throw new Error('Usage: --video-id ID --image PNG --channel-file youtube.json [--check-live] [--commit --expect-sha256 HASH]');
  if (args.commit && args['dry-run']) throw new Error('--commit と --dry-run は併用不可');
  const channel = JSON.parse(readFileSync(resolve(args['channel-file']), 'utf8')).channel;
  const buffer = readFileSync(resolve(args.image));
  const input = await thumbnailInput(buffer, { videoId: args['video-id'], channel,
    expectedSha256: args['expect-sha256'], commit: args.commit });
  if (!args.commit && !args['check-live']) {
    console.log(JSON.stringify({ ...input, targets: 1, checkedLive: 0, changed: 0, mode: 'local-dry-run' }, null, 2));
    return;
  }
  const env = { ...process.env };
  const envFile = join(root, '.env.local');
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, '$2');
    }
  }
  if (['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'].some(k => !env[k])) throw new Error('YouTube API資格情報がありません。実体確認0件・外部変更0件');
  const auth = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth });
  const base = join(root, '.tmp/youtube-thumbnail-updates');
  mkdirSync(base, { recursive: true });
  const out = mkdtempSync(join(base, 'run-'));
  const record = report => writeFileSync(join(out, 'report.json'), JSON.stringify({ at: new Date().toISOString(), ...report }, null, 2) + '\n');
  const report = await updateThumbnail(youtube, input, buffer, { commit: args.commit, record });
  console.log(JSON.stringify({ targets: 1, checkedLive: 1, apiAccepted: report.apiAccepted, phase: report.phase, visualVerified: false, out }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

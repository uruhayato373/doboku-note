#!/usr/bin/env node
/** Read-only audit of every YouTube video ID in the active registry. */
import { createHash } from 'node:crypto';
import { google } from 'googleapis';
import { loadRegistry, resolveCopy } from './lib/content-registry.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const CHANNEL_ID = 'UCHRnXPqoc0Hls8nXiK_ZYqA';
const POLICY_START = Date.parse('2026-10-31T12:00:00+09:00');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const ownLinks = (s) => s.split('\n').filter((line) => /^https:\/\/(?:note\.com\/dobokunote\/|doboku-note\.com\/)/.test(line.trim())).map((line) => line.trim());
for (const key of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']) {
  if (!process.env[key]) throw new Error(`認証情報がない: ${key}`);
}
const registry = loadRegistry(REPO_ROOT);
const active = registry.publications.filter((p) => p.channel === 'youtube' && p.format === 'longform' &&
  ['uploaded_private', 'scheduled', 'published'].includes(p.status) && p.platform?.id);
if (active.length < 20) throw new Error(`検査対象が少なすぎる: ${active.length}`);
const ids = [...new Set(active.map((p) => p.platform.id))];
if (ids.length !== active.length) throw new Error('動画IDの重複がある');
const auth = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
const youtube = google.youtube({ version: 'v3', auth });
const channels = (await youtube.channels.list({ part: 'snippet', mine: true })).data.items ?? [];
if (channels.length !== 1 || channels[0].id !== CHANNEL_ID) throw new Error('認証先チャンネルが違う');
const videos = new Map();
for (let i = 0; i < ids.length; i += 50) {
  const res = await youtube.videos.list({ part: 'snippet,status', id: ids.slice(i, i + 50), maxResults: 50 });
  for (const video of res.data.items ?? []) videos.set(video.id, video);
}
const errors = [];
const warnings = [];
let exact = 0;
for (const pub of active) {
  const video = videos.get(pub.platform.id);
  if (!video || video.snippet?.channelId !== CHANNEL_ID) { errors.push(`${pub.id}: 動画が無いかチャンネルが違う`); continue; }
  const description = resolveCopy(REPO_ROOT, pub.copy)?.description;
  if (!description) { errors.push(`${pub.id}: 台帳側の概要欄がない`); continue; }
  const remote = video.snippet.description ?? '';
  const future = pub.status !== 'uploaded_private' && Date.parse(pub.publishAt) > Date.now();
  const newPolicy = pub.status !== 'uploaded_private' && Date.parse(pub.publishAt) >= POLICY_START;
  if (future) {
    if (video.status?.privacyStatus !== 'private' || Date.parse(video.status.publishAt) !== Date.parse(pub.publishAt)) {
      errors.push(`${pub.id}: 予約状態・公開時刻が台帳と違う`);
    }
  } else if (pub.status === 'uploaded_private') {
    if (video.status?.privacyStatus !== 'private') errors.push(`${pub.id}: private の台帳と実体が違う`);
  } else if (video.status?.privacyStatus !== 'public') {
    errors.push(`${pub.id}: 期日後・公開済みの台帳だが YouTube では ${video.status?.privacyStatus ?? 'unknown'}`);
  }
  if (sha(remote) === sha(description)) exact += 1;
  else if (newPolicy) errors.push(`${pub.id}: 新ルールの概要欄が台帳と一致しない`);
  else warnings.push(`${pub.id}: 旧動画の概要欄が台帳と全文一致しない`);
  const localLinks = ownLinks(description);
  const liveLinks = ownLinks(remote);
  if (JSON.stringify(localLinks) !== JSON.stringify(liveLinks)) {
    (newPolicy ? errors : warnings).push(`${pub.id}: YouTube 上のnote・サイトリンクが台帳と違う`);
  }
  if (pub.status === 'scheduled' && !future && video.status?.privacyStatus === 'public') {
    warnings.push(`${pub.id}: 公開済みなので台帳の scheduled を published に照合する`);
  }
}
console.log(`[youtube-live-funnel] API照合 ${active.length} 本 / 本文完全一致 ${exact} 本 / FAIL ${errors.length} / WARN ${warnings.length}`);
for (const line of warnings) console.log(`  [WARN] ${line}`);
for (const line of errors) console.error(`  [FAIL] ${line}`);
if (errors.length) process.exit(1);

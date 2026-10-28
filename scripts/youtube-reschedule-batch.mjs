#!/usr/bin/env node
/** Reschedule already uploaded private YouTube videos, then record the read-back. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { google } from 'googleapis';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadRegistry } from './lib/content-registry.mjs';
import { upsertPublications } from './lib/content-registry-write.mjs';
import { approvalState } from './lib/media-review.mjs';
import { writableStatus } from './lib/youtube-migration.mjs';
import { validateReschedulePlan } from './lib/youtube-reschedule-plan.mjs';

const args = process.argv.slice(2);
const get = (flag) => args[args.indexOf(flag) + 1];
const commit = args.includes('--commit');
const planPath = args.includes('--plan') ? resolve(REPO_ROOT, get('--plan')) : null;
if (!planPath || !planPath.startsWith(`${REPO_ROOT}/`)) throw new Error('--plan にリポジトリ内の JSON を指定する');
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const summary = validateReschedulePlan(plan);
const reg = loadRegistry(REPO_ROOT);
const mediaById = new Map(reg.media.map((m) => [m.id, m]));
const pubs = new Map(reg.publications.map((p) => [p.id, p]));
const targets = plan.moves.map((item) => {
  const pub = pubs.get(item.publicationId);
  if (!pub || pub.channel !== 'youtube' || pub.status !== 'scheduled' || pub.platform?.id !== item.videoId || ![item.from, item.to].includes(pub.publishAt)) throw new Error(`台帳の予定・動画 ID が計画と違う: ${item.publicationId}`);
  const [copyFile, key] = pub.copy.split('#');
  const copyPath = resolve(REPO_ROOT, copyFile);
  if (!copyPath.startsWith(`${REPO_ROOT}/`)) throw new Error(`文面パスが不正: ${copyFile}`);
  const copy = JSON.parse(readFileSync(copyPath, 'utf8'));
  const meta = key ? copy[key] : copy;
  if (!meta || ![item.from, item.to].includes(meta.publishAt)) throw new Error(`文面の予定が計画と違う: ${item.publicationId}`);
  const approval = approvalState(REPO_ROOT, pub, mediaById);
  if (!approval.visual.valid || !approval.final.valid) throw new Error(`既存の画面・最終承認が無効: ${item.publicationId}`);
  return { item, pub, copyPath, copy, key };
});
console.log(`[youtube-reschedule] 既存 ${summary.moves} 本・新規予定 ${summary.newUploads} 本・${summary.days} 日 / ${commit ? '実行' : '試運転'}`);
for (const { item } of targets) console.log(`  ${item.from} -> ${item.to}  ${item.publicationId}  ${item.videoId}`);
if (!commit) process.exit(0);

for (const key of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']) if (!process.env[key]) throw new Error(`認証情報が無い: ${key}`);
const auth = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
const youtube = google.youtube({ version: 'v3', auth });
const me = (await youtube.channels.list({ part: 'snippet', mine: true })).data.items ?? [];
if (me.length !== 1 || me[0].id !== plan.channelId) throw new Error(`投稿先チャンネルが違う: ${me.map((c) => c.id).join(',')}`);

const actualById = new Map();
for (let i = 0; i < targets.length; i += 50) {
  const ids = targets.slice(i, i + 50).map(({ item }) => item.videoId);
  const res = await youtube.videos.list({ part: 'snippet,status', id: ids.join(','), maxResults: 50 });
  for (const video of res.data.items ?? []) actualById.set(video.id, video);
}
for (const { item } of targets) {
  const video = actualById.get(item.videoId);
  if (!video || video.snippet?.channelId !== plan.channelId || video.status?.privacyStatus !== 'private' || ![Date.parse(item.from), Date.parse(item.to)].includes(Date.parse(video.status.publishAt))) throw new Error(`YouTube 側の状態が計画と違う: ${item.publicationId}`);
}

const sleep = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));
let done = 0;
for (const { item, pub, copyPath, copy, key } of targets) {
  if (Date.parse(item.to) <= Date.now() + 5 * 60_000) throw new Error(`公開時刻が近すぎる: ${item.publicationId}`);
  const video = actualById.get(item.videoId);
  if (Date.parse(video.status.publishAt) !== Date.parse(item.to)) {
    await youtube.videos.update({ part: 'status', requestBody: { id: item.videoId, status: { ...writableStatus(video), privacyStatus: 'private', publishAt: item.to } } }, { retry: false });
  }
  let verified = false;
  for (let attempt = 0; attempt < 10 && !verified; attempt += 1) {
    const res = await youtube.videos.list({ part: 'snippet,status', id: item.videoId });
    const after = res.data.items?.[0];
    verified = after?.snippet?.channelId === plan.channelId && after.status?.privacyStatus === 'private' && Date.parse(after.status?.publishAt) === Date.parse(item.to);
    if (!verified) await sleep(1500);
  }
  if (!verified) throw new Error(`予約変更の読み戻しが一致しない: ${item.publicationId}`);
  if (key) copy[key].publishAt = item.to;
  else copy.publishAt = item.to;
  writeFileSync(copyPath, `${JSON.stringify(copy, null, 2)}\n`);
  const at = new Date().toISOString();
  const patched = { ...pub, publishAt: item.to, times: { ...pub.times, scheduled: at }, approval: { ...pub.approval, by: 'user', at } };
  patched.approval.contentSha256 = approvalState(REPO_ROOT, patched, mediaById).final.current;
  upsertPublications(REPO_ROOT, 'youtube', pub.exam, [patched]);
  done += 1;
  console.log(`  [${done}/${targets.length}] 予約日時を再読取・台帳反映: ${item.publicationId} -> ${item.to}`);
}
console.log(`[youtube-reschedule] 完了 ${done}/${targets.length}`);

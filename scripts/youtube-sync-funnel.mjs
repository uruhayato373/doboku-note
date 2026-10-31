#!/usr/bin/env node
/** Sync approved description revisions to already scheduled videos, with exact before/after hashes. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { google } from 'googleapis';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadRegistry, resolveCopy } from './lib/content-registry.mjs';
import { approvalState } from './lib/media-review.mjs';
import { writableSnippet } from './lib/youtube-migration.mjs';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const args = process.argv.slice(2);
const planArg = args[args.indexOf('--plan') + 1];
if (!args.includes('--plan') || !planArg) throw new Error('--plan にリポジトリ内の JSON を指定する');
const planPath = resolve(REPO_ROOT, planArg);
if (!planPath.startsWith(`${REPO_ROOT}/`)) throw new Error('リポジトリ外の計画は使えません');
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
if (plan.schemaVersion !== 1 || plan.channelId !== 'UCHRnXPqoc0Hls8nXiK_ZYqA' || !Array.isArray(plan.items) || !plan.items.length) {
  throw new Error('同期計画の形式・投稿先が不正です');
}
const unique = new Set(plan.items.map((x) => x.publicationId));
if (unique.size !== plan.items.length) throw new Error('同期計画に重複公開IDがあります');

const reg = loadRegistry(REPO_ROOT);
const publications = new Map(reg.publications.map((p) => [p.id, p]));
const media = new Map(reg.media.map((m) => [m.id, m]));
const now = Date.now();
const targets = plan.items.map((item) => {
  const pub = publications.get(item.publicationId);
  if (!pub || pub.channel !== 'youtube' || pub.format !== 'longform' || pub.status !== 'scheduled' ||
      pub.platform?.id !== item.videoId || pub.publishAt !== item.publishAt || Date.parse(pub.publishAt) <= now + 5 * 60_000) {
    throw new Error(`予約・動画ID・公開時刻が計画と違う: ${item.publicationId}`);
  }
  const copy = resolveCopy(REPO_ROOT, pub.copy);
  if (!copy?.title || !copy?.description || sha(copy.description) !== item.toSha256 ||
      !/^[0-9a-f]{64}$/.test(item.fromSha256)) throw new Error(`新概要欄のハッシュが計画と違う: ${item.publicationId}`);
  const approval = approvalState(REPO_ROOT, pub, media);
  return { item, pub, copy, approval };
});
console.log(`[youtube-funnel] 既存予約 ${targets.length} 本 / ${args.includes('--commit') ? 'API更新' : 'dry-run'}`);
for (const { item, approval } of targets) console.log(`  ${item.publicationId} 承認=${approval.final.valid ? '有効' : '要更新'}`);
if (!args.includes('--commit')) process.exit(0);
for (const { item, approval } of targets) if (!approval.final.valid || !approval.visual.valid) {
  throw new Error(`画面・最終承認が無効: ${item.publicationId}`);
}
for (const key of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']) {
  if (!process.env[key]) throw new Error(`認証情報が無い: ${key}`);
}
const auth = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
const youtube = google.youtube({ version: 'v3', auth });
const channels = (await youtube.channels.list({ part: 'snippet', mine: true })).data.items ?? [];
if (channels.length !== 1 || channels[0].id !== plan.channelId) throw new Error('認証先のチャンネルが計画と違う');

async function readVideo(id) {
  const res = await youtube.videos.list({ part: 'snippet,status', id });
  const video = res.data.items?.[0];
  if (!video || video.id !== id || video.snippet?.channelId !== plan.channelId) throw new Error(`動画の読み戻しに失敗: ${id}`);
  return video;
}
function checkSchedule(video, item) {
  if (video.status?.privacyStatus !== 'private' || Date.parse(video.status.publishAt) !== Date.parse(item.publishAt)) {
    throw new Error(`予約状態が計画と違う: ${item.publicationId}`);
  }
}
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
for (const { item, copy } of targets) {
  if (Date.parse(item.publishAt) <= Date.now() + 5 * 60_000) throw new Error(`公開直前になったため停止: ${item.publicationId}`);
  const before = await readVideo(item.videoId);
  checkSchedule(before, item);
  if (before.snippet.title !== copy.title) throw new Error(`公開題名が台帳と違う: ${item.publicationId}`);
  const beforeSha = sha(before.snippet.description ?? '');
  if (![item.fromSha256, item.toSha256].includes(beforeSha)) throw new Error(`YouTube概要欄が計画外に変化: ${item.publicationId}`);
  if (beforeSha === item.fromSha256) {
    const snippet = { ...writableSnippet(before), description: copy.description };
    await youtube.videos.update({ part: 'snippet', requestBody: { id: item.videoId, snippet } }, { retry: false });
  }
  let matched = false;
  for (let attempt = 0; attempt < 8 && !matched; attempt += 1) {
    const after = await readVideo(item.videoId);
    checkSchedule(after, item);
    matched = after.snippet.title === copy.title && sha(after.snippet.description ?? '') === item.toSha256;
    if (!matched) await sleep(1500);
  }
  if (!matched) throw new Error(`更新後の読み戻しが一致しない: ${item.publicationId}`);
  console.log(`  読み戻し一致 ${item.videoId} ${item.toSha256}`);
}
console.log(`[youtube-funnel] 完了 ${targets.length}/${targets.length}`);

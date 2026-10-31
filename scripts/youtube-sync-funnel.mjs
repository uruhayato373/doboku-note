#!/usr/bin/env node
/** Sync approved metadata repairs with exact before/after hashes and live state checks. */
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
  const creditRepair = item.repairKind === 'voicevox-credit';
  const legacyFunnel = item.repairKind === 'legacy-funnel';
  if (item.repairKind && !creditRepair && !legacyFunnel) throw new Error(`未対応の修復種別: ${item.publicationId}`);
  const stateMatches = legacyFunnel
    ? (['published', 'uploaded_private'].includes(item.expectedStatus) && pub?.status === item.expectedStatus &&
      (item.expectedStatus === 'uploaded_private' ? !pub.publishAt : Date.parse(pub.publishAt) < now - 5 * 60_000))
    : creditRepair
      ? pub?.status === 'published' && Date.parse(pub.publishAt) < now - 5 * 60_000
      : pub?.status === 'scheduled' && Date.parse(pub.publishAt) > now + 5 * 60_000;
  if (!pub || pub.channel !== 'youtube' || pub.format !== 'longform' ||
      pub.platform?.id !== item.videoId || (pub.publishAt ?? null) !== (item.publishAt ?? null) || !stateMatches) {
    throw new Error(`状態・動画ID・公開時刻が計画と違う: ${item.publicationId}`);
  }
  const copy = resolveCopy(REPO_ROOT, pub.copy);
  if (!copy?.title || !copy?.description || sha(copy.description) !== item.toSha256 ||
      !/^[0-9a-f]{64}$/.test(item.fromSha256)) throw new Error(`新概要欄のハッシュが計画と違う: ${item.publicationId}`);
  const approval = approvalState(REPO_ROOT, pub, media);
  return { item, pub, copy, approval };
});
function finalApprovalReady(item, approval) {
  return approval.final.by === 'user' && approval.final.valid &&
    (item.repairKind !== 'legacy-funnel' || (!approval.final.grandfathered && approval.final.contentSha256 === approval.final.current));
}
console.log(`[youtube-funnel] 既存動画 ${targets.length} 本 / ${args.includes('--commit') ? 'API更新' : 'dry-run'}`);
for (const { item, approval } of targets) console.log(`  ${item.publicationId} 承認=${finalApprovalReady(item, approval) ? '有効' : '要更新'}`);
if (!args.includes('--commit')) process.exit(0);
for (const { item, approval } of targets) {
  const creditRepair = item.repairKind === 'voicevox-credit' && approval.final.grandfathered;
  const pub = publications.get(item.publicationId);
  const visualRequired = Boolean(pub.media && Object.keys(pub.media).length);
  if (!finalApprovalReady(item, approval) || (!creditRepair && visualRequired && !approval.visual.valid)) {
    throw new Error(`画面・最終承認が無効: ${item.publicationId}`);
  }
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
function checkStatus(video, item) {
  if (item.repairKind === 'voicevox-credit') {
    if (video.status?.privacyStatus !== 'public') throw new Error(`公開状態が違う: ${item.publicationId}`);
    return;
  }
  if (item.repairKind === 'legacy-funnel') {
    const expectedPrivacy = item.expectedStatus === 'published' ? 'public' : 'private';
    if (video.status?.privacyStatus !== expectedPrivacy ||
        (item.expectedStatus === 'uploaded_private' && video.status.publishAt)) {
      throw new Error(`公開状態が計画と違う: ${item.publicationId}`);
    }
    return;
  }
  if (video.status?.privacyStatus !== 'private' || Date.parse(video.status.publishAt) !== Date.parse(item.publishAt)) {
    throw new Error(`予約状態が計画と違う: ${item.publicationId}`);
  }
}
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
for (const { item, copy } of targets) {
  if (!item.repairKind && Date.parse(item.publishAt) <= Date.now() + 5 * 60_000) throw new Error(`公開直前になったため停止: ${item.publicationId}`);
  const before = await readVideo(item.videoId);
  checkStatus(before, item);
  if (before.snippet.title !== copy.title) throw new Error(`公開題名が台帳と違う: ${item.publicationId}`);
  const beforeSha = sha(before.snippet.description ?? '');
  if (![item.fromSha256, item.toSha256].includes(beforeSha)) throw new Error(`YouTube概要欄が計画外に変化: ${item.publicationId}`);
  if (item.repairKind === 'voicevox-credit' && beforeSha === item.fromSha256 &&
      (!copy.description.includes('音声：VOICEVOX:青山龍星\n') ||
        before.snippet.description !== copy.description.replace('音声：VOICEVOX:青山龍星\n', ''))) {
    throw new Error(`変更がVOICEVOXクレジット1行だけではない: ${item.publicationId}`);
  }
  if (beforeSha === item.fromSha256) {
    const snippet = { ...writableSnippet(before), description: copy.description };
    await youtube.videos.update({ part: 'snippet', requestBody: { id: item.videoId, snippet } }, { retry: false });
  }
  let matched = false;
  for (let attempt = 0; attempt < 8 && !matched; attempt += 1) {
    const after = await readVideo(item.videoId);
    checkStatus(after, item);
    matched = after.snippet.title === copy.title && sha(after.snippet.description ?? '') === item.toSha256;
    if (!matched) await sleep(1500);
  }
  if (!matched) throw new Error(`更新後の読み戻しが一致しない: ${item.publicationId}`);
  console.log(`  読み戻し一致 ${item.videoId} ${item.toSha256}`);
}
console.log(`[youtube-funnel] 完了 ${targets.length}/${targets.length}`);

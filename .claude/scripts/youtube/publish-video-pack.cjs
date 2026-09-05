#!/usr/bin/env node
/**
 * 動画パックを private R2 から取得して YouTube Data API v3 で公開する。
 * longform → shorts-upload(private) → Studioで関連動画設定 → shorts-publish(API予約) の3段階。
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { google } = require('googleapis');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const ROOT = path.resolve(__dirname, '../../..');
const STATE_PATH = path.join(ROOT, '.claude/state/video-content-status.json');
const PRIVATE_BUCKET = 'doboku-note-archive';
let publish;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const PACK_ID = arg('--pack-id');
const PHASE = arg('--phase');
const DRY = process.argv.includes('--dry-run');
const RELATED_CONFIRMED = process.argv.includes('--related-confirmed');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name === 'video-pack.json') out.push(p);
  }
  return out;
}

function findPack(packId) {
  const root = path.join(ROOT, 'content/sns/video-packs');
  for (const manifestPath of walk(root)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.packId === packId) return { dir: path.dirname(manifestPath), manifest };
  }
  throw new Error(`packId がありません: ${packId}`);
}

function loadEnv() {
  const env = { ...process.env };
  const p = path.join(ROOT, '.env.local');
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

function assertMetadata(item, packId) {
  if (!item.title || item.title.length > 100) throw new Error(`${item.key}: title が空または100字超`);
  for (const required of [`utm_source=youtube`, `utm_medium=video`, `utm_campaign=${packId}`]) {
    if (!item.description?.includes(required)) throw new Error(`${item.key}: description に ${required} がありません`);
  }
  if (!/^[a-f0-9]{64}$/.test(item.sha256 ?? '')) throw new Error(`${item.key}: sha256 が未確定です`);
  if (!/^[a-f0-9]{64}$/.test(item.thumbnailSha256 ?? '')) throw new Error(`${item.key}: thumbnailSha256 が未確定です`);
}

function loadState() {
  return fs.existsSync(STATE_PATH)
    ? JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'))
    : { schemaVersion: 1, packs: {} };
}

function writeState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

function upsertDerivative(state, packId, kind, value) {
  state.packs ??= {};
  state.packs[packId] ??= { derivatives: {} };
  state.packs[packId].derivatives ??= {};
  if (kind === 'longform') {
    state.packs[packId].derivatives.longform = {
      ...(state.packs[packId].derivatives.longform ?? {}),
      ...value,
    };
    return;
  }
  const list = Array.isArray(state.packs[packId].derivatives.shorts)
    ? state.packs[packId].derivatives.shorts
    : [];
  const i = list.findIndex((entry) => entry.key === value.key);
  if (i >= 0) list[i] = { ...list[i], ...value };
  else list.push(value);
  state.packs[packId].derivatives.shorts = list;
}

async function sha256File(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', (c) => h.update(c)).on('error', reject).on('end', () => resolve(h.digest('hex')));
  });
}

async function downloadR2(s3, item, suffix) {
  const dest = path.join(os.tmpdir(), `${PACK_ID}-${item.key}-${suffix}`);
  const obj = await s3.send(new GetObjectCommand({ Bucket: PRIVATE_BUCKET, Key: suffix === 'thumbnail.png' ? item.thumbnailR2Key : item.r2Key }));
  const out = fs.createWriteStream(dest);
  await new Promise((resolve, reject) => {
    obj.Body.pipe(out);
    obj.Body.on('error', reject);
    out.on('finish', resolve);
    out.on('error', reject);
  });
  const expected = suffix === 'thumbnail.png' ? item.thumbnailSha256 : item.sha256;
  const actual = await sha256File(dest);
  if (actual !== expected) throw new Error(`${item.key}/${suffix}: R2 sha256 不一致 expected=${expected} actual=${actual}`);
  return dest;
}

async function channelAndUploads(youtube, expected) {
  const res = await youtube.channels.list({ part: 'snippet,contentDetails', mine: true });
  const channels = res.data.items ?? [];
  if (channels.length !== 1) throw new Error(`OAuth チャンネルが1件でない: ${channels.length}`);
  const channel = channels[0];
  if (channel.id !== expected.id || channel.snippet?.title !== expected.title) {
    throw new Error(`YouTubeアカウント不一致: expected=${expected.title}/${expected.id} actual=${channel.snippet?.title}/${channel.id}`);
  }
  console.log(`account: ${channel.snippet.title} (${channel.id})`);
  return channel.contentDetails?.relatedPlaylists?.uploads;
}

async function findExactTitle(youtube, uploadsPlaylistId, title) {
  let pageToken;
  do {
    const res = await youtube.playlistItems.list({ part: 'snippet,contentDetails', playlistId: uploadsPlaylistId, maxResults: 50, pageToken });
    const hit = (res.data.items ?? []).find((entry) => entry.snippet?.title === title);
    if (hit) return hit.contentDetails?.videoId;
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return null;
}

async function fetchVideo(youtube, videoId) {
  const res = await youtube.videos.list({ part: 'snippet,status,processingDetails,contentDetails', id: [videoId] });
  return res.data.items?.[0] ?? null;
}

async function setThumbnail(youtube, videoId, file) {
  await youtube.thumbnails.set({ videoId, media: { mimeType: 'image/png', body: fs.createReadStream(file) } });
}

async function upload(youtube, s3, uploadsPlaylistId, item, privacyStatus) {
  let videoId = await findExactTitle(youtube, uploadsPlaylistId, item.title);
  if (videoId) {
    console.log(`${item.key}: 同一タイトル既存動画を再利用 ${videoId}`);
  } else {
    const video = await downloadR2(s3, item, 'video.mp4');
    const thumbnail = await downloadR2(s3, item, 'thumbnail.png');
    try {
      const res = await youtube.videos.insert({
        part: 'snippet,status',
        requestBody: {
          snippet: {
            title: item.title,
            description: item.description,
            tags: item.tags,
            categoryId: item.categoryId ?? '27',
            defaultLanguage: 'ja',
            defaultAudioLanguage: 'ja',
          },
          status: { privacyStatus, selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
        },
        media: { mimeType: 'video/mp4', body: fs.createReadStream(video) },
      });
      videoId = res.data.id;
      await setThumbnail(youtube, videoId, thumbnail);
      console.log(`${item.key}: uploaded ${videoId}`);
    } finally {
      for (const p of [video, thumbnail]) if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }
  const actual = await fetchVideo(youtube, videoId);
  if (!actual) throw new Error(`${item.key}: videos.list で取得不能 ${videoId}`);
  if (actual.snippet?.channelId !== publish.channel.id) throw new Error(`${item.key}: channelId 不一致`);
  if (actual.snippet?.title !== item.title) throw new Error(`${item.key}: title 不一致`);
  if (actual.status?.privacyStatus !== privacyStatus) throw new Error(`${item.key}: privacyStatus=${actual.status?.privacyStatus} expected=${privacyStatus}`);
  console.log(`${item.key}: verified status=${actual.status.privacyStatus} processing=${actual.processingDetails?.processingStatus ?? 'unknown'}`);
  return { videoId, actual };
}

async function schedulePublic(youtube, videoId, publishAt) {
  if (!publishAt || new Date(publishAt).getTime() <= Date.now() + 5 * 60 * 1000) {
    throw new Error(`${videoId}: publishAt は5分より先の未来が必要です: ${publishAt}`);
  }
  const before = await fetchVideo(youtube, videoId);
  if (!before) throw new Error(`videos.list で取得不能: ${videoId}`);
  await youtube.videos.update({
    part: 'status',
    requestBody: {
      id: videoId,
      status: {
        privacyStatus: 'private',
        publishAt,
        selfDeclaredMadeForKids: false,
        containsSyntheticMedia: true,
        embeddable: before.status?.embeddable ?? true,
        license: before.status?.license ?? 'youtube',
        publicStatsViewable: before.status?.publicStatsViewable ?? true,
      },
    },
  });

  // videos.update の直後は videos.list に publishAt がまだ出ないことがある。
  // YouTube 側の eventual consistency を吸収し、API 応答を実査してから成功とする。
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const after = await fetchVideo(youtube, videoId);
    const actualAt = after?.status?.publishAt;
    if (
      after?.status?.privacyStatus === 'private'
      && actualAt
      && new Date(actualAt).getTime() === new Date(publishAt).getTime()
    ) {
      return after;
    }
    if (attempt < 10) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${videoId}: 公開予約を10回のAPI確認後も実査できません: ${publishAt}`);
}

async function main() {
  if (!PACK_ID || !['longform', 'shorts-upload', 'shorts-publish'].includes(PHASE)) {
    throw new Error('Usage: --pack-id ID --phase longform|shorts-upload|shorts-publish [--dry-run] [--related-confirmed]');
  }
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(PACK_ID)) throw new Error('pack-id 形式が不正です');
  const pack = findPack(PACK_ID);
  const publishPath = path.join(pack.dir, 'youtube.json');
  if (!fs.existsSync(publishPath)) throw new Error(`youtube.json がありません: ${publishPath}`);
  publish = JSON.parse(fs.readFileSync(publishPath, 'utf8'));
  if (publish.schemaVersion !== 1) throw new Error('youtube.json schemaVersion 不一致');
  if (pack.manifest.packId !== PACK_ID) throw new Error('manifest packId 不一致');
  const selected = PHASE === 'longform' ? [publish.longform] : publish.shorts;
  for (const item of selected) assertMetadata(item, PACK_ID);
  console.log(`target: account=${publish.channel.title}/${publish.channel.id} pack=${PACK_ID} phase=${PHASE}`);
  for (const item of selected) console.log(`  ${item.key}: ${item.title}`);
  if (DRY) return console.log('[dry-run] API/R2/state は変更しません');
  if (PHASE === 'shorts-publish' && !RELATED_CONFIRMED) throw new Error('Shorts公開には --related-confirmed が必要です');

  const env = loadEnv();
  const required = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'];
  if (PHASE !== 'shorts-publish') required.push('CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  const missing = required.filter((key) => !env[key]);
  if (missing.length) throw new Error(`環境変数が不足: ${missing.join(', ')}`);

  const oauth2 = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth: oauth2 });
  const uploadsPlaylistId = await channelAndUploads(youtube, publish.channel);
  const s3 = PHASE === 'shorts-publish' ? null : new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY },
  });
  const state = loadState();
  const now = new Date().toISOString();

  if (PHASE === 'longform') {
    const { videoId } = await upload(youtube, s3, uploadsPlaylistId, publish.longform, 'public');
    upsertDerivative(state, PACK_ID, 'longform', {
      status: 'published', approvedBy: 'user', videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`, publishedAt: now, privacyStatus: 'public',
    });
  } else if (PHASE === 'shorts-upload') {
    const relatedVideoId = state.packs?.[PACK_ID]?.derivatives?.longform?.videoId;
    if (!relatedVideoId) throw new Error('先にlongformを公開してvideoIdを確定してください');
    for (const item of publish.shorts) {
      const { videoId } = await upload(youtube, s3, uploadsPlaylistId, item, 'private');
      upsertDerivative(state, PACK_ID, 'shorts', {
        key: item.key, status: 'scheduled', approvedBy: 'user', videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`, uploadedAt: now,
        privacyStatus: 'private', relatedVideoId: null, desiredRelatedVideoId: relatedVideoId,
      });
    }
  } else {
    const longformId = state.packs?.[PACK_ID]?.derivatives?.longform?.videoId;
    const shorts = state.packs?.[PACK_ID]?.derivatives?.shorts;
    if (!longformId || !Array.isArray(shorts) || shorts.length !== publish.shorts.length) {
      throw new Error('longform/shorts のAPIアップロード状態が揃っていません');
    }
    for (const item of publish.shorts) {
      const entry = shorts.find((candidate) => candidate.key === item.key);
      if (!entry?.videoId) throw new Error(`${item.key}: videoId がありません`);
      const actual = await schedulePublic(youtube, entry.videoId, item.publishAt);
      upsertDerivative(state, PACK_ID, 'shorts', {
        key: item.key, status: 'scheduled', approvedBy: 'user', videoId: entry.videoId,
        url: `https://www.youtube.com/watch?v=${entry.videoId}`, scheduledAt: now,
        publishAt: actual.status.publishAt, privacyStatus: 'private',
        relatedVideoId: longformId, desiredRelatedVideoId: longformId,
      });
      console.log(`${item.key}: scheduled ${actual.status.publishAt} ${entry.videoId}`);
    }
  }
  writeState(state);
  console.log(`state updated: ${path.relative(ROOT, STATE_PATH)}`);
}

main().catch((error) => {
  const detail = error.response?.data ? JSON.stringify(error.response.data) : error.stack || error.message;
  console.error(detail);
  process.exit(1);
});

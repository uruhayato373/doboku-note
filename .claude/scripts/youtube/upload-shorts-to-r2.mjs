#!/usr/bin/env node
/**
 * YouTube Shorts の shorts.mp4 と thumbnail.png を Cloudflare R2（S3 API）へアップロードする。
 *
 * CI/CD 予約投稿のため、生成済みファイルを R2 に保管し、投稿ワークフローが
 * そこから取得して YouTube にアップする。mp4/png 自体は git 追跡しない（gitignore）。
 *
 * R2 キー:
 *   mp4:       sns/youtube-shorts/<year>-pack-<NN>-q<N>.mp4
 *   thumbnail: sns/youtube-thumbnails/<year>-pack-<NN>-q<N>.png
 *
 * Usage:
 *   node .claude/scripts/youtube/upload-shorts-to-r2.mjs               # 全 -qN dir（アップ後にローカル削除）
 *   node .claude/scripts/youtube/upload-shorts-to-r2.mjs --force       # 既存も再アップ
 *   node .claude/scripts/youtube/upload-shorts-to-r2.mjs --no-cleanup  # ローカルファイルを残す
 *
 * 認証: .env.local または環境変数の CLOUDFLARE_ACCOUNT_ID /
 *       CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';

function loadEnv() {
  const env = { ...process.env };
  if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

const env = loadEnv();
const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_KEY = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Error: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY が必要');
  process.exit(1);
}

const BUCKET = 'doboku-note';
const VIDEO_PREFIX = 'sns/youtube-shorts/';
const THUMB_PREFIX = 'sns/youtube-thumbnails/';
const force = process.argv.includes('--force');
const cleanup = !process.argv.includes('--no-cleanup');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

/** dir 名から日付プレフィックスを除去して安定キーにする。2026-06-05-r03-pack-01-q1 → r03-pack-01-q1 */
function stableKey(dir) {
  const m = dir.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
  return m ? m[1] : dir;
}

async function uploadIfNew(key, filePath, contentType) {
  if (!existsSync(filePath)) return 'missing';
  if (!force) {
    try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); return 'skip'; } catch { /* not exists → upload */ }
  }
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: readFileSync(filePath), ContentType: contentType }));
  return 'up';
}

const root = 'content/sns/youtube';
const dirs = readdirSync(root).filter((d) => /-q\d+$/.test(d) && statSync(join(root, d)).isDirectory()).sort();
let up = 0, skip = 0, fail = 0, thumbUp = 0, thumbSkip = 0, cleaned = 0;
for (const d of dirs) {
  const sk = stableKey(d);
  const mp4 = join(root, d, 'shorts.mp4');
  const png = join(root, d, 'thumbnail.png');

  // mp4
  if (!existsSync(mp4)) { console.log(`  ⚠ ${d}: shorts.mp4 なし`); continue; }
  const videoKey = `${VIDEO_PREFIX}${sk}.mp4`;
  let videoOk = false;
  try {
    const r = await uploadIfNew(videoKey, mp4, 'video/mp4');
    if (r === 'up') { up++; if (up % 20 === 0) console.log(`  ... mp4 ${up} 本アップ`); }
    else if (r === 'skip') skip++;
    videoOk = true;
  } catch (e) { console.log(`  ✗ ${videoKey}: ${e.message}`); fail++; }

  // thumbnail
  const thumbKey = `${THUMB_PREFIX}${sk}.png`;
  try {
    const r = await uploadIfNew(thumbKey, png, 'image/png');
    if (r === 'up') thumbUp++;
    else if (r === 'skip') thumbSkip++;
    // 'missing' は静かにスキップ（古い生成物には thumbnail がない場合もある）
  } catch (e) { console.log(`  ✗ ${thumbKey}: ${e.message}`); }

  // mp4 が R2 に確認できた場合のみローカルディレクトリを削除
  if (cleanup && videoOk) {
    rmSync(join(root, d), { recursive: true, force: true });
    cleaned++;
  }
}
console.log(`\nR2 アップ完了:`);
console.log(`  mp4:       新規 ${up} / スキップ(既存) ${skip} / 失敗 ${fail}`);
console.log(`  thumbnail: 新規 ${thumbUp} / スキップ(既存) ${thumbSkip}`);
if (cleanup) console.log(`  ローカル削除: ${cleaned} ディレクトリ`);
else console.log(`  ローカルファイル: 削除スキップ (--no-cleanup)`);

#!/usr/bin/env node
/**
 * 既にアップ済み（videoId 設定済み）の動画に対してサムネイルを後付け設定する。
 *
 * post-from-schedule.cjs が thumbnails.set を実装する前にアップされた動画向けの
 * 一回限りの補完スクリプト。
 *
 * Usage:
 *   node .claude/scripts/youtube/set-thumbnail-uploaded.mjs
 *   node .claude/scripts/youtube/set-thumbnail-uploaded.mjs --dry-run  # 対象確認のみ
 *
 * 認証: .env.local または環境変数の YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET /
 *       YOUTUBE_REFRESH_TOKEN / CLOUDFLARE_* 系
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { createReadStream } from 'node:fs';
import { google } from 'googleapis';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

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
const DRY = process.argv.includes('--dry-run');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY },
});
const BUCKET = 'doboku-note';
const THUMB_PREFIX = 'sns/youtube-thumbnails/';

const oauth2 = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
oauth2.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN });
const youtube = google.youtube({ version: 'v3', auth: oauth2 });

async function downloadR2(key, dest) {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const c of obj.Body) chunks.push(c);
  writeFileSync(dest, Buffer.concat(chunks));
}

async function r2Exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); return true; } catch { return false; }
}

const ledger = JSON.parse(readFileSync('.claude/state/youtube-schedule.json', 'utf8'));
const uploaded = ledger.items.filter((it) => it.videoId);
console.log(`videoId 設定済み: ${uploaded.length} 本`);

if (DRY) {
  for (const it of uploaded) console.log(`  ${it.key}  videoId=${it.videoId}`);
  process.exit(0);
}

let done = 0, fail = 0;
for (const it of uploaded) {
  const thumbKey = `${THUMB_PREFIX}${it.key}.png`;
  const tmpPng = join(os.tmpdir(), `${it.key}-thumbnail.png`);
  try {
    if (!await r2Exists(thumbKey)) { console.log(`  ⚠ ${it.key}: R2 サムネイルなし → generate-thumbnails.mjs を先に実行`); fail++; continue; }
    await downloadR2(thumbKey, tmpPng);
    await youtube.thumbnails.set({
      videoId: it.videoId,
      media: { mimeType: 'image/png', body: createReadStream(tmpPng) },
    });
    console.log(`  ✓ ${it.key} (${it.videoId}) サムネイル設定`);
    done++;
  } catch (e) {
    console.error(`  ✗ ${it.key}: ${e.message}`);
    fail++;
  } finally {
    if (existsSync(tmpPng)) { import('node:fs').then(f => f.unlinkSync(tmpPng)).catch(() => {}); }
  }
}
console.log(`\n完了: ${done} 本 / 失敗 ${fail}`);

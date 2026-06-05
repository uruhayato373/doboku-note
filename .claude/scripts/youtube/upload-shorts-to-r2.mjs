#!/usr/bin/env node
/**
 * YouTube Shorts の shorts.mp4 を Cloudflare R2（S3 API）へアップロードする。
 *
 * CI/CD 予約投稿のため、生成済み mp4 を R2 に保管し、投稿ワークフローが
 * そこから取得して YouTube にアップする。mp4 自体は git 追跡しない（gitignore）。
 *
 * R2 キー: sns/youtube-shorts/<year>-pack-<NN>-q<N>.mp4（dir の日付プレフィックスは除去）
 * 公開URL: https://storage.doboku-note.com/sns/youtube-shorts/<key>.mp4
 *
 * Usage:
 *   node .claude/scripts/youtube/upload-shorts-to-r2.mjs            # 全 -qN dir
 *   node .claude/scripts/youtube/upload-shorts-to-r2.mjs --force    # 既存も再アップ
 *
 * 認証: .env.local または環境変数の CLOUDFLARE_ACCOUNT_ID /
 *       CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
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
const PREFIX = 'sns/youtube-shorts/';
const force = process.argv.includes('--force');

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

const root = 'docs/sns/youtube';
const dirs = readdirSync(root).filter((d) => /-q\d+$/.test(d) && statSync(join(root, d)).isDirectory()).sort();
let up = 0, skip = 0, fail = 0;
for (const d of dirs) {
  const mp4 = join(root, d, 'shorts.mp4');
  if (!existsSync(mp4)) { console.log(`  ⚠ ${d}: shorts.mp4 なし`); continue; }
  const key = `${PREFIX}${stableKey(d)}.mp4`;
  if (!force) {
    try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); skip++; continue; } catch { /* not exists → upload */ }
  }
  try {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: readFileSync(mp4), ContentType: 'video/mp4' }));
    up++;
    if (up % 20 === 0) console.log(`  ... ${up} 本アップ`);
  } catch (e) { console.log(`  ✗ ${key}: ${e.message}`); fail++; }
}
console.log(`\nR2 アップ完了: 新規 ${up} / スキップ(既存) ${skip} / 失敗 ${fail}  → r2://${BUCKET}/${PREFIX}`);

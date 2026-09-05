#!/usr/bin/env node
/**
 * YouTube API ワークフローへ通常動画を渡すため、レンダー済み mp4/thumbnail を
 * private R2 へ一時配置する。R2 は保管先ではなく転送用ステージに限定し、
 * YouTube の scheduled 実査後は --delete --commit で同じキーだけを削除する。
 *
 * 既定は dry-run。書き込み・削除には --commit が必要。
 */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client,
} from '@aws-sdk/client-s3';

const ROOT = process.cwd();
const STATE_PATH = join(ROOT, '.claude/state/video-content-status.json');
const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
const BUCKET = 'doboku-note-archive';
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const val = (name, fallback = '') => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const exams = new Set(val('--exam', 'concrete-engineer,concrete-chief-engineer').split(',').filter(Boolean));
const commit = flag('--commit');
const deleting = flag('--delete');

function loadEnv() {
  const env = { ...process.env };
  const p = join(ROOT, '.env.local');
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function bodyBuffer(body) {
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function targets() {
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  const rows = [];
  for (const exam of exams) {
    const examRoot = join(PACKS_ROOT, exam);
    if (!existsSync(examRoot)) throw new Error(`試験ディレクトリがありません: ${exam}`);
    for (const packId of Object.keys(state.packs ?? {}).sort()) {
      const packDir = join(examRoot, packId);
      const youtubePath = join(packDir, 'youtube.json');
      if (!existsSync(youtubePath)) continue;
      const derivative = state.packs[packId]?.derivatives?.longform;
      const allowed = deleting ? derivative?.status === 'scheduled' : derivative?.status === 'rendered';
      if (!allowed) continue;
      if (deleting && (!derivative.videoId || derivative.privacyStatus !== 'private' || !derivative.publishAt)) {
        throw new Error(`${packId}: scheduled のAPI実体が不足しているため削除できません`);
      }
      const youtube = JSON.parse(readFileSync(youtubePath, 'utf8'));
      const item = youtube.longform;
      const video = join(ROOT, '.tmp/video-render', packId, 'video.mp4');
      const thumbnail = join(ROOT, '.tmp/video-render', packId, 'img/00-cover.png');
      if (!deleting) {
        for (const p of [video, thumbnail]) {
          if (!existsSync(p) || statSync(p).size === 0) throw new Error(`${packId}: レンダー実体がありません ${p}`);
        }
      }
      rows.push({ packId, item, video, thumbnail });
    }
  }
  return rows;
}

async function main() {
  const rows = targets();
  console.log(`[youtube-r2-stage] ${deleting ? '削除' : '配置'}対象 ${rows.length}本 / ${[...exams].join(',')}`);
  if (rows.length === 0) throw new Error('対象が0本です。state と --exam を確認してください');
  for (const row of rows) console.log(`  ${row.packId}: ${row.item.r2Key}`);
  if (!commit) return console.log('[youtube-r2-stage] dry-run（R2は変更していません）');

  const env = loadEnv();
  const required = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY'];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) throw new Error(`環境変数が不足: ${missing.join(', ')}`);
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  });

  for (const [index, row] of rows.entries()) {
    if (deleting) {
      for (const key of [row.item.r2Key, row.item.thumbnailR2Key]) {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
        try {
          await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
          throw new Error(`${row.packId}: 削除後もR2に残っています ${key}`);
        } catch (error) {
          if (error?.$metadata?.httpStatusCode !== 404 && error?.name !== 'NotFound') throw error;
        }
      }
      console.log(`  [${index + 1}/${rows.length}] deleted ${row.packId}`);
      continue;
    }

    const assets = [
      { file: row.video, key: row.item.r2Key, type: 'video/mp4', expected: row.item.sha256 },
      { file: row.thumbnail, key: row.item.thumbnailR2Key, type: 'image/png', expected: row.item.thumbnailSha256 },
    ];
    for (const asset of assets) {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: asset.key, Body: createReadStream(asset.file), ContentType: asset.type,
      }));
      const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: asset.key }));
      const actual = sha256Buffer(await bodyBuffer(got.Body));
      if (actual !== asset.expected) throw new Error(`${row.packId}: R2 sha256不一致 ${asset.key}`);
    }
    console.log(`  [${index + 1}/${rows.length}] staged+verified ${row.packId}`);
  }
  console.log(`[youtube-r2-stage] 完了 ${rows.length}本`);
}

main().catch((error) => {
  console.error(`[youtube-r2-stage] FAIL: ${error.stack || error.message}`);
  process.exit(1);
});

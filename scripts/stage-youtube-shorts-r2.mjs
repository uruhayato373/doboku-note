#!/usr/bin/env node
/**
 * 動画パック派生 Shorts の mp4/thumbnail を YouTube API 受け渡し用 private R2 へ配置する。
 * 既定は dry-run。--commit で upload 後に sha256 を読み戻して検証する。
 */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ROOT = process.cwd();
const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
const RENDER_ROOT = join(ROOT, '.tmp/video-render');
const STATE = JSON.parse(readFileSync(join(ROOT, '.claude/state/video-content-status.json'), 'utf8'));
const DRIVE_MANIFEST_PATH = join(ROOT, '.claude/state/assets/drive-manifest.json');
const DRIVE_MANIFEST = existsSync(DRIVE_MANIFEST_PATH)
  ? JSON.parse(readFileSync(DRIVE_MANIFEST_PATH, 'utf8'))
  : { entries: {} };
const BUCKET = 'doboku-note-archive';
const argv = process.argv.slice(2);
const commit = argv.includes('--commit');
const arg = (name, fallback = '') => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const exams = new Set(arg('--exam', 'civil-construction-1,civil-construction-2,concrete-engineer,concrete-chief-engineer').split(',').filter(Boolean));
const max = Math.max(1, Number(arg('--max', '999')) || 999);
const concurrency = Math.min(8, Math.max(1, Number(arg('--concurrency', '4')) || 4));

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

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function hydrate(file) {
  if (existsSync(file)) return;
  const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
  console.log(`[youtube-shorts-stage] Driveから復元: ${rel}`);
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts/drive-vault-sync.mjs'), '--pull', '--path', rel], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0 || !existsSync(file)) throw new Error(`${rel}: Driveから復元できません`);
}

function assertReady(file, expected) {
  if (existsSync(file) && statSync(file).size > 0) {
    if (sha256(readFileSync(file)) !== expected) throw new Error(`${file}: sha256がyoutube.jsonと不一致です`);
    return;
  }
  const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
  const entry = DRIVE_MANIFEST.entries?.[rel];
  if (entry?.group !== 'video-render-artifact' || entry.sha256 !== expected || !(entry.bytes > 0)) {
    throw new Error(`${rel}: ローカルにも照合済みDrive台帳にもありません`);
  }
}

async function bodyBuffer(body) {
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function targets() {
  const rows = [];
  for (const exam of exams) {
    const examRoot = join(PACKS_ROOT, exam);
    if (!existsSync(examRoot)) throw new Error(`試験ディレクトリがありません: ${exam}`);
    for (const packId of readdirSync(examRoot).sort()) {
      const youtubePath = join(examRoot, packId, 'youtube.json');
      if (!existsSync(youtubePath)) continue;
      const youtube = JSON.parse(readFileSync(youtubePath, 'utf8'));
      const current = STATE.packs?.[packId]?.derivatives?.shorts ?? [];
      for (const item of youtube.shorts ?? []) {
        if (current.some((entry) => entry.key === item.key && entry.videoId)) continue;
        const video = join(RENDER_ROOT, packId, 'shorts', item.key, 'shorts.mp4');
        const thumbnail = join(RENDER_ROOT, packId, 'shorts', item.key, 'thumbnail.png');
        if (!/^[a-f0-9]{64}$/.test(item.sha256 ?? '') || !/^[a-f0-9]{64}$/.test(item.thumbnailSha256 ?? '')) {
          throw new Error(`${packId}/${item.key}: youtube.json のsha256が未確定です`);
        }
        rows.push({ packId, item, video, thumbnail });
      }
    }
  }
  return rows.sort((a, b) => a.item.publishAt.localeCompare(b.item.publishAt)).slice(0, max);
}

async function main() {
  const rows = targets();
  for (const row of rows) {
    assertReady(row.video, row.item.sha256);
    assertReady(row.thumbnail, row.item.thumbnailSha256);
  }
  console.log(`[youtube-shorts-stage] 対象 ${rows.length}本`);
  for (const row of rows.slice(0, 20)) console.log(`  ${row.item.publishAt} ${row.packId}/${row.item.key}`);
  if (rows.length > 20) console.log(`  ...ほか ${rows.length - 20}本`);
  if (!commit) return console.log('[youtube-shorts-stage] dry-run（R2は変更していません）');

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
  async function stageRow(row, index) {
    hydrate(row.video);
    hydrate(row.thumbnail);
    const assets = [
      { file: row.video, key: row.item.r2Key, type: 'video/mp4', expected: row.item.sha256 },
      { file: row.thumbnail, key: row.item.thumbnailR2Key, type: 'image/png', expected: row.item.thumbnailSha256 },
    ];
    for (const asset of assets) {
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: asset.key, Body: createReadStream(asset.file), ContentType: asset.type }));
      const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: asset.key }));
      const actual = sha256(await bodyBuffer(got.Body));
      if (actual !== asset.expected) throw new Error(`${row.packId}/${row.item.key}: R2 sha256不一致 ${asset.key}`);
    }
    console.log(`  [${index + 1}/${rows.length}] staged+verified ${row.packId}/${row.item.key}`);
  }
  let cursor = 0;
  async function worker() {
    while (cursor < rows.length) {
      const index = cursor++;
      await stageRow(rows[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, () => worker()));
}

main().catch((error) => {
  console.error(`[youtube-shorts-stage] FAIL: ${error.stack || error.message}`);
  process.exit(1);
});

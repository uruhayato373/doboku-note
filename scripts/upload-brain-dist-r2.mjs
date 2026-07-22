#!/usr/bin/env node
/**
 * upload-brain-dist-r2.mjs — Brain 商品配布物（.claude/config/brain/dist/ 配下）を
 * Cloudflare R2 の `brain/dist/` prefix へアップロードする。
 *
 * 配布URL: https://storage.doboku-note.com/brain/dist/<filename>
 * ファイル名に推測不能トークンを含める運用（リンクを知る人のみアクセス＝Driveリンク共有と同等）。
 * 実行は CI（r2-brain-dist.yml・workflow_dispatch）。ローカルは creds 無しの前提
 * （計測/アップロード系は CI/CD 供給が正: docs/reference/measurement-incidents.md）。
 *
 * 使い方: node scripts/upload-brain-dist-r2.mjs [--dry-run]
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, '.claude/config/brain/dist');
const BUCKET = 'doboku-note';
const dryRun = process.argv.includes('--dry-run');

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
if (!dryRun && (!ACCOUNT_ID || !KEY_ID || !SECRET)) {
  console.error('R2 credentials 不足（CI の secrets で供給）');
  process.exit(1);
}

const TYPES = { '.zip': 'application/zip', '.pdf': 'application/pdf' };

if (!existsSync(DIST)) { console.log('dist ディレクトリなし。終了'); process.exit(0); }
const files = readdirSync(DIST).filter((f) => TYPES[extname(f)] && statSync(join(DIST, f)).isFile());
if (files.length === 0) { console.log('対象ファイルなし'); process.exit(0); }

const s3 = dryRun ? null : new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: KEY_ID, secretAccessKey: SECRET },
});

for (const f of files) {
  const key = `brain/dist/${f}`;
  const url = `https://storage.doboku-note.com/${key}`;
  if (dryRun) { console.log(`[dry] ${key}`); continue; }
  let exists = false;
  try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); exists = true; } catch { /* not found */ }
  if (exists) { console.log(`skip（既存）: ${url}`); continue; }
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key,
    Body: readFileSync(join(DIST, f)),
    ContentType: TYPES[extname(f)],
  }));
  console.log(`uploaded: ${url}`);
}
console.log('done');

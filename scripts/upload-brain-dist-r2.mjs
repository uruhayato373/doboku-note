#!/usr/bin/env node
/**
 * upload-brain-dist-r2.mjs — Brain 商品配布物（content/brain/dist/ 配下）を
 * Cloudflare R2 の `brain/dist/` prefix へアップロードする。
 *
 * 配布URL: https://storage.doboku-note.com/brain/dist/<filename>
 * ファイル名に推測不能トークンを含める運用（リンクを知る人のみアクセス＝Driveリンク共有と同等）。
 * ローカル移動後も R2 object key は `brain/dist/{filename}` のまま不変（DN-0103 Phase 03）。
 * 実行は CI（r2-brain-dist.yml・workflow_dispatch）。ローカルは creds 無しの前提
 * （計測/アップロード系は CI/CD 供給が正: .claude/knowledge/reference/measurement-incidents.md）。
 *
 * 使い方:
 *   node scripts/upload-brain-dist-r2.mjs [--dry-run] [--file <basename>]
 *   node scripts/upload-brain-dist-r2.mjs --file <basename> --overwrite
 * 既存 object の上書きは誤爆防止のため単一 basename 指定を必須とし、
 * upload 後に R2 から読み戻した bytes の SHA-256 をローカルと照合する。
 */
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { BRAIN_DIST_ROOT } from './lib/repository-paths.mjs';

const DIST = BRAIN_DIST_ROOT;
const BUCKET = 'doboku-note';
const dryRun = process.argv.includes('--dry-run');
const overwrite = process.argv.includes('--overwrite');
const fileIndex = process.argv.indexOf('--file');
const onlyFile = fileIndex >= 0 ? process.argv[fileIndex + 1] : null;

if (overwrite && !onlyFile) {
  console.error('--overwrite は誤爆防止のため --file <dist basename> と同時指定が必須');
  process.exit(1);
}
if (onlyFile && (onlyFile.includes('/') || onlyFile.includes('\\'))) {
  console.error(`--file は basename のみ指定する: ${onlyFile}`);
  process.exit(1);
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
if (!dryRun && (!ACCOUNT_ID || !KEY_ID || !SECRET)) {
  console.error('R2 credentials 不足（CI の secrets で供給）');
  process.exit(1);
}

const TYPES = { '.zip': 'application/zip', '.pdf': 'application/pdf' };

if (!existsSync(DIST)) { console.log('dist ディレクトリなし。終了'); process.exit(0); }
let files = readdirSync(DIST).filter((f) => TYPES[extname(f)] && statSync(join(DIST, f)).isFile());
if (onlyFile) files = files.filter((f) => f === onlyFile);
if (files.length === 0) {
  console.error(onlyFile ? `指定した配布物が存在しない: ${onlyFile}` : '対象ファイルなし');
  process.exit(1);
}

const s3 = dryRun ? null : new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: KEY_ID, secretAccessKey: SECRET },
});

for (const f of files) {
  const key = `brain/dist/${f}`;
  const url = `https://storage.doboku-note.com/${key}`;
  if (dryRun) { console.log(`[dry${overwrite ? ' overwrite' : ''}] ${key}`); continue; }
  let exists = false;
  try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); exists = true; } catch { /* not found */ }
  if (exists && !overwrite) { console.log(`skip（既存）: ${url}`); continue; }
  const localBytes = readFileSync(join(DIST, f));
  const localSha = createHash('sha256').update(localBytes).digest('hex');
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key,
    Body: localBytes,
    ContentType: TYPES[extname(f)],
  }));
  const remote = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const remoteBytes = Buffer.from(await remote.Body.transformToByteArray());
  const remoteSha = createHash('sha256').update(remoteBytes).digest('hex');
  if (remoteSha !== localSha) {
    console.error(`upload 後 sha256 不一致: ${f} local=${localSha} remote=${remoteSha}`);
    process.exit(1);
  }
  console.log(`${exists ? 'overwritten' : 'uploaded'}: ${url} sha256=${localSha}`);
}
console.log('done');

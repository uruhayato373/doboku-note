/**
 * Upload images to R2 (S3 API) — 記事画像を公開バケット doboku-note の posts/ へ同期する（r2-sync.yml）。
 *
 * **変わった画像だけ送る**（2026-10-20）: 先にバケットを 1 回だけ一覧し（ListObjectsV2・1,000 件ごとに 1 リクエスト）、
 * 同じキーの ETag（1 回の PutObject で上げた物は中身の MD5）がローカルの MD5 と同じ画像は送らない。旧実装は main への
 * デプロイのたびに全画像を PutObject（Class A）し直していた。--force で全件を送り直す（Cache-Control を付け直すときなど）。
 * 公開画像には Cache-Control（1 日）を付ける。無いと Cloudflare の既定 4 時間で CDN のキャッシュが切れ、R2 から読み直す。
 * **MDX は R2 へ置かない**: サイトはリポジトリから組み立てるので使い道が無く、公開 URL で下書きの本文まで読めてしまう。
 *
 * Usage:
 *   node .claude/scripts/upload-images-to-r2.mjs                      # 変わった画像だけ送る
 *   node .claude/scripts/upload-images-to-r2.mjs --dry-run             # 送る対象を数えて表示するだけ（一覧は取る）
 *   node .claude/scripts/upload-images-to-r2.mjs --force               # 全件を送り直す
 *   node .claude/scripts/upload-images-to-r2.mjs --prefix exam/civil   # 特定ディレクトリのみ
 *   node .claude/scripts/upload-images-to-r2.mjs --changed-out <path>  # 送った画像（キー・SHA-256・上書きか）を JSON で書く
 *                                                                      #（r2-sync が scripts/purge-r2-changed.mjs で CDN を更新して照合する）
 *   （--images-only は旧呼び出しとの互換のため受け付けるだけ。--mdx-only は廃止）
 */
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { REPO_ROOT as root, SITE_CONTENT_ROOT } from '../../scripts/lib/repository-paths.mjs';

// Load .env.local
const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}
const contentDir = SITE_CONTENT_ROOT;

// R2 のキーは常に '/' 区切り。Windows の path.join は '\\' を返すため正規化する
// （未正規化だと R2 キーが 'posts/...\\...\\q01.webp' になり URL と一致せず 404 になる）。
const toPosix = (p) => p.split(path.sep).join('/');

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Error: Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY in .env.local');
  process.exit(1);
}
const BUCKET = 'doboku-note';
const CONCURRENCY = 20;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const changedOutIdx = args.indexOf('--changed-out');
const changedOut = changedOutIdx !== -1 ? args[changedOutIdx + 1] : null;
const CACHE_CONTROL = 'public, max-age=86400';
if (args.includes('--mdx-only')) {
  console.error('Error: MDX は R2 へ置かない（--mdx-only は廃止。2026-10-20）');
  process.exit(1);
}
const prefixIdx = args.indexOf('--prefix');
const filterPrefix = prefixIdx !== -1 ? args[prefixIdx + 1] : null;
const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function findImages(dir, base = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, entry.name);
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findImages(full, rel));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (MIME_TYPES[ext]) {
        results.push({ full, rel, ext });
      }
    }
  }
  return results;
}

const normPrefix = filterPrefix ? toPosix(filterPrefix) : null;
const items = findImages(contentDir).filter((img) => !normPrefix || toPosix(img.rel).startsWith(normPrefix));

console.log(`Target: ${items.length} images`);
if (filterPrefix) console.log(`  Prefix: ${filterPrefix}`);

// バケットの今の中身（キー → ETag）。1,000 件ごとに 1 リクエストで、画像ごとの HeadObject より桁違いに少ない
async function listRemote(prefix) {
  const remote = new Map();
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token }));
    for (const o of res.Contents ?? []) remote.set(o.Key, String(o.ETag ?? '').replace(/"/g, ''));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return remote;
}

const md5 = (buf) => createHash('md5').update(buf).digest('hex');
let remote = new Map();
if (!force) {
  remote = await listRemote(`posts/${normPrefix ?? ''}`);
  console.log(`  R2 の既存: ${remote.size} 件（変わっていない画像は送らない）`);
}
const pending = [];
let unchanged = 0;
for (const item of items) {
  const key = `posts/${toPosix(item.rel)}`;
  const body = fs.readFileSync(item.full);
  if (!force && remote.get(key) === md5(body)) { unchanged++; continue; }
  pending.push({ ...item, key, body, overwritten: remote.has(key) });
}
console.log(`  送る: ${pending.length} 件 / 変わっていない: ${unchanged} 件${force ? '（--force で全件）' : ''}`);

if (dryRun) {
  for (const item of pending.slice(0, 20)) console.log(`  ${item.key}`);
  if (pending.length > 20) console.log(`  ... and ${pending.length - 20} more`);
  process.exit(0);
}

let uploaded = 0;
let failed = 0;
const sent = [];
const startTime = Date.now();

async function uploadOne(item) {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: item.key,
        Body: item.body,
        ContentType: MIME_TYPES[item.ext] || 'application/octet-stream',
        CacheControl: CACHE_CONTROL,
      })
    );
    uploaded++;
    sent.push({ key: item.key, sha256: createHash('sha256').update(item.body).digest('hex'), overwritten: item.overwritten });
    if (uploaded % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`  Progress: ${uploaded}/${pending.length} (${elapsed}s)`);
    }
  } catch (e) {
    console.error(`  FAILED: ${item.key} - ${e.message?.slice(0, 80)}`);
    failed++;
  }
}

// Process in concurrent batches
for (let i = 0; i < pending.length; i += CONCURRENCY) {
  const batch = pending.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(uploadOne));
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nDone in ${elapsed}s! Uploaded: ${uploaded}, Unchanged: ${unchanged}, Failed: ${failed}`);
if (changedOut) {
  fs.writeFileSync(changedOut, JSON.stringify({ uploaded: sent }, null, 2) + '\n');
  console.log(`  送った ${sent.length} 件（上書き ${sent.filter((x) => x.overwritten).length} 件）を ${changedOut} へ書いた`);
}

// 1 件でも失敗したら非ゼロ終了で CI を赤くする。
// （旧実装は個別失敗を握りつぶし exit 0 を返すため、R2 トークン失効が約2週間
//  サイレントに進行し本番画像 404 を放置していた。2026-05-29 再発防止で追加）
if (failed > 0) {
  console.error(`\nERROR: ${failed} upload(s) failed. R2 認証(トークン)・権限を確認してください。`);
  process.exitCode = 1;
}

/**
 * Upload MDX files and images to R2 (S3 API)
 *
 * Usage:
 *   node .claude/scripts/upload-images-to-r2.mjs                      # MDX + 画像をアップロード
 *   node .claude/scripts/upload-images-to-r2.mjs --images-only         # 画像のみ
 *   node .claude/scripts/upload-images-to-r2.mjs --mdx-only            # MDXのみ
 *   node .claude/scripts/upload-images-to-r2.mjs --dry-run             # プレビューのみ
 *   node .claude/scripts/upload-images-to-r2.mjs --prefix exam/civil   # 特定ディレクトリのみ
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { SITE_CONTENT_ROOT } from '../../scripts/lib/repository-paths.mjs';

const root = process.cwd();

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
const skipExisting = args.includes('--skip-existing');
const prefixIdx = args.indexOf('--prefix');
const filterPrefix = prefixIdx !== -1 ? args[prefixIdx + 1] : null;
const imagesOnly = args.includes('--images-only');
const mdxOnly = args.includes('--mdx-only');
const uploadBoth = !imagesOnly && !mdxOnly;

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
        results.push({ full, rel, ext, type: 'image' });
      }
    }
  }
  return results;
}

function findMdxFiles(dir, base = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, entry.name);
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMdxFiles(full, rel));
    } else if (entry.name.endsWith('.mdx')) {
      results.push({ full, rel, ext: '.mdx', type: 'mdx' });
    }
  }
  return results;
}

let items = [];

const normPrefix = filterPrefix ? toPosix(filterPrefix) : null;

if (uploadBoth || !mdxOnly) {
  const images = findImages(contentDir);
  if (normPrefix) {
    items.push(...images.filter((img) => toPosix(img.rel).startsWith(normPrefix)));
  } else {
    items.push(...images);
  }
}

if (uploadBoth || mdxOnly) {
  const mdxFiles = findMdxFiles(contentDir);
  if (normPrefix) {
    items.push(...mdxFiles.filter((mdx) => toPosix(mdx.rel).startsWith(normPrefix)));
  } else {
    items.push(...mdxFiles);
  }
}

console.log(`Found ${items.length} items${dryRun ? ' (dry-run)' : ''}`);
if (filterPrefix) console.log(`  Prefix: ${filterPrefix}`);

if (dryRun) {
  for (const item of items.slice(0, 20)) console.log(`  posts/${toPosix(item.rel)}`);
  if (items.length > 20) console.log(`  ... and ${items.length - 20} more`);
  process.exit(0);
}

let uploaded = 0;
let skipped = 0;
let failed = 0;
const startTime = Date.now();

async function uploadOne(item) {
  const key = `posts/${toPosix(item.rel)}`;
  let contentType;

  if (item.type === 'mdx') {
    contentType = 'text/plain; charset=utf-8';
  } else {
    contentType = MIME_TYPES[item.ext] || 'application/octet-stream';
  }

  const body = fs.readFileSync(item.full);

  if (skipExisting) {
    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
      if (head.ContentLength === body.length) {
        skipped++;
        return;
      }
    } catch {
      // Object doesn't exist, upload it
    }
  }

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    uploaded++;
    if ((uploaded + skipped) % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`  Progress: ${uploaded + skipped}/${items.length} (${elapsed}s)`);
    }
  } catch (e) {
    console.error(`  FAILED: ${key} - ${e.message?.slice(0, 80)}`);
    failed++;
  }
}

// Process in concurrent batches
for (let i = 0; i < items.length; i += CONCURRENCY) {
  const batch = items.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(uploadOne));
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nDone in ${elapsed}s! Uploaded: ${uploaded}, Skipped: ${skipped}, Failed: ${failed}`);

// 1 件でも失敗したら非ゼロ終了で CI を赤くする。
// （旧実装は個別失敗を握りつぶし exit 0 を返すため、R2 トークン失効が約2週間
//  サイレントに進行し本番画像 404 を放置していた。2026-05-29 再発防止で追加）
if (failed > 0) {
  console.error(`\nERROR: ${failed} upload(s) failed. R2 認証(トークン)・権限を確認してください。`);
  process.exitCode = 1;
}

/**
 * content/ 配下の img/ ディレクトリ内の画像を R2 (S3 API) にアップロードする。
 *
 * Usage:
 *   node scripts/upload-images-to-r2.mjs              # 全画像をアップロード
 *   node scripts/upload-images-to-r2.mjs --dry-run    # プレビューのみ
 *   node scripts/upload-images-to-r2.mjs --prefix general/design-manual  # 特定ディレクトリのみ
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Load .env.local
const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}
const contentDir = path.join(root, 'content');

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

let images = findImages(contentDir);
if (filterPrefix) {
  images = images.filter((img) => img.rel.startsWith(filterPrefix));
}

console.log(`Found ${images.length} images${dryRun ? ' (dry-run)' : ''}`);
if (filterPrefix) console.log(`  Prefix: ${filterPrefix}`);

if (dryRun) {
  for (const img of images.slice(0, 20)) console.log(`  ${img.rel}`);
  if (images.length > 20) console.log(`  ... and ${images.length - 20} more`);
  process.exit(0);
}

let uploaded = 0;
let skipped = 0;
let failed = 0;
const startTime = Date.now();

async function uploadOne(img) {
  const key = `content/${img.rel}`;
  const contentType = MIME_TYPES[img.ext] || 'application/octet-stream';
  const body = fs.readFileSync(img.full);

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
      console.log(`  Progress: ${uploaded + skipped}/${images.length} (${elapsed}s)`);
    }
  } catch (e) {
    console.error(`  FAILED: ${key} - ${e.message?.slice(0, 80)}`);
    failed++;
  }
}

// Process in concurrent batches
for (let i = 0; i < images.length; i += CONCURRENCY) {
  const batch = images.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(uploadOne));
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nDone in ${elapsed}s! Uploaded: ${uploaded}, Skipped: ${skipped}, Failed: ${failed}`);

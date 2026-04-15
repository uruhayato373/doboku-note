/**
 * R2 の旧 OGP 集中ディレクトリ `posts/ogp/*.png` を削除する
 *
 * Phase B で OGP は `posts/{category}/{slug}/ogp.png` に移行済み。
 * 旧パスは不要になったので削除する。
 *
 * Usage:
 *   node scripts/cleanup-r2-ogp.mjs --dry-run
 *   node scripts/cleanup-r2-ogp.mjs
 */
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Error: .env.local に CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY を設定してください');
  process.exit(1);
}

const BUCKET = 'doboku-note';
const PREFIX = 'posts/ogp/';
const DRY_RUN = process.argv.includes('--dry-run');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

async function listAll() {
  const keys = [];
  let ContinuationToken;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX,
      ContinuationToken,
    }));
    for (const o of res.Contents ?? []) if (o.Key) keys.push(o.Key);
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return keys;
}

async function deleteBatch(keys) {
  // DeleteObjects は1回あたり最大1000件
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: chunk.map(Key => ({ Key })), Quiet: true },
    }));
  }
}

async function main() {
  console.log(DRY_RUN ? '[DRY-RUN] R2 旧 OGP クリーンアップ' : 'R2 旧 OGP クリーンアップを開始');
  console.log(`  bucket: ${BUCKET}`);
  console.log(`  prefix: ${PREFIX}`);
  console.log('');

  const keys = await listAll();
  console.log(`対象: ${keys.length} 件`);

  if (keys.length === 0) {
    console.log('削除対象なし。');
    return;
  }

  for (const k of keys.slice(0, 5)) console.log(`  ${k}`);
  if (keys.length > 5) console.log(`  ...(残り ${keys.length - 5} 件)`);
  console.log('');

  if (DRY_RUN) {
    console.log('[DRY-RUN] 実行せずに終了。');
    return;
  }

  await deleteBatch(keys);
  console.log(`完了: ${keys.length} 件削除`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * 公的基準の章データ（.md・.jsonld）を R2 へ送る。変わったファイルだけ送る。
 * Pages の 20,000 件上限に余裕を持たせるため、章データは out/ から除いて R2 で配信する
 * （/standards-data/:agency/:document/chapters/:file は _redirects で R2 へ転送）。
 *
 * 使い方: node scripts/upload-standards-data-r2.mjs [--dry-run]
 * exit: 0 成功 / 1 送信失敗 / 2 検査不成立（対象 0 件・認証情報なし）
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { isCliEntry } from './lib/cli-run.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const SOURCE = join(REPO_ROOT, 'public', 'standards-data');
const BUCKET = 'doboku-note';
const PREFIX = 'standards-data/';
const CONTENT_TYPES = { md: 'text/markdown; charset=utf-8', jsonld: 'application/ld+json; charset=utf-8' };

function fail(code, message) {
  console.error(`[standards-data-r2] ${message}`);
  process.exit(code);
}

export function chapterDataFiles(root) {
  if (!existsSync(root)) return [];
  return listFiles(root).filter((path) => /[\\/]chapters[\\/][^\\/]+\.(?:md|jsonld)$/.test(path));
}

async function remoteETags(client) {
  const tags = new Map();
  let token;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX, ContinuationToken: token }));
    for (const object of page.Contents ?? []) tags.set(object.Key, String(object.ETag ?? '').replaceAll('"', ''));
    token = page.NextContinuationToken;
  } while (token);
  return tags;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const files = chapterDataFiles(SOURCE);
  if (files.length === 0) fail(2, `対象 0 件（${SOURCE}）。先に npm run build-standards-data を実行する`);
  const { CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_R2_ACCESS_KEY_ID: accessKeyId, CLOUDFLARE_R2_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
  if (!accountId || !accessKeyId || !secretAccessKey) fail(2, 'R2 の認証情報が無い');
  const client = new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
  const remote = await remoteETags(client);
  const changed = files.filter((path) => {
    const key = `${PREFIX}${relative(SOURCE, path).split(sep).join('/')}`;
    return remote.get(key) !== createHash('md5').update(readFileSync(path)).digest('hex');
  });
  console.log(`[standards-data-r2] ${files.length} 件を検査 / 送信 ${changed.length} 件${dryRun ? '（dry-run）' : ''}`);
  if (dryRun) return;
  for (const path of changed) {
    const key = `${PREFIX}${relative(SOURCE, path).split(sep).join('/')}`;
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: readFileSync(path),
      ContentType: CONTENT_TYPES[path.split('.').pop()],
      CacheControl: 'public, max-age=86400',
    }));
  }
  console.log(`[standards-data-r2] 送信完了 ${changed.length} 件`);
}

if (isCliEntry(import.meta.url)) await main().catch((error) => fail(1, error.message));

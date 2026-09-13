#!/usr/bin/env node
/** Transfer approved covers to the YouTube Actions runner through temporary private R2 objects. */
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { loadEnvLocal, makeS3 } from './lib/asset-storage.mjs';
import { loadCoverSources } from './lib/youtube-cover-rollout.mjs';
import { coverInputDigest } from './lib/youtube-approved-cover.mjs';

const BUCKET = 'doboku-note-archive';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export function approvedCoverTransfers(sources) {
  if (!sources.length) throw new Error('Approved cover sources: 0');
  const rows = new Map();
  for (const { spec } of sources) {
    const image = spec.approvedImage;
    if (!image || !/^\.tmp\/video-render\/[a-z0-9-]+\/[a-z0-9-]+\.png$/.test(image.path ?? '') ||
        !/^[a-f0-9]{64}$/.test(image.sha256 ?? '') || image.specSha256 !== coverInputDigest(spec)) {
      throw new Error('Invalid or stale approved cover');
    }
    if (rows.has(image.path) && rows.get(image.path).sha256 !== image.sha256) throw new Error('Conflicting approved cover');
    rows.set(image.path, { path: image.path, sha256: image.sha256, key: `youtube-thumbnail-staging/${image.sha256}.png` });
  }
  return [...rows.values()];
}

export function verifyCoverBytes(bytes, expected) {
  if (digest(bytes) !== expected) throw new Error('Approved cover SHA-256 mismatch');
  return bytes;
}

async function main() {
  const { values: args } = parseArgs({ options: { pull: { type: 'boolean' }, delete: { type: 'boolean' }, commit: { type: 'boolean' } } });
  if (args.pull && (args.delete || args.commit)) throw new Error('--pull cannot combine with --delete/--commit');
  const root = process.cwd();
  const rows = approvedCoverTransfers(loadCoverSources(root));
  const mode = args.pull ? 'pull' : args.delete ? 'delete' : 'stage';
  // Validate every local input before the first upload.
  if (mode === 'stage') for (const row of rows) verifyCoverBytes(readFileSync(join(root, row.path)), row.sha256);
  console.log(JSON.stringify({ mode, selected: rows.length, bucket: BUCKET, commit: Boolean(args.commit) }));
  if (!args.pull && !args.commit) return;
  loadEnvLocal();
  const s3 = await makeS3();
  let done = 0, cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < rows.length) {
      const row = rows[cursor++], file = join(root, row.path);
      if (mode === 'delete') {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: row.key }));
        try {
          await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: row.key }));
          throw new Error('Staged object remains after deletion');
        } catch (error) {
          if (error?.$metadata?.httpStatusCode !== 404) throw error;
        }
      } else {
        if (mode === 'stage') await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: row.key,
          Body: verifyCoverBytes(readFileSync(file), row.sha256), ContentType: 'image/png' }));
        const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: row.key }));
        const bytes = verifyCoverBytes(Buffer.from(await got.Body.transformToByteArray()), row.sha256);
        if (mode === 'pull') {
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(`${file}.download`, bytes);
          renameSync(`${file}.download`, file);
        }
      }
      done++;
      if (done % 25 === 0 || done === rows.length) console.log(JSON.stringify({ mode, verified: done, selected: rows.length }));
    }
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => {
  console.error('YouTube cover transfer failed; not complete. Credentials and SDK diagnostics are not printed.');
  process.exitCode = 1;
});

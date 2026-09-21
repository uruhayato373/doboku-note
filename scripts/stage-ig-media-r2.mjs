#!/usr/bin/env node
/**
 * stage-ig-media-r2.mjs — Instagram Graph API 投稿用に、パックのメディアを一時的に
 * public R2（storage.doboku-note.com）へ置き、公開 URL を返す。
 * ---------------------------------------------------------------------------
 * なぜ要るか: Graph API の image_url / video_url はインターネットから取得可能な URL を
 * 要求する。パックのレンダー画像・動画は Git 追跡外（Drive vault / private R2）で
 * 公開 URL を持たないため、投稿の直前だけ public バケットへ置く。
 *
 * 置き場所: `sns/ig/<pack-slug>/<file>`（pack-slug は content/sns/instagram 配下の
 * 相対パスを '/' → '-' で潰したもの）。--cleanup で同 prefix を削除する
 * （投稿完了後に公開 URL を残さない）。
 *
 * 既定は put する（--dry-run で URL 計算だけに留める）。
 *
 * Usage:
 *   node scripts/stage-ig-media-r2.mjs --pack cem/keyword-packs/pfi --format carousel
 *   node scripts/stage-ig-media-r2.mjs --pack cem/keyword-packs/pfi --format carousel --dry-run
 *   node scripts/stage-ig-media-r2.mjs --pack cem/keyword-packs/pfi --format carousel --cleanup
 * ---------------------------------------------------------------------------
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfig, loadEnvLocal, makeS3, mimeFor, toPosix } from './lib/asset-storage.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
export const IG_DIR = join(ROOT, 'content/sns/instagram');
const R2_PREFIX = 'sns/ig';
const IMAGE_RE = /\.(png|jpe?g)$/i;

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, v] = a.slice(2).split('=');
    flags[k] = v !== undefined ? v : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
  }
  return flags;
}

function findFirstExisting(paths) {
  for (const p of paths) if (existsSync(p)) return p;
  return null;
}

/** パックディレクトリを解決する（content/sns/instagram 相対 / 絶対どちらも受ける）。 */
export function resolvePackDir(arg) {
  const candidates = [arg, join(IG_DIR, arg), join(ROOT, arg)];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isDirectory()) return c;
  }
  throw new Error(`STAGE_IG_PACK_NOT_FOUND: パックが見つかりません: ${arg}`);
}

export function packSlugFor(packDir) {
  const rel = toPosix(packDir.startsWith(IG_DIR) ? packDir.slice(IG_DIR.length + 1) : packDir);
  return rel.replace(/\//g, '-') || 'pack';
}

/** フォーマット別にステージ対象ファイル（絶対パス）を集める。 */
export function resolveMediaFiles(packDir, format) {
  if (format === 'carousel') {
    const imgDir = findFirstExisting([join(packDir, 'carousel', 'img'), join(packDir, 'img')]);
    if (!imgDir) throw new Error(`STAGE_IG_NO_IMAGES: carousel/img が見つかりません: ${packDir}`);
    const files = readdirSync(imgDir).filter((f) => IMAGE_RE.test(f)).sort().map((f) => join(imgDir, f));
    if (files.length === 0) throw new Error(`STAGE_IG_NO_IMAGES: 画像が 0 枚です: ${imgDir}`);
    return files;
  }
  if (format === 'reels') {
    const video = findFirstExisting([join(packDir, 'reels', 'video.mp4'), join(packDir, 'video.mp4')]);
    if (!video) throw new Error(`STAGE_IG_NO_VIDEO: reels/video.mp4 が見つかりません: ${packDir}`);
    return [video];
  }
  if (format === 'stories') {
    const media = findFirstExisting([
      join(packDir, 'stories', 'video.mp4'),
      join(packDir, 'stories', 'image.png'),
      join(packDir, 'stories', 'image.jpg'),
      join(packDir, 'video.mp4'),
      join(packDir, 'image.png'),
    ]);
    if (!media) throw new Error(`STAGE_IG_NO_STORY_MEDIA: stories 用メディアが見つかりません: ${packDir}`);
    return [media];
  }
  throw new Error(`STAGE_IG_UNKNOWN_FORMAT: ${format}`);
}

function publicHostFrom(cfg) {
  const host = cfg.buckets?.public?.publicHost;
  if (!host) throw new Error('STAGE_IG_NO_PUBLIC_HOST: asset-storage.json の buckets.public.publicHost が無い');
  return host;
}

/**
 * パックのメディアを public R2 へ put し、公開 URL 一覧を返す（既定 commit・--dry-run で put しない）。
 * @param {{ pack: string, format: 'carousel'|'reels'|'stories', dryRun?: boolean, s3Factory?: () => Promise<import('@aws-sdk/client-s3').S3Client>, cfg?: object }} opts
 */
export async function stagePackMedia({ pack, format, dryRun = false, s3Factory = makeS3, cfg = loadConfig() }) {
  const packDir = resolvePackDir(pack);
  const packSlug = packSlugFor(packDir);
  const files = resolveMediaFiles(packDir, format);
  const bucket = cfg.buckets.public.name;
  const host = publicHostFrom(cfg);
  const entries = files.map((file) => {
    const filename = file.split('/').pop();
    const key = `${R2_PREFIX}/${packSlug}/${filename}`;
    return { file, key, url: `https://${host}/${key}`, contentType: mimeFor(file) };
  });
  if (!dryRun) {
    const s3 = await s3Factory();
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { createReadStream } = await import('node:fs');
    for (const entry of entries) {
      await s3.send(new PutObjectCommand({
        Bucket: bucket, Key: entry.key, Body: createReadStream(entry.file), ContentType: entry.contentType,
      }));
    }
  }
  return { pack, format, packDir, packSlug, files: entries };
}

/** put 済みの prefix を削除する（投稿後の後片付け）。 */
export async function cleanupPackMedia({ pack, format, s3Factory = makeS3, cfg = loadConfig() }) {
  const packDir = resolvePackDir(pack);
  const packSlug = packSlugFor(packDir);
  const bucket = cfg.buckets.public.name;
  const prefix = `${R2_PREFIX}/${packSlug}/`;
  const s3 = await s3Factory();
  const { ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
  const listed = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
  const keys = (listed.Contents ?? []).map((o) => ({ Key: o.Key }));
  if (keys.length === 0) return { deleted: 0, prefix };
  await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
  return { deleted: keys.length, prefix };
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (!flags.pack || !flags.format) {
    console.error('Usage: node scripts/stage-ig-media-r2.mjs --pack <exam/pack> --format carousel|reels|stories [--dry-run] [--cleanup]');
    process.exit(2);
  }
  loadEnvLocal();
  try {
    if (flags.cleanup) {
      const result = await cleanupPackMedia({ pack: flags.pack, format: flags.format });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    const result = await stagePackMedia({ pack: flags.pack, format: flags.format, dryRun: Boolean(flags['dry-run']) });
    console.log(JSON.stringify({ pack: result.pack, format: result.format, packSlug: result.packSlug, files: result.files.map(({ file, key, url }) => ({ file, key, url })) }, null, 2));
  } catch (error) {
    console.error(`[stage-ig-media-r2] FAIL: ${error.message}`);
    process.exit(1);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}

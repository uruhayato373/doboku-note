#!/usr/bin/env node
/**
 * publish-ig.mjs
 *
 * Instagram カルーセル投稿（Meta Graph API 経由）。
 * docs/sns/instagram/<date>-<slug>/carousel/img/*.png を R2 にアップロードし、
 * 公開 URL を組み立てて Meta Graph API へカルーセル投稿する。
 *
 * Usage:
 *   node scripts/publish-ig.mjs <date>-<slug> [--dry-run] [--reels] [--force]
 *
 * Examples:
 *   node scripts/publish-ig.mjs 2026-05-15-process-capability-index --dry-run
 *   node scripts/publish-ig.mjs 2026-05-15-process-capability-index
 *
 * 重要: Instagram Graph API は publish 予約をネイティブサポートしない。
 * 即時投稿のみ。スケジューリングは外部 cron（GitHub Actions schedule 等）で行う。
 *
 * 環境変数 (.env.local):
 *   META_LONG_LIVED_TOKEN
 *   META_INSTAGRAM_BUSINESS_ACCOUNT_ID
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_R2_ACCESS_KEY_ID
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  postInstagramCarousel,
  postInstagramReel,
} from "../.claude/scripts/lib/sns-common/media-uploader.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const IG_DIR = join(PROJECT_ROOT, "docs/sns/instagram");
const R2_PUBLIC_BASE = "https://storage.doboku-note.com";
const R2_SNS_PREFIX = "sns/instagram";
const R2_BUCKET = "doboku-note";

// ─── .env.local ロード ──────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(PROJECT_ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

// ─── slide-data.json から caption を構成 ───────────────────────────────────
const MANAGEMENT_HASHTAGS = {
  economic: "経済性管理",
  safety: "安全管理",
  quality: "品質管理",
  information: "情報管理",
  "human-resource": "人的資源管理",
  human_resource: "人的資源管理",
  "social-environment": "社会環境管理",
  social_environment: "社会環境管理",
};

function buildCaption({ slideData, slug }) {
  const keyword = slideData.cover?.keyword || slug;
  const body = slideData.board?.body || "";
  const note = slideData.board?.noteText || "";
  const related = slideData.cta?.related || [];
  const management = slideData.cover?.management || slideData.board?.management;
  const mgmtTag = MANAGEMENT_HASHTAGS[management] || "";

  // doboku-note URL（pe-comprehensive-management-<slug>）
  const docsUrl = `https://doboku-note.com/docs/pe-comprehensive-management-${slug}?utm_source=instagram&utm_medium=organic&utm_campaign=keyword-${slug}`;

  const lines = [
    `【総監キーワード解説】${keyword}`,
    "",
    body,
  ];
  if (note) {
    lines.push("");
    lines.push(`📌 ${note}`);
  }
  if (related.length) {
    lines.push("");
    lines.push("▼ 関連キーワード");
    for (const r of related) lines.push(`・${r}`);
  }
  lines.push("");
  lines.push(`▼ 詳細解説`);
  lines.push(docsUrl);
  lines.push("");

  // ハッシュタグ（IG は最大30個、ここでは7個に絞る）
  const tags = ["#技術士", "#総合技術監理部門", "#技術士総監"];
  if (mgmtTag) tags.push(`#${mgmtTag}`);
  tags.push("#試験対策", "#資格勉強", `#${keyword.replace(/[\s／/]/g, "")}`);
  lines.push(tags.join(" "));

  return lines.join("\n");
}

// ─── R2 アップロード ────────────────────────────────────────────────────────
function makeS3() {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID");
  const accessKey = requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID");
  const secretKey = requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
}

async function uploadToR2({ s3, filePath, key, dryRun }) {
  const url = `${R2_PUBLIC_BASE}/${key}`;
  if (dryRun) {
    console.log(`  [dry-run] upload ${basename(filePath)} → ${url}`);
    return url;
  }
  const body = readFileSync(filePath);
  const contentType = filePath.endsWith(".mp4") ? "video/mp4" : "image/png";
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  console.log(`  ✅ uploaded ${basename(filePath)} → ${url}`);
  return url;
}

// ─── status.json 更新 ──────────────────────────────────────────────────────
function updateStatus(postDir, channel, info) {
  const path = join(postDir, "status.json");
  const cur = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  cur[channel] = {
    ...(cur[channel] || {}),
    ...info,
    updated_at: new Date().toISOString(),
  };
  writeFileSync(path, JSON.stringify(cur, null, 2) + "\n", "utf8");
}

// ─── メイン ────────────────────────────────────────────────────────────────
async function publishCarousel(postDirName, opts) {
  const postDir = join(IG_DIR, postDirName);
  if (!existsSync(postDir)) throw new Error(`Not found: ${postDir}`);

  const slideDataPath = join(postDir, "slide-data.json");
  if (!existsSync(slideDataPath)) throw new Error(`Missing slide-data.json: ${postDir}`);
  const slideData = JSON.parse(readFileSync(slideDataPath, "utf8"));

  const carouselImgDir = join(postDir, "carousel/img");
  if (!existsSync(carouselImgDir)) throw new Error(`Missing carousel/img: ${postDir}`);
  const pngs = readdirSync(carouselImgDir)
    .filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
    .sort();
  if (pngs.length < 2 || pngs.length > 10) {
    throw new Error(`Carousel requires 2-10 images, got ${pngs.length}`);
  }

  // status.json 確認（既投稿チェック）
  const statusPath = join(postDir, "status.json");
  if (existsSync(statusPath) && !opts.force) {
    const cur = JSON.parse(readFileSync(statusPath, "utf8"));
    if (cur.carousel?.posted_at) {
      console.log(`⚠️  既に投稿済み: ${cur.carousel.posted_at} (--force で再投稿)`);
      return;
    }
  }

  // slug = ディレクトリ名から先頭 YYYY-MM-DD- を除去
  const slug = postDirName.replace(/^\d{4}-\d{2}-\d{2}-/, "");

  console.log(`\n📁 ${postDirName} (${pngs.length} images)`);

  // R2 アップロード
  const s3 = opts.dryRun ? null : makeS3();
  const imageUrls = [];
  for (const png of pngs) {
    const key = `${R2_SNS_PREFIX}/${postDirName}/carousel/${png}`;
    const url = await uploadToR2({
      s3,
      filePath: join(carouselImgDir, png),
      key,
      dryRun: opts.dryRun,
    });
    imageUrls.push(url);
  }

  // caption 構成
  const caption = buildCaption({ slideData, slug });
  console.log(`\n--- caption (${[...caption].length} chars) ---\n${caption}\n---`);

  if (opts.dryRun) {
    console.log("\n[dry-run] Skipping actual IG publish");
    return;
  }

  // Meta API 投稿
  console.log("\n📤 Publishing to Instagram...");
  const result = await postInstagramCarousel({ imageUrls, caption });
  console.log(`✅ posted: ${result.permalink}`);

  updateStatus(postDir, "carousel", {
    media_id: result.mediaId,
    permalink: result.permalink,
    posted_at: new Date().toISOString(),
    image_urls: imageUrls,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dirName = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  const reels = args.includes("--reels");
  const force = args.includes("--force");

  if (!dirName) {
    console.log("Usage:");
    console.log("  node scripts/publish-ig.mjs <YYYY-MM-DD-slug> [--dry-run] [--reels] [--force]");
    console.log("\nAvailable posts:");
    const posts = readdirSync(IG_DIR)
      .filter((f) => /^\d{4}-\d{2}-\d{2}-/.test(f))
      .sort();
    posts.forEach((p) => console.log(`  - ${p}`));
    process.exit(1);
  }

  if (reels) {
    console.log("Reels publishing not yet wired in this script. Use postInstagramReel directly.");
    process.exit(1);
  }

  try {
    await publishCarousel(dirName, { dryRun, force });
    console.log("\n✨ 完了");
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();

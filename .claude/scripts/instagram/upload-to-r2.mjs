/**
 * IG 投稿用素材を Cloudflare R2 にアップロードする
 *
 * Usage:
 *   node .claude/scripts/instagram/upload-to-r2.mjs <slug>
 *   node .claude/scripts/instagram/upload-to-r2.mjs <slug> --domain ig
 *
 * 入力: docs/sns/instagram/{slug}/
 *   ├ slide-data.json
 *   ├ caption.txt          (generate-caption.cjs で生成済み)
 *   ├ carousel/img/*.png   (5 枚)
 *   └ reels/img/*.png + reel.mp4 (任意)
 *
 * 出力 (R2): sns/{domain}/{slug}/
 *   ├ instagram/caption.txt
 *   ├ carousel/img/*.png
 *   └ reels/img/*.png + reels/reel.mp4
 *
 * 公開 URL: https://storage.doboku-note.com/sns/{domain}/{slug}/...
 *
 * 環境変数:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_R2_ACCESS_KEY_ID
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";

// .env.local をロード
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const args = process.argv.slice(2);
const slug = args[0];
const domainIdx = args.indexOf("--domain");
const domain = domainIdx !== -1 ? args[domainIdx + 1] : "ig";
const dryRun = args.includes("--dry-run");

if (!slug) {
  console.error("Usage: node upload-to-r2.mjs <slug> [--domain ig] [--dry-run]");
  process.exit(1);
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error(
    "Error: Set CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY in .env.local",
  );
  process.exit(1);
}

const BUCKET = "doboku-note";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const sourceDir = path.join(process.cwd(), "docs", "sns", "instagram", slug);
if (!fs.existsSync(sourceDir)) {
  console.error(`Not found: ${sourceDir}`);
  process.exit(1);
}

// アップロード対象を列挙
const targets = []; // { localPath, r2Key, contentType }

// caption.txt → instagram/caption.txt
const captionPath = path.join(sourceDir, "caption.txt");
if (fs.existsSync(captionPath)) {
  targets.push({
    localPath: captionPath,
    r2Key: `sns/${domain}/${slug}/instagram/caption.txt`,
    contentType: MIME_TYPES[".txt"],
  });
}

// carousel/img/*.png
const carouselDir = path.join(sourceDir, "carousel", "img");
if (fs.existsSync(carouselDir)) {
  for (const file of fs.readdirSync(carouselDir)) {
    const ext = path.extname(file).toLowerCase();
    if (!MIME_TYPES[ext]) continue;
    targets.push({
      localPath: path.join(carouselDir, file),
      r2Key: `sns/${domain}/${slug}/carousel/img/${file}`,
      contentType: MIME_TYPES[ext],
    });
  }
}

// reels/img/*.png + reel.mp4
const reelsDir = path.join(sourceDir, "reels");
if (fs.existsSync(reelsDir)) {
  for (const file of fs.readdirSync(reelsDir)) {
    const ext = path.extname(file).toLowerCase();
    if (file === "img") continue;
    if (!MIME_TYPES[ext]) continue;
    targets.push({
      localPath: path.join(reelsDir, file),
      r2Key: `sns/${domain}/${slug}/reels/${file}`,
      contentType: MIME_TYPES[ext],
    });
  }
  const reelsImgDir = path.join(reelsDir, "img");
  if (fs.existsSync(reelsImgDir)) {
    for (const file of fs.readdirSync(reelsImgDir)) {
      const ext = path.extname(file).toLowerCase();
      if (!MIME_TYPES[ext]) continue;
      targets.push({
        localPath: path.join(reelsImgDir, file),
        r2Key: `sns/${domain}/${slug}/reels/img/${file}`,
        contentType: MIME_TYPES[ext],
      });
    }
  }
}

if (targets.length === 0) {
  console.error("アップロード対象が見つかりません");
  process.exit(1);
}

console.log(`\n[upload-to-r2] ${dryRun ? "DRY RUN" : ""} ${targets.length} 件をアップロード:`);
for (const t of targets) {
  const size = fs.statSync(t.localPath).size;
  console.log(`  ${t.r2Key} (${(size / 1024).toFixed(1)} KB)`);
}

if (dryRun) {
  console.log("\n[dry-run] 実際のアップロードはしません");
  process.exit(0);
}

let success = 0;
let failed = 0;
for (const t of targets) {
  try {
    const body = fs.readFileSync(t.localPath);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: t.r2Key,
        Body: body,
        ContentType: t.contentType,
      }),
    );
    success++;
    console.log(`  ✓ ${t.r2Key}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${t.r2Key}: ${e.message}`);
  }
}

console.log(`\n[upload-to-r2] success=${success}, failed=${failed}`);
console.log(`公開 URL ベース: https://storage.doboku-note.com/sns/${domain}/${slug}/`);
process.exit(failed > 0 ? 1 : 0);

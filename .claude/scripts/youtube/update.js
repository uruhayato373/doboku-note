#!/usr/bin/env node
/**
 * 投稿済み YouTube 動画のメタデータを更新するスクリプト
 *
 * meta.json を編集後にこのスクリプトを実行すると、
 * タイトル・説明・タグ・公開設定・サムネイルをすべて更新する。
 *
 * ※ 動画ファイル本体は変更不可（差し替えは削除 → 再アップロードが必要）
 *
 * 使い方:
 *   node .claude/scripts/youtube/update.js <ディレクトリ>
 *   node .claude/scripts/youtube/update.js <ディレクトリ> --no-thumbnail
 *   node .claude/scripts/youtube/update.js <ディレクトリ> --privacy public
 *
 * 例:
 *   node .claude/scripts/youtube/update.js content/sns/youtube/2026-05-15-access-control
 */

const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

// ── .env.local 読み込み ──
const envPath = path.join(__dirname, "..", "..", "..", ".env.local");
const envVars = {};
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2].trim();
}

const CLIENT_ID = envVars.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = envVars.YOUTUBE_CLIENT_SECRET;
const REFRESH_TOKEN = envVars.YOUTUBE_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error("Error: .env.local に YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN が必要です");
  process.exit(1);
}

// ── 引数パース ──
function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith("--")) {
    console.error("Usage: node .claude/scripts/youtube/update.js <ディレクトリ> [--no-thumbnail] [--privacy public|unlisted|private]");
    process.exit(1);
  }

  const dir = args[0];
  let noThumbnail = false;
  let privacy = null;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--no-thumbnail") noThumbnail = true;
    else if (args[i] === "--privacy") privacy = args[++i];
  }

  return { dir, noThumbnail, privacy };
}

async function main() {
  const opts = parseArgs();
  const absDir = path.resolve(opts.dir);

  if (!fs.existsSync(absDir)) {
    console.error(`Error: ディレクトリが見つかりません: ${absDir}`);
    process.exit(1);
  }

  const metaPath = path.join(absDir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    console.error(`Error: meta.json が見つかりません: ${metaPath}`);
    process.exit(1);
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

  if (!meta.youtubeVideoId) {
    console.error("Error: meta.json に youtubeVideoId がありません");
    console.error("  先に post.js でアップロードしてください");
    process.exit(1);
  }

  const videoId = meta.youtubeVideoId;
  const thumbnailFile = path.join(absDir, "thumbnail.png");
  const hasThumbnail = !opts.noThumbnail && fs.existsSync(thumbnailFile);
  const privacy = opts.privacy ?? meta.privacyStatus ?? "private";

  console.log("=== YouTube 動画メタデータ更新 ===");
  console.log(`Video ID: ${videoId}`);
  console.log(`URL: https://www.youtube.com/watch?v=${videoId}`);
  console.log(`タイトル: ${meta.title}`);
  console.log(`タグ: ${(meta.tags ?? []).join(", ")}`);
  console.log(`公開設定: ${privacy}`);
  if (meta.scheduledPublishAt) console.log(`公開予約: ${meta.scheduledPublishAt}`);
  console.log(`サムネイル更新: ${hasThumbnail ? "あり" : "スキップ"}`);
  console.log("");

  // OAuth2 認証
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  // メタデータ更新
  const status = { privacyStatus: privacy, selfDeclaredMadeForKids: false };
  if (meta.scheduledPublishAt && privacy === "private") {
    status.publishAt = meta.scheduledPublishAt;
  }

  await youtube.videos.update({
    part: "snippet,status",
    requestBody: {
      id: videoId,
      snippet: {
        title: meta.title,
        description: meta.description ?? "",
        tags: meta.tags ?? [],
        categoryId: meta.categoryId ?? "27",
        defaultLanguage: "ja",
        defaultAudioLanguage: "ja",
      },
      status,
    },
  });

  console.log("メタデータ更新完了");

  // サムネイル更新
  if (hasThumbnail) {
    console.log("サムネイル更新中...");
    try {
      await youtube.thumbnails.set({
        videoId,
        media: { mimeType: "image/png", body: fs.createReadStream(thumbnailFile) },
      });
      console.log("  サムネイル更新完了");
    } catch (err) {
      console.warn(`  Warning: サムネイル更新失敗 — ${err.message}`);
      console.warn(`  チャンネル確認（電話認証）でカスタムサムネイルが有効になります`);
    }
  }

  // meta.json に更新日時を記録
  meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  console.log("meta.json に updatedAt を記録しました");

  console.log(`\n=== 完了: https://www.youtube.com/watch?v=${videoId} ===`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  if (err.response?.data) console.error("Details:", JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});

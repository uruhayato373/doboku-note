#!/usr/bin/env node
/**
 * YouTube Data API v3 で動画をアップロードするスクリプト
 *
 * 使い方:
 *   node .claude/scripts/youtube/upload.js <動画ファイル> [オプション]
 *
 * オプション:
 *   --title       動画タイトル
 *   --description 動画説明文
 *   --tags        カンマ区切りタグ（例: "総合技術監理,技術士,試験対策"）
 *   --thumbnail   サムネイル画像パス（PNG/JPG）
 *   --privacy     unlisted | private | public (デフォルト: unlisted)
 *   --schedule    公開予約日時 (ISO 8601, 例: 2026-05-15T10:00:00+09:00)
 *
 * 例:
 *   node .claude/scripts/youtube/upload.js content/sns/youtube/video.mp4 \
 *     --title "ハインリッヒの法則" --privacy unlisted
 *
 * 前提:
 *   .env.local に YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN が必要
 *   なければ先に: node .claude/scripts/youtube/oauth-setup.js
 */

const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", "..", "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2].trim();
}

const CLIENT_ID = envVars.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = envVars.YOUTUBE_CLIENT_SECRET;
const REFRESH_TOKEN = envVars.YOUTUBE_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error("Error: .env.local に以下が必要です:");
  console.error("  YOUTUBE_CLIENT_ID");
  console.error("  YOUTUBE_CLIENT_SECRET");
  console.error("  YOUTUBE_REFRESH_TOKEN");
  console.error("\nまず認証を完了してください:");
  console.error("  node .claude/scripts/youtube/oauth-setup.js");
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith("--")) {
    console.error("Usage: node .claude/scripts/youtube/upload.js <video-file> [options]");
    process.exit(1);
  }

  const result = {
    videoFile: args[0],
    title: "無題",
    description: "",
    tags: [],
    thumbnail: null,
    privacy: "unlisted",
    schedule: null,
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--title":       result.title = args[++i]; break;
      case "--description": result.description = args[++i]; break;
      case "--tags":        result.tags = args[++i].split(",").map((t) => t.trim()); break;
      case "--thumbnail":   result.thumbnail = args[++i]; break;
      case "--privacy":     result.privacy = args[++i]; break;
      case "--schedule":    result.schedule = args[++i]; break;
    }
  }

  return result;
}

async function main() {
  const opts = parseArgs();

  if (!fs.existsSync(opts.videoFile)) {
    console.error(`Error: 動画ファイルが見つかりません: ${opts.videoFile}`);
    process.exit(1);
  }

  const fileSizeMB = (fs.statSync(opts.videoFile).size / 1024 / 1024).toFixed(1);
  console.log(`動画: ${opts.videoFile} (${fileSizeMB} MB)`);
  console.log(`タイトル: ${opts.title}`);
  console.log(`公開設定: ${opts.privacy}`);
  if (opts.schedule) console.log(`公開予約: ${opts.schedule}`);

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const status = { privacyStatus: opts.schedule ? "private" : opts.privacy };
  if (opts.schedule) status.publishAt = opts.schedule;

  console.log("\nアップロード中...");
  const res = await youtube.videos.insert({
    part: "snippet,status",
    requestBody: {
      snippet: {
        title: opts.title,
        description: opts.description,
        tags: opts.tags.length > 0 ? opts.tags : undefined,
        categoryId: "27", // Education
        defaultLanguage: "ja",
        defaultAudioLanguage: "ja",
      },
      status,
    },
    media: { body: fs.createReadStream(opts.videoFile) },
  });

  const videoId = res.data.id;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`\nアップロード完了!`);
  console.log(`  Video ID: ${videoId}`);
  console.log(`  URL: ${videoUrl}`);

  if (opts.thumbnail) {
    if (!fs.existsSync(opts.thumbnail)) {
      console.warn(`Warning: サムネイルが見つかりません: ${opts.thumbnail}`);
    } else {
      console.log(`\nサムネイル設定中...`);
      try {
        await youtube.thumbnails.set({
          videoId,
          media: { mimeType: "image/png", body: fs.createReadStream(opts.thumbnail) },
        });
        console.log(`  サムネイル設定完了`);
      } catch (err) {
        console.warn(`  Warning: サムネイル設定失敗 (${err.message})`);
        console.warn(`  → YouTubeチャンネルのカスタムサムネイル機能が有効でない可能性があります`);
        console.warn(`  → 動画のアップロード自体は成功しています`);
      }
    }
  }

  console.log(`\n完了: ${videoUrl}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  if (err.response?.data) console.error("Details:", JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});

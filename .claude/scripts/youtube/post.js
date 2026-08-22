#!/usr/bin/env node
/**
 * YouTube Shorts 予約投稿スクリプト
 *
 * content/sns/youtube/{date}-{slug}/ ディレクトリを指定するだけで投稿。
 * タイトル・説明・タグ・サムネイルはすべて meta.json から自動取得。
 * 公開予約時刻はディレクトリ名の日付から自動生成（JST 10:00 デフォルト）。
 *
 * 使い方:
 *   node .claude/scripts/youtube/post.js <ディレクトリ>
 *   node .claude/scripts/youtube/post.js <ディレクトリ> --time 18:00
 *   node .claude/scripts/youtube/post.js <ディレクトリ> --privacy public
 *   node .claude/scripts/youtube/post.js <ディレクトリ> --schedule 2026-05-13T10:00:00+09:00
 *
 * 例:
 *   node .claude/scripts/youtube/post.js content/sns/youtube/2026-05-13-360-degree-evaluation
 *   node .claude/scripts/youtube/post.js content/sns/youtube/2026-05-13-360-degree-evaluation --time 18:00
 *
 * 前提:
 *   .env.local に YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN が必要
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
  console.error("  node .claude/scripts/youtube/oauth-setup.js で認証してください");
  process.exit(1);
}

// ── 引数パース ──
function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith("--")) {
    console.error("Usage: node .claude/scripts/youtube/post.js <ディレクトリ> [--time HH:MM] [--privacy unlisted|private|public] [--schedule ISO8601]");
    process.exit(1);
  }

  const dir = args[0];
  let time = "10:00";
  let privacy = null;
  let schedule = null;

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--time":     time = args[++i]; break;
      case "--privacy":  privacy = args[++i]; break;
      case "--schedule": schedule = args[++i]; break;
    }
  }

  return { dir, time, privacy, schedule };
}

// ── ディレクトリ名から日付を抽出 ──
function extractDateFromDir(dir) {
  const base = path.basename(dir);
  const match = base.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

// ── JST datetime 文字列を生成 ──
function buildScheduleDateTime(date, time) {
  return `${date}T${time}:00+09:00`;
}

// ── メイン ──
async function main() {
  const opts = parseArgs();
  const absDir = path.resolve(opts.dir);

  if (!fs.existsSync(absDir)) {
    console.error(`Error: ディレクトリが見つかりません: ${absDir}`);
    process.exit(1);
  }

  // meta.json 読み込み
  const metaPath = path.join(absDir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    console.error(`Error: meta.json が見つかりません: ${metaPath}`);
    process.exit(1);
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

  // 動画ファイル
  const videoFile = path.join(absDir, "shorts.mp4");
  if (!fs.existsSync(videoFile)) {
    console.error(`Error: 動画ファイルが見つかりません: ${videoFile}`);
    process.exit(1);
  }

  // サムネイル（任意）
  const thumbnailFile = path.join(absDir, "thumbnail.png");
  const hasThumbnail = fs.existsSync(thumbnailFile);

  // 公開設定の決定
  const privacy = opts.privacy ?? meta.privacyStatus ?? "private";

  // 公開予約時刻の決定
  let publishAt = null;
  if (opts.schedule) {
    publishAt = opts.schedule;
  } else {
    const date = extractDateFromDir(opts.dir);
    if (date) {
      publishAt = buildScheduleDateTime(date, opts.time);
    }
  }

  const fileSizeMB = (fs.statSync(videoFile).size / 1024 / 1024).toFixed(1);

  console.log("=== YouTube Shorts 投稿 ===");
  console.log(`動画:     ${videoFile} (${fileSizeMB} MB)`);
  console.log(`タイトル: ${meta.title}`);
  console.log(`タグ:     ${(meta.tags ?? []).join(", ")}`);
  console.log(`公開設定: ${publishAt ? "予約投稿 → " + publishAt : privacy}`);
  console.log(`サムネイル: ${hasThumbnail ? thumbnailFile : "なし（スキップ）"}`);
  console.log("");

  // OAuth2 認証
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  // 公開ステータス設定
  const status = {
    privacyStatus: publishAt ? "private" : privacy,
    selfDeclaredMadeForKids: false,
  };
  if (publishAt) status.publishAt = publishAt;

  // アップロード
  console.log("アップロード中...");
  const res = await youtube.videos.insert({
    part: "snippet,status",
    requestBody: {
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
    media: { body: fs.createReadStream(videoFile) },
  });

  const videoId = res.data.id;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`\nアップロード完了!`);
  console.log(`  Video ID: ${videoId}`);
  console.log(`  URL: ${videoUrl}`);
  if (publishAt) {
    console.log(`  公開予約: ${publishAt}`);
  }

  // サムネイル設定
  if (hasThumbnail) {
    console.log(`\nサムネイル設定中...`);
    try {
      await youtube.thumbnails.set({
        videoId,
        media: { mimeType: "image/png", body: fs.createReadStream(thumbnailFile) },
      });
      console.log(`  サムネイル設定完了`);
    } catch (err) {
      console.warn(`  Warning: サムネイル設定失敗 — ${err.message}`);
      console.warn(`  チャンネル確認（電話認証）でカスタムサムネイルが有効になります`);
    }
  }

  // meta.json に投稿済み情報を記録
  meta.youtubeVideoId = videoId;
  meta.youtubeUrl = videoUrl;
  meta.postedAt = new Date().toISOString();
  if (publishAt) meta.scheduledPublishAt = publishAt;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  console.log(`\nmeta.json に youtubeVideoId を記録しました`);

  console.log(`\n=== 完了: ${videoUrl} ===`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  if (err.response?.data) console.error("Details:", JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});

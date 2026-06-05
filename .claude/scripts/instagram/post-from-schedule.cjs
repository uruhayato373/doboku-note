#!/usr/bin/env node
/**
 * GitHub Actions 用 IG 予約投稿スクリプト (doboku-note 版)
 *
 * `.claude/state/instagram-schedule.json` を読み、今日 (JST) と一致する
 * エントリがあれば Instagram Graph API で投稿する。
 *
 * 対応投稿タイプ:
 *   - carousel: 5 枚の PNG を順次 (00-cover, 01-board, 02-figure, 03-board, 04-cta)
 *   - reels:    1 本の mp4
 *   - image:    1 枚の PNG (カバー)
 *
 * 環境変数:
 *   INSTAGRAM_ACCESS_TOKEN
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID
 *   IG_PUBLIC_R2_BASE (default: https://storage.doboku-note.com)
 *   IG_SCHEDULE_FILE  (default: .claude/state/instagram-schedule.json)
 *   IG_FORCE_DATE     (test 用: JST 日付を強制指定 YYYY-MM-DD)
 *
 * 投稿成功 / 該当なし は exit 0、API エラーのみ exit 1
 *
 * Based on uruhayato373/stats47 の同名スクリプト (image + reels) に
 * Carousel 投稿機能を追加した doboku-note 派生版。
 */

const fs = require("node:fs");
const path = require("node:path");

// .env.local をロード（Mac 等のローカル実行用。GitHub Actions では存在しないので無視される）
const ENV_LOCAL = path.join(process.cwd(), ".env.local");
if (fs.existsSync(ENV_LOCAL)) {
  for (const line of fs.readFileSync(ENV_LOCAL, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Facebook ログイン版（Page トークン）= get-meta-token.mjs が書く META_* も互換で受ける
const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_LONG_LIVED_TOKEN;
const IG_USER_ID =
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ||
  process.env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID;
const PUBLIC_R2_BASE = process.env.IG_PUBLIC_R2_BASE || "https://storage.doboku-note.com";
const SCHEDULE_FILE =
  process.env.IG_SCHEDULE_FILE || ".claude/state/instagram-schedule.json";
const FORCE_DATE = process.env.IG_FORCE_DATE; // YYYY-MM-DD

// 認証ルート: Facebook ログイン版（graph.facebook.com + Page トークン + instagram_business_account.id）。
// Instagram ログイン版に切り替える場合は IG_GRAPH_BASE=https://graph.instagram.com/v21.0 を設定。
const GRAPH = process.env.IG_GRAPH_BASE || "https://graph.facebook.com/v21.0";

if (!TOKEN || !IG_USER_ID) {
  console.error("❌ INSTAGRAM_ACCESS_TOKEN または INSTAGRAM_BUSINESS_ACCOUNT_ID が未設定");
  process.exit(1);
}

// 既存ドラフトのファイル名規約 (docs/sns/instagram/{slug}/carousel/img/)
const CAROUSEL_SLIDES = [
  "00-cover.png",
  "01-board.png",
  "02-figure.png",
  "03-board.png",
  "04-cta.png",
];

function getJstDate() {
  if (FORCE_DATE) return FORCE_DATE;
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function findTodayEntry() {
  const file = path.resolve(SCHEDULE_FILE);
  if (!fs.existsSync(file)) {
    console.log(`[post-from-schedule] schedule file not found: ${file}`);
    return null;
  }
  const today = getJstDate();
  console.log(`[post-from-schedule] today (JST): ${today}`);
  const entries = JSON.parse(fs.readFileSync(file, "utf-8"));
  return entries.find((e) => e.date === today && e.status !== "posted") || null;
}

async function fetchCaption(domain, contentKey) {
  const url = `${PUBLIC_R2_BASE}/sns/${domain}/${contentKey}/instagram/caption.txt`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`caption fetch failed (${res.status}): ${url}`);
  return (await res.text()).trim();
}

function imageUrlFor(domain, contentKey, slide) {
  // doboku-note ドラフトのファイル名規約 (00-cover.png 等)
  return `${PUBLIC_R2_BASE}/sns/${domain}/${contentKey}/carousel/img/${slide}`;
}

function reelMediaUrl(domain, contentKey) {
  return `${PUBLIC_R2_BASE}/sns/${domain}/${contentKey}/reels/reel.mp4`;
}

function reelCoverUrl(domain, contentKey) {
  return `${PUBLIC_R2_BASE}/sns/${domain}/${contentKey}/reels/img/00-cover.png`;
}

async function fetchPermalink(mediaId) {
  try {
    const res = await fetch(
      `${GRAPH}/${mediaId}?fields=permalink&access_token=${TOKEN}`,
    );
    const json = await res.json();
    return json.permalink || `https://www.instagram.com/p/${mediaId}/`;
  } catch {
    return `https://www.instagram.com/p/${mediaId}/`;
  }
}

async function createContainer(params) {
  const res = await fetch(`${GRAPH}/${IG_USER_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, access_token: TOKEN }),
  });
  const json = await res.json();
  if (!json.id) {
    throw new Error(`container 作成失敗: ${JSON.stringify(json)}`);
  }
  return json.id;
}

async function pollUntilFinished(containerId, { maxTries = 30, intervalMs = 3000 } = {}) {
  for (let i = 0; i < maxTries; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(
      `${GRAPH}/${containerId}?fields=status_code&access_token=${TOKEN}`,
    );
    const json = await res.json();
    console.log(`  status (${i + 1}/${maxTries}): ${json.status_code}`);
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR") {
      throw new Error(`container 処理失敗: ${JSON.stringify(json)}`);
    }
  }
  throw new Error(`container 処理 timeout (${(maxTries * intervalMs) / 1000} 秒)`);
}

async function publish(containerId) {
  const res = await fetch(`${GRAPH}/${IG_USER_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      creation_id: containerId,
      access_token: TOKEN,
    }),
  });
  const json = await res.json();
  if (!json.id) throw new Error(`publish 失敗: ${JSON.stringify(json)}`);
  const permalink = await fetchPermalink(json.id);
  console.log(`✅ 投稿完了 media id: ${json.id}`);
  console.log(`PERMALINK=${permalink}`);
  return { mediaId: json.id, permalink };
}

async function postCarousel({ contentKey, caption, domain }) {
  console.log(`📦 carousel 子 container 作成 (${CAROUSEL_SLIDES.length} 枚)...`);
  const childIds = [];
  for (const slide of CAROUSEL_SLIDES) {
    const url = imageUrlFor(domain, contentKey, slide);
    const headRes = await fetch(url, { method: "HEAD" });
    if (!headRes.ok) {
      throw new Error(`carousel 画像到達不能 (${headRes.status}): ${url}`);
    }
    const childId = await createContainer({
      image_url: url,
      is_carousel_item: "true",
    });
    childIds.push(childId);
    console.log(`  ✓ ${slide} → ${childId}`);
  }

  console.log(`📦 carousel 親 container 作成...`);
  const parentId = await createContainer({
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
  });
  console.log(`  parent id: ${parentId}`);

  console.log(`⏳ carousel 処理 polling...`);
  await pollUntilFinished(parentId, { maxTries: 30, intervalMs: 3000 });

  console.log(`🚀 publish...`);
  return publish(parentId);
}

async function postReels({ contentKey, caption, videoUrl, domain }) {
  const coverUrl = reelCoverUrl(domain, contentKey);
  let useCoverUrl = false;
  try {
    const headRes = await fetch(coverUrl, { method: "HEAD" });
    useCoverUrl = headRes.ok;
    console.log(`🖼️  cover_url: ${useCoverUrl ? coverUrl : "なし（先頭フレーム使用）"}`);
  } catch {
    // cover なしで続行
  }

  console.log(`📦 reels container 作成...`);
  const containerId = await createContainer({
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    ...(useCoverUrl && { cover_url: coverUrl }),
  });
  console.log(`  container id: ${containerId}`);

  console.log(`⏳ 動画処理 polling...`);
  await pollUntilFinished(containerId, { maxTries: 60, intervalMs: 5000 });

  console.log(`🚀 publish...`);
  return publish(containerId);
}

async function postImage({ caption, imageUrl }) {
  console.log(`📦 image container 作成...`);
  const containerId = await createContainer({ image_url: imageUrl, caption });

  console.log(`⏳ image 処理 polling...`);
  await pollUntilFinished(containerId, { maxTries: 30, intervalMs: 3000 });

  console.log(`🚀 publish...`);
  return publish(containerId);
}

async function main() {
  const entry = findTodayEntry();
  if (!entry) {
    console.log(`[post-from-schedule] 今日の予定なし、skip`);
    process.exit(0);
  }

  console.log(`[post-from-schedule] 投稿対象: ${JSON.stringify(entry)}`);
  console.log(`DOMAIN=${entry.domain}`);
  console.log(`CONTENT_KEY=${entry.content_key}`);

  const caption = await fetchCaption(entry.domain, entry.content_key);
  console.log(`📝 caption (先頭 80): ${caption.slice(0, 80)}...`);

  if (entry.type === "carousel") {
    await postCarousel({ contentKey: entry.content_key, caption, domain: entry.domain });
  } else if (entry.type === "reels") {
    const videoUrl = reelMediaUrl(entry.domain, entry.content_key);
    const headRes = await fetch(videoUrl, { method: "HEAD" });
    if (!headRes.ok) {
      throw new Error(`reel URL 到達不能 (${headRes.status}): ${videoUrl}`);
    }
    console.log(`✅ media URL OK: ${videoUrl}`);
    await postReels({ contentKey: entry.content_key, caption, videoUrl, domain: entry.domain });
  } else if (entry.type === "image") {
    const imageUrl = imageUrlFor(entry.domain, entry.content_key, CAROUSEL_SLIDES[0]);
    const headRes = await fetch(imageUrl, { method: "HEAD" });
    if (!headRes.ok) {
      throw new Error(`image URL 到達不能 (${headRes.status}): ${imageUrl}`);
    }
    console.log(`✅ media URL OK: ${imageUrl}`);
    await postImage({ caption, imageUrl });
  } else {
    throw new Error(`未対応 type: ${entry.type}`);
  }
}

main().catch((err) => {
  console.error(`❌ ${err.message || err}`);
  process.exit(1);
});

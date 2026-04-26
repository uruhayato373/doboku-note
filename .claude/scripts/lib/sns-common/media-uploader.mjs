/**
 * SNS 投稿の API 抽象層。
 * Meta Graph API（Instagram）+ YouTube Data API v3 を統一インタフェースで扱う。
 *
 * 環境変数（GitHub Secrets で管理。Issue #163 SNS-prereq）:
 *   META_LONG_LIVED_TOKEN
 *   META_INSTAGRAM_BUSINESS_ACCOUNT_ID
 *   META_PAGE_ID
 *   YOUTUBE_CLIENT_ID
 *   YOUTUBE_CLIENT_SECRET
 *   YOUTUBE_REFRESH_TOKEN
 *   YOUTUBE_CHANNEL_ID
 *
 * トークン未設定時は明確なエラーで早期失敗（fail-fast）させる。
 */

import { google } from 'googleapis';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}. See Issue #163 SNS-prereq.`);
  }
  return v;
}

// ---- YouTube ----

/**
 * リフレッシュトークン経由で OAuth2 認証された YouTube クライアントを返す。
 * @returns {ReturnType<typeof google.youtube>}
 */
export function getYouTubeClient() {
  const clientId = requireEnv('YOUTUBE_CLIENT_ID');
  const clientSecret = requireEnv('YOUTUBE_CLIENT_SECRET');
  const refreshToken = requireEnv('YOUTUBE_REFRESH_TOKEN');

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.youtube({ version: 'v3', auth: oauth2Client });
}

/**
 * YouTube に動画をアップロードする。
 *
 * @param {object} args
 * @param {string} args.videoPath       - mp4 ファイルパス
 * @param {string} args.title
 * @param {string} args.description
 * @param {string[]} [args.tags]
 * @param {('public'|'unlisted'|'private')} [args.privacyStatus] - 既定: 'private'
 * @param {string} [args.thumbnailPath] - 1280×720 JPG/PNG
 * @param {string} [args.categoryId]    - YouTube カテゴリ ID（既定: '27' = Education）
 * @returns {Promise<{ videoId: string, url: string }>}
 */
export async function uploadYouTubeVideo({
  videoPath,
  title,
  description,
  tags = [],
  privacyStatus = 'private',
  thumbnailPath,
  categoryId = '27',
}) {
  if (!videoPath) throw new Error('videoPath is required');
  if (!title) throw new Error('title is required');
  const { createReadStream } = await import('node:fs');
  const youtube = getYouTubeClient();

  const insertRes = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: { title, description, tags, categoryId },
      status: { privacyStatus, selfDeclaredMadeForKids: false },
    },
    media: { body: createReadStream(videoPath) },
  });
  const videoId = insertRes.data.id;
  if (!videoId) {
    throw new Error('YouTube videos.insert did not return a video id');
  }

  if (thumbnailPath) {
    await youtube.thumbnails.set({
      videoId,
      media: { body: createReadStream(thumbnailPath) },
    });
  }

  return { videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
}

// ---- Meta (Instagram) ----

const META_GRAPH_BASE = 'https://graph.facebook.com/v21.0';

async function metaPost(endpoint, token, params) {
  const url = new URL(`${META_GRAPH_BASE}/${endpoint}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta Graph API POST ${endpoint} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function metaGet(endpoint, token, fields = []) {
  const url = new URL(`${META_GRAPH_BASE}/${endpoint}`);
  url.searchParams.set('access_token', token);
  if (fields.length > 0) url.searchParams.set('fields', fields.join(','));
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta Graph API GET ${endpoint} failed: ${res.status} ${body}`);
  }
  return res.json();
}

/**
 * Instagram カルーセル投稿。
 *
 * 流れ:
 *   1) 各画像で /media（IS_CAROUSEL_ITEM）を作成
 *   2) /media（CAROUSEL）でコンテナ化
 *   3) /media_publish で公開
 *
 * 注: image_url は Meta から到達可能な公開 URL（R2 等）でなければならない。
 *
 * @param {object} args
 * @param {string[]} args.imageUrls - 公開アクセス可能な URL（2〜10 枚）
 * @param {string} args.caption
 * @returns {Promise<{ mediaId: string, permalink: string }>}
 */
export async function postInstagramCarousel({ imageUrls, caption }) {
  if (!Array.isArray(imageUrls) || imageUrls.length < 2 || imageUrls.length > 10) {
    throw new Error('Instagram carousel requires 2-10 image URLs');
  }
  const igAccountId = requireEnv('META_INSTAGRAM_BUSINESS_ACCOUNT_ID');
  const token = requireEnv('META_LONG_LIVED_TOKEN');

  const childrenIds = [];
  for (const url of imageUrls) {
    const res = await metaPost(`${igAccountId}/media`, token, {
      image_url: url,
      is_carousel_item: 'true',
    });
    childrenIds.push(res.id);
  }

  const carouselRes = await metaPost(`${igAccountId}/media`, token, {
    media_type: 'CAROUSEL',
    children: childrenIds.join(','),
    caption,
  });

  const publishRes = await metaPost(`${igAccountId}/media_publish`, token, {
    creation_id: carouselRes.id,
  });

  const permalinkRes = await metaGet(`${publishRes.id}`, token, ['permalink']);

  return { mediaId: publishRes.id, permalink: permalinkRes.permalink };
}

/**
 * Instagram Reels 投稿（縦動画）。
 *
 * @param {object} args
 * @param {string} args.videoUrl - 公開アクセス可能な mp4 URL
 * @param {string} args.caption
 * @param {string} [args.coverUrl]
 * @returns {Promise<{ mediaId: string, permalink: string }>}
 */
export async function postInstagramReel({ videoUrl, caption, coverUrl }) {
  if (!videoUrl) throw new Error('videoUrl is required');
  const igAccountId = requireEnv('META_INSTAGRAM_BUSINESS_ACCOUNT_ID');
  const token = requireEnv('META_LONG_LIVED_TOKEN');

  const params = {
    media_type: 'REELS',
    video_url: videoUrl,
    caption,
  };
  if (coverUrl) params.cover_url = coverUrl;

  const containerRes = await metaPost(`${igAccountId}/media`, token, params);

  const publishRes = await metaPost(`${igAccountId}/media_publish`, token, {
    creation_id: containerRes.id,
  });

  const permalinkRes = await metaGet(`${publishRes.id}`, token, ['permalink']);

  return { mediaId: publishRes.id, permalink: permalinkRes.permalink };
}

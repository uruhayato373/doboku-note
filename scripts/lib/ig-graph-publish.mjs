/**
 * ig-graph-publish.mjs — Instagram Graph API 投稿の純粋関数群（fetch 注入）
 * ---------------------------------------------------------------------------
 * publish-ig-bs.ts（Business Suite / Playwright）は「予約投稿」ができる代わりに
 * ToS 上グレー・DOM 未検証というリスクを抱える。本モジュールは公式 Graph API 経由で
 * カルーセル / リール / ストーリーズを**即時公開**する経路（予約はできない）。
 *
 * 設計:
 *   - createIgPublisher({ fetchImpl }) — fetch を注入する。テストは fake fetchImpl で
 *     children 生成 → コンテナ作成 → status polling（IN_PROGRESS→FINISHED）→ publish の
 *     順序を検証できる。
 *   - token は URL クエリではなく Authorization: Bearer ヘッダで送る（ログ・エラーメッセージへ
 *     漏らさない。CLAUDE.md「秘密値を console・成果物へ出さない」）。
 *   - 純関数（buildCarouselPayloads / buildReelPayload / buildStoryPayload / mapGraphError）は
 *     fetch 抜きでテストできるよう分離してある。
 * ---------------------------------------------------------------------------
 */

export const DEFAULT_API_VERSION = 'v23.0';
export const DEFAULT_BASE = 'https://graph.facebook.com';
export const CAROUSEL_MIN = 2;
export const CAROUSEL_MAX = 10;
const DEFAULT_MAX_POLLS = 30;
const DEFAULT_POLL_INTERVAL_MS = 2000;

export class GraphApiError extends Error {
  constructor(message, { code, kind, raw } = {}) {
    super(message);
    this.name = 'GraphApiError';
    this.code = code;
    this.kind = kind;
    this.raw = raw;
  }
}

/**
 * Graph API のエラーコードを大まかな種別へ分類する。
 *   190            … AUTH（アクセストークン失効・権限不足）
 *   4 / 17 / 32    … RATE（レート制限）
 *   9007 / 2207xxx … MEDIA（メディア処理失敗・フォーマット不正）
 * 未知のコードは UNKNOWN。
 */
export function mapGraphError(error) {
  const code = error?.code;
  if (code === 190) return 'AUTH';
  if (code === 4 || code === 17 || code === 32) return 'RATE';
  if (code === 9007 || /^2207\d*$/.test(String(code ?? ''))) return 'MEDIA';
  return 'UNKNOWN';
}

/** カルーセル用: 子メディア + コンテナのペイロードを組み立てる（純関数・2〜10 枚のみ許可）。 */
export function buildCarouselPayloads({ imageUrls, caption }) {
  if (!Array.isArray(imageUrls) || imageUrls.length < CAROUSEL_MIN || imageUrls.length > CAROUSEL_MAX) {
    throw new Error(`IG_GRAPH_CAROUSEL_COUNT: カルーセル画像は ${CAROUSEL_MIN}-${CAROUSEL_MAX} 枚（検出 ${imageUrls?.length ?? 0} 枚）`);
  }
  return {
    children: imageUrls.map((image_url) => ({ image_url, is_carousel_item: true })),
    container: { media_type: 'CAROUSEL', caption: caption ?? '' },
  };
}

/** リール用ペイロード（純関数）。coverUrl は任意（Meta 自動選択に任せるなら省略）。 */
export function buildReelPayload({ videoUrl, caption, coverUrl }) {
  if (!videoUrl) throw new Error('IG_GRAPH_REEL_VIDEO_REQUIRED: videoUrl が必要です');
  const payload = { media_type: 'REELS', video_url: videoUrl, caption: caption ?? '' };
  if (coverUrl) payload.cover_url = coverUrl;
  return payload;
}

/** ストーリーズ用ペイロード（純関数）。image / video のどちらか一方のみ。 */
export function buildStoryPayload({ imageUrl, videoUrl }) {
  if (Boolean(imageUrl) === Boolean(videoUrl)) {
    throw new Error('IG_GRAPH_STORY_MEDIA: imageUrl か videoUrl のどちらか一方だけを指定してください');
  }
  return imageUrl
    ? { media_type: 'STORIES', image_url: imageUrl }
    : { media_type: 'STORIES', video_url: videoUrl };
}

const sleepDefault = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Graph API 用クライアントを作る。token は Authorization ヘッダにのみ載せる。
 * @param {{ token: string, igUserId: string, apiVersion?: string, base?: string, fetchImpl?: typeof fetch, sleep?: (ms:number)=>Promise<void> }} opts
 */
export function createIgPublisher({ token, igUserId, apiVersion = DEFAULT_API_VERSION, base = DEFAULT_BASE, fetchImpl, sleep = sleepDefault }) {
  if (!token) throw new Error('IG_GRAPH_TOKEN_REQUIRED: token が必要です');
  if (!igUserId) throw new Error('IG_GRAPH_USER_ID_REQUIRED: igUserId が必要です');
  const doFetch = fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== 'function') throw new Error('IG_GRAPH_FETCH_REQUIRED: fetchImpl（または global fetch）が必要です');

  function buildUrl(path, query = {}) {
    const url = new URL(`${base}/${apiVersion}${path}`);
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
    return url;
  }

  async function request(method, path, { query = {}, body } = {}) {
    const url = buildUrl(path, method === 'GET' ? query : {});
    const init = {
      method,
      headers: { Authorization: `Bearer ${token}` },
    };
    if (method !== 'GET') {
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries({ ...query, ...(body ?? {}) })) {
        if (v === undefined || v === null) continue;
        form.set(k, String(v));
      }
      init.body = form;
      init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    const res = await doFetch(url.toString(), init);
    const json = typeof res.json === 'function' ? await res.json() : res;
    if (json && json.error) {
      const kind = mapGraphError(json.error);
      throw new GraphApiError(`IG_GRAPH_API_ERROR[${kind}]: ${json.error.message ?? 'unknown error'}`, {
        code: json.error.code, kind, raw: json.error,
      });
    }
    return json;
  }

  async function waitReady(containerId, { maxPolls = DEFAULT_MAX_POLLS, intervalMs = DEFAULT_POLL_INTERVAL_MS } = {}) {
    for (let i = 0; i < maxPolls; i++) {
      const json = await request('GET', `/${containerId}`, { query: { fields: 'status_code' } });
      if (json.status_code === 'FINISHED') return json;
      if (json.status_code === 'ERROR') {
        throw new GraphApiError(`IG_GRAPH_MEDIA_ERROR: container ${containerId} status=ERROR`, { kind: 'MEDIA', raw: json });
      }
      await sleep(intervalMs);
    }
    throw new GraphApiError(`IG_GRAPH_MEDIA_TIMEOUT: container ${containerId} が ${maxPolls} 回のポーリングで FINISHED になりませんでした`, { kind: 'MEDIA' });
  }

  async function publish(creationId) {
    const json = await request('POST', `/${igUserId}/media_publish`, { body: { creation_id: creationId } });
    return { mediaId: json.id };
  }

  async function createCarousel({ imageUrls, caption }) {
    const { children, container } = buildCarouselPayloads({ imageUrls, caption });
    const childIds = [];
    for (const child of children) {
      const json = await request('POST', `/${igUserId}/media`, { body: child });
      childIds.push(json.id);
    }
    const containerJson = await request('POST', `/${igUserId}/media`, {
      body: { ...container, children: childIds.join(',') },
    });
    const containerId = containerJson.id;
    await waitReady(containerId);
    const { mediaId } = await publish(containerId);
    return { mediaId, containerId, children: childIds };
  }

  async function createReel({ videoUrl, caption, coverUrl }) {
    const payload = buildReelPayload({ videoUrl, caption, coverUrl });
    const containerJson = await request('POST', `/${igUserId}/media`, { body: payload });
    const containerId = containerJson.id;
    await waitReady(containerId);
    const { mediaId } = await publish(containerId);
    return { mediaId, containerId };
  }

  async function createStory({ imageUrl, videoUrl }) {
    const payload = buildStoryPayload({ imageUrl, videoUrl });
    const containerJson = await request('POST', `/${igUserId}/media`, { body: payload });
    const containerId = containerJson.id;
    await waitReady(containerId);
    const { mediaId } = await publish(containerId);
    return { mediaId, containerId };
  }

  async function getPermalink(mediaId) {
    const json = await request('GET', `/${mediaId}`, { query: { fields: 'permalink,shortcode' } });
    return { permalink: json.permalink, shortcode: json.shortcode };
  }

  return { createCarousel, createReel, createStory, getPermalink, waitReady };
}

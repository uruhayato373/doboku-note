/**
 * X 投稿済みの生存確認（DN-0276）。
 *
 * content/sns/x/{draft,published}/*\/status.json の status:"posted" を集め、
 * posted_url を持つものだけをログイン不要の公開 API
 * `https://publish.twitter.com/oembed?url=<url>` で照合する。存在すれば 200 + JSON、
 * 削除・凍結・非公開なら 404（HTML）が返る（2026-09-26 実機確認）。
 *
 * curl 経由（fetch は会社 PC のプロキシで全滅する。note-live-check.mjs と同じ理由）。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { siteLinkRegex } from './site-links.mjs';

const BASES = ['content/sns/x/draft', 'content/sns/x/published'];

/** 全 status.json から status:"posted" の tweet を集め、ref（"090-.../3"）を付ける。 */
export function collectPostedTweets(root = process.cwd()) {
  const out = [];
  for (const base of BASES) {
    const dir = join(root, base);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
      const statusPath = join(dir, entry.name, 'status.json');
      if (!existsSync(statusPath)) continue;
      let data;
      try {
        data = JSON.parse(readFileSync(statusPath, 'utf8'));
      } catch {
        continue;
      }
      if (!data.tweets || typeof data.tweets !== 'object') continue;
      for (const [key, tweet] of Object.entries(data.tweets)) {
        if (tweet.status !== 'posted') continue;
        out.push({ ...tweet, ref: `${base}/${entry.name}/${key}`, statusPath });
      }
    }
  }
  return out;
}

/** 本文にサイトへのリンク（doboku-note.com、旧 /docs 含む）があるか。 */
export function hasSiteLink(text) {
  return siteLinkRegex().test(String(text || ''));
}

/**
 * curl のレスポンス（body + 末尾に付けた http_code）を分類する。
 *   live    = 200 かつ oEmbed JSON（"url" キーを持つ）
 *   gone    = 404（削除・凍結・非公開の疑い）
 *   unknown = その他（レート制限・一時的な 5xx・プロキシ 000 等。取得失敗として扱う）
 */
export function classifyOembedResponse(httpCode, body) {
  if (httpCode === '200') {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.url === 'string') return 'live';
    } catch {
      /* JSON でなければ unknown へ */
    }
    return 'unknown';
  }
  if (httpCode === '404') return 'gone';
  return 'unknown';
}

/** curl で oEmbed を1回叩く（リダイレクト追従・--ssl-no-revoke）。 */
export function fetchOembed(url, { timeoutSec = 20 } = {}) {
  const r = spawnSync(
    'curl',
    [
      '-sS', '-L', '-m', String(timeoutSec), '--ssl-no-revoke',
      '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json',
      '-w', '\n%{http_code}',
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
    ],
    { encoding: 'utf-8', maxBuffer: 8 * 1024 * 1024 },
  );
  if (r.status !== 0 && !r.stdout) {
    return { status: 'unknown', httpCode: null, error: (r.stderr || '').trim().split('\n')[0] || `curl exit ${r.status}` };
  }
  const out = r.stdout || '';
  const nl = out.lastIndexOf('\n');
  const body = nl >= 0 ? out.slice(0, nl) : '';
  const httpCode = (nl >= 0 ? out.slice(nl + 1) : out).trim();
  return { status: classifyOembedResponse(httpCode, body), httpCode, error: null };
}

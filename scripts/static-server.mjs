#!/usr/bin/env node
/**
 * static-server.mjs — `npm run build` が出力した out/ を、本番に近い形でローカル配信する。
 *
 * これが要る理由は 2 つ。
 *
 * 1. **E2E を決定的にするため。** Playwright の webServer が `npm run dev` だと、初めて踏む
 *    ルートはリクエスト時にコンパイルされる。基準類の章記事 344 本を足した時点で、
 *    並列実行と重なって assertion のタイムアウトを超え、落ちるテストが毎回入れ替わる
 *    「実装は正しいのに赤」が常態化した。静的配信ならコンパイルが無く、実行時間も揺れない。
 * 2. **`_redirects` を効かせるため。** 旧 `/category/{slug}` と `/docs/{slug}` は Cloudflare Pages
 *    の `_redirects`（1,202 行）でしか存在せず、next.config に redirects() は無い。dev では
 *    必ず 404 になるので、旧 URL を含む検査が成立しない。
 *
 * 使い方: `npm run serve`（既定 3025。`PORT=xxxx npm run serve` で変更）
 * 事前に `npm run build` が要る。out/ が無ければ理由を明示して exit 1 にする（黙って空を配らない）。
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const ROOT = join(process.cwd(), 'out');
// dev サーバー（3020）とは別ポートにする。同じにすると Playwright の reuseExistingServer が
// 起動中の dev を黙って再利用してしまい、静的配信のつもりで dev を検査することになる。
const PORT = Number(process.env.PORT ?? 3025);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

/** `_redirects` を読み、完全一致とワイルドカード（`/docs/river/*`）に分けて持つ。 */
function loadRedirects() {
  const path = join(ROOT, '_redirects');
  if (!existsSync(path)) return { exact: new Map(), prefixes: [] };
  const exact = new Map();
  const prefixes = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [from, to, code] = trimmed.split(/\s+/);
    if (!from || !to) continue;
    const status = Number(code) || 301;
    if (from.endsWith('/*')) prefixes.push({ prefix: from.slice(0, -1), to, status });
    else exact.set(from, { to, status });
  }
  return { exact, prefixes };
}

function resolveRedirect(pathname, redirects) {
  const hit = redirects.exact.get(pathname);
  if (hit) return hit;
  for (const rule of redirects.prefixes) {
    if (pathname.startsWith(rule.prefix)) return { to: rule.to, status: rule.status };
  }
  return null;
}

/**
 * URL パスを out/ の実ファイルへ解決する。
 * Next の static export は `/exam/x` を `exam/x.html` に出しつつ、その下に
 * ネストしたルート用のディレクトリ `exam/x/` も作る。だから `.html` を先に見る。
 */
async function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidates =
    clean === '/' ? ['index.html'] : [`${clean}.html`, join(clean, 'index.html'), clean];
  for (const candidate of candidates) {
    const full = join(ROOT, candidate);
    // ルート外への脱出を許さない
    if (!full.startsWith(ROOT)) continue;
    try {
      const info = await stat(full);
      if (info.isFile()) return full;
    } catch {
      // 次の候補へ
    }
  }
  return null;
}

async function main() {
  if (!existsSync(ROOT)) {
    console.error('out/ がありません。先に `npm run build` を実行してください。');
    process.exitCode = 1;
    return;
  }
  const redirects = loadRedirects();

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    const redirect = resolveRedirect(pathname, redirects);
    if (redirect) {
      response.writeHead(redirect.status, { Location: redirect.to });
      response.end();
      return;
    }

    const file = await resolveFile(pathname);
    if (!file) {
      const notFound = join(ROOT, '404.html');
      const body = existsSync(notFound) ? await readFile(notFound) : Buffer.from('Not Found');
      response.writeHead(404, { 'Content-Type': MIME['.html'] });
      response.end(body);
      return;
    }

    const body = await readFile(file);
    response.writeHead(200, {
      'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(body);
  });

  server.listen(PORT, () => {
    console.log(
      `[serve] out/ を http://localhost:${PORT} で配信中（リダイレクト ${redirects.exact.size + redirects.prefixes.length} 件を適用）`,
    );
  });
}

main();

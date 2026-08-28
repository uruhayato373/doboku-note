import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { repoPath } from '@/lib/repo-root';
import { NOTE_CONTENT_ROOT, SITE_CONTENT_ROOT, SNS_CONTENT_ROOT } from '../../../../../../../scripts/lib/repository-paths.mjs';

/**
 * /media/{posts|sns|note|kindle|kindlepub}/... → リポジトリ内ルートへの static serve。
 * tools/admin/lib/media.mjs の traversal ガード + MIME allowlist を移植。
 * ローカル専用だが drive-by 読み出しを想定し許可ルート外は 403。
 */

export const dynamic = 'force-dynamic';

const MEDIA_ROOTS: Record<string, string> = {
  posts: resolve(SITE_CONTENT_ROOT),
  sns: resolve(SNS_CONTENT_ROOT),
  note: resolve(NOTE_CONTENT_ROOT),
  // Kindle 表紙（B-G系は kindle-dist、A系は kindle-published 直下）。/content/kindle の表紙サムネ用。
  kindle: resolve(repoPath('scripts', 'kindle-dist')),
  kindlepub: resolve(repoPath('scripts', 'kindle-published')),
};

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ root: string; path: string[] }> },
) {
  const { root, path: segs } = await params;
  const base = MEDIA_ROOTS[root];
  if (!base) return new Response('403 Forbidden', { status: 403 });

  const rel = segs.map((s) => decodeURIComponent(s)).join('/');
  const full = resolve(join(base, rel));
  // traversal ガード: 解決後パスが許可ルート配下であること。
  if (full !== base && !full.startsWith(base + sep)) {
    return new Response('403 Forbidden', { status: 403 });
  }
  const mime = MIME[extname(full).toLowerCase()];
  if (!mime) return new Response('403 Forbidden', { status: 403 });
  if (!existsSync(full) || !statSync(full).isFile()) {
    return new Response('404 Not Found', { status: 404 });
  }

  const nodeStream = createReadStream(full);
  const webStream = toWebStream(nodeStream);
  return new Response(webStream, {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(statSync(full).size),
      'Cache-Control': 'no-cache',
    },
  });
}

/** node Readable → Web ReadableStream。 */
function toWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

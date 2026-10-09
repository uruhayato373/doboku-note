import { createReadStream, existsSync, realpathSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { repoPath } from '@/lib/repo-root';
import { servePlan } from '../../../../../../../scripts/lib/media-serve.mjs';
import { loadDriveManifest, resolveVaultRoot, vaultAbsFor } from '../../../../../../../scripts/lib/drive-vault.mjs';
import { parseMediaPath } from '../../../../../../../scripts/lib/media-paths.mjs';
import { NOTE_CONTENT_ROOT, SITE_CONTENT_ROOT, SNS_CONTENT_ROOT } from '../../../../../../../scripts/lib/repository-paths.mjs';

/**
 * /media/{posts|sns|note|kindle|kindlepub|kindlepreview}/... → リポジトリ内ルートへの static serve。
 * tools/admin/lib/media.mjs の traversal ガード + MIME allowlist を移植。
 * cmedia（手元の素材）・vault（Drive の素材）は Range・HEAD に対応する（動画・音声のシーク用）。読み取り専用（GET・HEAD のみ）。
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
  // EPUB のページ画像（node scripts/render-kindle-preview.mjs の出力）。/content/kindle/<id> の目視確認用。
  kindlepreview: resolve(repoPath('.tmp', 'kindle-preview')),
  // ココナラの商品画像（承認済み POP 画像・Drive vault から取り戻したもの）。/content/ledger/coconala/<id> の確認用。
  coconala: resolve(repoPath('content', 'coconala', 'assets')),
  // コンテンツ台帳の素材（手元）。.tmp/media/{exam}/{work}/{channel}.{format}[.{variant}]/{role}.{sha8}.{ext}
  cmedia: resolve(repoPath('.tmp', 'media')),
};

/** Drive vault の素材（実体が手元に落ちているものだけ配信する）。マウント先は応答に出さない。 */
const VAULT_SUBDIR = '制作物/コンテンツ';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.m4a': 'audio/mp4',
  '.ass': 'text/plain; charset=utf-8',
  '.json': 'application/json',
};

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

function safeRealpath(p: string): string | null {
  try { return realpathSync(p); } catch { return null; }
}

async function serve(req: Request, params: Promise<{ root: string; path: string[] }>, withBody: boolean) {
  const { root, path: segs } = await params;

  let rel: string;
  try { rel = segs.map((s) => decodeURIComponent(s)).join('/'); } catch { return text('403 Forbidden', 403); }
  if (rel.split('/').some((s) => s === '..' || s === '.' || s === '')) return text('403 Forbidden', 403);

  let base: string | undefined;
  let expectedBytes: number | null = null;
  if (root === 'vault') {
    const parsed = parseMediaPath('.tmp/media/' + rel);
    if (!parsed) return text('403 Forbidden', 403);
    const vr = resolveVaultRoot();
    if (!vr.root) return text('404 Drive のマウントが無い', 404);
    const entry = loadDriveManifest().entries?.['.tmp/media/' + rel];
    if (!entry) return text('404 Not Found', 404);
    base = vaultAbsFor(vr.root, VAULT_SUBDIR);
    expectedBytes = Number(entry.bytes);
  } else {
    base = MEDIA_ROOTS[root];
  }
  if (!base) return text('403 Forbidden', 403);

  const baseReal = safeRealpath(base);
  if (!baseReal) return text('404 Not Found', 404);
  const joined = resolve(join(baseReal, rel));
  if (joined !== baseReal && !joined.startsWith(baseReal + sep)) return text('403 Forbidden', 403);
  const mime = MIME[extname(joined).toLowerCase()];
  if (!mime) return text('403 Forbidden', 403);
  if (!existsSync(joined)) return text('404 Not Found', 404);
  // シンボリックリンクで許可ルートの外へ出ていないか。
  const full = safeRealpath(joined);
  if (!full || (full !== baseReal && !full.startsWith(baseReal + sep))) return text('403 Forbidden', 403);
  const st = statSync(full);
  if (!st.isFile()) return text('404 Not Found', 404);
  const size = st.size;
  const plan = servePlan({ size, expectedBytes, rangeHeader: req.headers.get('range'), mime });
  if (plan.status === 409) return text(plan.body, 409);
  const { status, headers, start, end } = plan;
  if (status === 416) return new Response(null, { status, headers });

  if (!withBody || size === 0) return new Response(null, { status, headers });
  const nodeStream = createReadStream(full, { start, end });
  return new Response(Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>, { status, headers });
}

type Ctx = { params: Promise<{ root: string; path: string[] }> };

export async function GET(req: Request, { params }: Ctx) {
  return serve(req, params, true);
}

export async function HEAD(req: Request, { params }: Ctx) {
  return serve(req, params, false);
}

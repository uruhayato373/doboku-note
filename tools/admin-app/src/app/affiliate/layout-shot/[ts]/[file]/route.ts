import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { layoutShotsRoot } from '@/lib/affiliate-layout';

/** /affiliate/layout-shot/<ts>/<file>.png — 広告配置のスクリーンショット（data/affiliate/layout-shots/）の配信。読み取り専用・名前の形を限定する。 */
export const dynamic = 'force-dynamic';

const TS = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/;
const FILE = /^[a-z0-9-]+__[a-z]+__[A-Za-z0-9]+\.png$/;

export async function GET(_req: Request, { params }: { params: Promise<{ ts: string; file: string }> }) {
  const { ts, file } = await params;
  if (!TS.test(ts) || !FILE.test(file)) return new Response('403 Forbidden', { status: 403 });
  const path = join(layoutShotsRoot(), ts, file);
  if (!existsSync(path)) return new Response('404 Not Found', { status: 404 });
  return new Response(readFileSync(path), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
}

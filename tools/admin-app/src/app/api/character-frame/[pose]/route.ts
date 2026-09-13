import { findRepoRoot } from '@/lib/repo-root';
import { renderCharacterFrame } from '../../../../../../../scripts/lib/character-framing.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ pose: string }> }) {
  const { pose } = await params;
  const q = new URL(req.url).searchParams;
  const frame = q.get('frame') ?? 'full';
  const rawWidth = q.get('width') ?? '0';
  const preview = q.get('preview') === '1';
  if (!/^\d+$/.test(rawWidth) || Number(rawWidth) > 4096 || (preview && q.has('download'))) {
    return new Response('画像サイズまたは用途が不正です', { status: 400 });
  }
  try {
    const result = await renderCharacterFrame(findRepoRoot(), {
      pose, frame, width: preview ? Math.min(Number(rawWidth) || 360, 360) : Number(rawWidth), preview,
    });
    return new Response(new Uint8Array(result.buffer), { headers: {
      'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'X-Character-Resolution-Limited': String(result.limited),
      ...(q.get('download') === '1' ? { 'Content-Disposition': `attachment; filename="${result.filename}"` } : {}),
    } });
  } catch {
    return new Response('原画像・品質状態・切り取り設定を確認してください', { status: 400 });
  }
}

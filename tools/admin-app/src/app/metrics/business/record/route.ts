import { findRepoRoot } from '@/lib/repo-root';
import { assertLocalWrite, saveRecord, snapshot } from '../../../../../../../scripts/lib/business-direction.mjs';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    assertLocalWrite(request);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 32768) return Response.json({ error: '記録は32KB以内です' }, { status: 413 });
    const input = JSON.parse(raw), root = findRepoRoot();
    const result = input.operation === 'snapshot' ? snapshot(root, input.period) : saveRecord(root, input);
    return Response.json({ file: result.file }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '記録できませんでした' }, { status: 400 });
  }
}

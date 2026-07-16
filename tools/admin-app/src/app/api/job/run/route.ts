import { NextResponse } from 'next/server';
import { startJobStream, type JobMode, type JobParams } from '@/lib/jobs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * CSRF ガード（tools/admin/server.mjs の csrfOk を移植・ポート非依存）:
 *   - Origin は自ホスト（Host ヘッダ）と一致するか、無し（same-origin fetch）
 *   - ローカルホスト（127.0.0.1 / localhost）バインドのみ許可
 *   - カスタムヘッダ X-Admin: 1 必須（drive-by POST は付けられない）
 */
function csrfOk(req: Request): boolean {
  const host = req.headers.get('host') ?? '';
  const hostname = host.split(':')[0] ?? '';
  const isLocal = hostname === '127.0.0.1' || hostname === 'localhost';
  const origin = req.headers.get('origin');
  const okOrigin = !origin || origin === `http://${host}` || origin === `https://${host}`;
  const okHeader = req.headers.get('x-admin') === '1';
  return isLocal && okOrigin && okHeader;
}

export async function POST(req: Request) {
  if (!csrfOk(req)) {
    return NextResponse.json({ error: 'CSRF guard: Origin/X-Admin 不正' }, { status: 403 });
  }

  let body: { action?: string; mode?: JobMode; params?: JobParams };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (!body.action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 });
  }

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = startJobStream({ action: body.action, mode: body.mode ?? 'dry', params: body.params ?? {} });
  } catch (err) {
    const e = err as Error & { code?: string };
    const status = e.code === 'BUSY' ? 409 : 400;
    return NextResponse.json({ error: e.message }, { status });
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

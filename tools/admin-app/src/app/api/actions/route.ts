import { NextResponse } from 'next/server';
import { listActions } from '@/lib/jobs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ actions: listActions() });
}

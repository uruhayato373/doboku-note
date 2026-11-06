import { redirect } from 'next/navigation';

/** 販売状態へ統合した（2026-11-06）。旧 URL の転送 */
export default async function KindleRedirect({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  redirect(tab ? `/product/status?ch=kindle&tab=${encodeURIComponent(tab)}` : '/product/status?ch=kindle');
}

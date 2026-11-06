import { redirect } from 'next/navigation';

/** 販売状態へ統合した（2026-11-06）。旧 URL の転送 */
export default function MagazinesRedirect() {
  redirect('/product/status?ch=note&tab=magazines');
}

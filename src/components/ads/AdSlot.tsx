'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ADSENSE_CLIENT, ADSENSE_SLOTS, type AdSenseSlot } from '@/config/adsense';

/**
 * AdSense の手動の枠。高さを先に取ってレイアウトのずれ（CLS）を防ぎ、配信が無い枠（data-ad-status="unfilled"）は globals.css が畳む。
 * 枠の push はページごとに 1 回（クライアント遷移でパスが変わったら ins を作り直す＝key）。
 */
export default function AdSlot({ slot, className = '' }: { slot: AdSenseSlot; className?: string }) {
  const pathname = usePathname();
  return <AdUnit key={pathname} slot={slot} className={className} />;
}

function AdUnit({ slot, className }: { slot: AdSenseSlot; className: string }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // 広告ブロッカーなどで push が失敗しても本文は壊さない
    }
  }, []);
  const multiplex = slot === 'endMultiplex';
  return (
    <aside data-adsense={slot} data-pagefind-ignore aria-label="広告" className={`not-prose adsense-slot ${className}`}>
      <p className="mb-1 text-center text-[11px] text-ink-muted">広告</p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: multiplex ? 320 : slot === 'rail' ? 250 : 280 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOTS[slot]}
        {...(multiplex ? { 'data-ad-format': 'autorelaxed' } : { 'data-ad-format': 'auto', 'data-full-width-responsive': 'true' })}
      />
    </aside>
  );
}

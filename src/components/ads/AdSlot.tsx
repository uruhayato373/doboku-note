'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ADSENSE_CLIENT, ADSENSE_SLOTS, ADSENSE_UNIT_NAMES, isAdSensePreviewHost, type AdSenseSlot } from '@/config/adsense';

/**
 * AdSense の手動の枠。上に「広告」の文字は付けない（ほかの導線と同じく、表記は広告の中の AdChoices に任せる）。高さを先に取ってレイアウトのずれ（CLS）を防ぎ、配信が無い枠（data-ad-status="unfilled"）は globals.css が畳む。
 * 枠の push はページごとに 1 回（クライアント遷移でパスが変わったら ins を作り直す＝key）。
 * 見えていない枠（スマホで隠れる右の欄）は push しない（幅 0 で要求すると AdSense がエラーを出す）。
 * 手元・プレビュー（localhost・pages.dev）では広告を要求せず、破線の枠にユニット名を出して置き場を見せる（撮影の目視でも位置がわかる）。
 */
export default function AdSlot({ slot, className = '' }: { slot: AdSenseSlot; className?: string }) {
  const pathname = usePathname();
  return <AdUnit key={pathname} slot={slot} className={className} />;
}

function AdUnit({ slot, className }: { slot: AdSenseSlot; className: string }) {
  const pushed = useRef(false);
  const ref = useRef<HTMLElement>(null);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    // 手元の目印は描画後に切り替える（SSR の HTML は本番と同じに保つ）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAdSensePreviewHost(location.hostname)) { setPreview(true); return; }
    if (!ref.current || ref.current.offsetWidth === 0) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // 広告ブロッカーなどで push が失敗しても本文は壊さない
    }
  }, []);
  const multiplex = slot === 'endMultiplex';
  return (
    <aside ref={ref} data-adsense={slot} data-adsense-preview={preview || undefined} data-cta-stack data-pagefind-ignore aria-label="広告" className={`not-prose adsense-slot relative ${className}`}>
      {preview && <span className="adsense-preview-label">AdSense {ADSENSE_UNIT_NAMES[slot]}（{ADSENSE_SLOTS[slot]}）</span>}
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: slot === 'inArticle' ? 'center' : undefined, minHeight: multiplex ? 320 : slot === 'rail' ? 250 : 280 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOTS[slot]}
        {...(multiplex ? { 'data-ad-format': 'autorelaxed' }
          // 本文の途中は記事内広告（本文になじむネイティブ形式）。高さは配信で変わるので下限だけ取る
          : slot === 'inArticle' ? { 'data-ad-layout': 'in-article', 'data-ad-format': 'fluid' }
          : { 'data-ad-format': 'auto', 'data-full-width-responsive': 'true' })}
      />
    </aside>
  );
}

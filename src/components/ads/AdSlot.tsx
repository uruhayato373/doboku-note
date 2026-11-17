'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ADSENSE_CLIENT, ADSENSE_LAYOUT_KEYS, ADSENSE_SLOTS, ADSENSE_UNIT_NAMES, isAdSensePreviewHost, type AdSenseSlot } from '@/config/adsense';

/**
 * AdSense の手動の枠。上に「広告」の文字は付けない（ほかの導線と同じく、表記は広告の中の AdChoices に任せる）。高さを先に取ってレイアウトのずれ（CLS）を防ぎ、配信が無い枠（data-ad-status="unfilled"）は globals.css が畳む。
 * 枠の push はページごとに 1 回（クライアント遷移でパスが変わったら ins を作り直す＝key）。
 * 見えていない枠（スマホで隠れる右の欄）は push しない（幅 0 で要求すると AdSense がエラーを出す）。
 * 手元・プレビュー（localhost・pages.dev）では広告を要求せず、破線の枠にユニット名を出して置き場を見せる（撮影の目視でも位置がわかる）。
 */
export default function AdSlot({ slot, className = '', as = 'aside' }: { slot: AdSenseSlot; className?: string; as?: 'aside' | 'li' | 'div' }) {
  const pathname = usePathname();
  return <AdUnit key={pathname} slot={slot} className={className} as={as} />;
}

/** 枠の高さの下限（配信で変わる形式は下限だけ取って CLS を抑える） */
const MIN_HEIGHT: Record<AdSenseSlot, number> = { endMultiplex: 320, rail: 250, inArticle: 280, inFeedThumb: 120, inFeedText: 90 };

/** push から広告の要求（ins の中の iframe）が出るまでの待ち。出ないまま data-ad-status も付かない枠は、AdSense が要求を出さなかった枠 */
const REQUEST_WAIT_MS = 8000;

/**
 * AdSense が要求を出さなかった枠を畳む（DN-1228）。push しても要求が出ない枠は、AdSense が ins の高さだけ取って
 * data-ad-status を付けないので、globals.css の unfilled の規則では畳めず空白が残る（2026-11-17 の本番で記事内の枠が 391px の空白）。
 * 画面に入っている間に畳むと本文がずれる（CLS）ので、画面の外にあるときに畳む。
 */
function collapseIfNeverRequested(el: HTMLElement | null) {
  if (!el) return undefined;
  let observer: IntersectionObserver | undefined;
  const timer = window.setTimeout(() => {
    const ins = el.querySelector('ins.adsbygoogle');
    if (!ins || ins.querySelector('iframe') || ins.getAttribute('data-ad-status')) return;
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) return;
      el.setAttribute('data-ad-empty', '');
      observer?.disconnect();
    });
    observer.observe(el);
  }, REQUEST_WAIT_MS);
  return () => { window.clearTimeout(timer); observer?.disconnect(); };
}

function AdUnit({ slot, className, as }: { slot: AdSenseSlot; className: string; as: 'aside' | 'li' | 'div' }) {
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
    return collapseIfNeverRequested(ref.current);
  }, []);
  const layoutKey = ADSENSE_LAYOUT_KEYS[slot];
  const body = <>
    {preview && <span className="adsense-preview-label">AdSense {ADSENSE_UNIT_NAMES[slot]}（{ADSENSE_SLOTS[slot]}）</span>}
    <ins
      className="adsbygoogle"
      style={{ display: 'block', textAlign: slot === 'inArticle' ? 'center' : undefined, minHeight: MIN_HEIGHT[slot] }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={ADSENSE_SLOTS[slot]}
      {...(slot === 'endMultiplex' ? {
          'data-ad-format': 'autorelaxed',
          // スマホは既定で縦 1 列に積まれ約 1,600px になり、記事末の回遊を押し出した（DN-1229）。値は「スマホ,PC」の順
          'data-matched-content-ui-type': 'image_sidebyside,image_stacked',
          'data-matched-content-rows-num': '4,2',
          'data-matched-content-columns-num': '1,4',
        }
        // 本文の途中は記事内広告（本文になじむネイティブ形式）。高さは配信で変わるので下限だけ取る
        : slot === 'inArticle' ? { 'data-ad-layout': 'in-article', 'data-ad-format': 'fluid' }
        // 一覧の 1 項目はインフィード広告（レイアウトキーは AdSense の管理画面のコード）
        : layoutKey ? { 'data-ad-format': 'fluid', 'data-ad-layout-key': layoutKey }
        : { 'data-ad-format': 'auto', 'data-full-width-responsive': 'true' })}
    />
  </>;
  // 一覧の中（インフィード）は li（ul の一覧）か div（grid の一覧）で 1 項目として置き、導線の幅の規則（data-cta-stack）の外にする
  if (as === 'div') {
    return <div ref={ref as React.Ref<HTMLDivElement>} data-adsense={slot} data-adsense-preview={preview || undefined} data-pagefind-ignore aria-label="広告" className={`not-prose adsense-slot relative ${className}`}>{body}</div>;
  }
  if (as === 'li') {
    return <li ref={ref as React.Ref<HTMLLIElement>} data-adsense={slot} data-adsense-preview={preview || undefined} data-pagefind-ignore aria-label="広告" className={`not-prose adsense-slot relative ${className}`}>{body}</li>;
  }
  return <aside ref={ref} data-adsense={slot} data-adsense-preview={preview || undefined} data-cta-stack data-pagefind-ignore aria-label="広告" className={`not-prose adsense-slot relative ${className}`}>{body}</aside>;
}

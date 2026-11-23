'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import AdSlot, { MIN_HEIGHT, TALL_MIN_HEIGHT } from '@/components/ads/AdSlot';

/**
 * 右の欄の最後の追従ブロック（PC ≥993px・記事・基準書の章と節・資格トップ）。上の束と下に続く組が流れ切ったあと、
 * 画面の上端に残って「現在地の目次」と「AdSense の rail 1 枠」を見せる（2026-11-23 運営者判断）。
 * 目次は呼び出し側が渡す（記事・基準書の `TableOfContents` の compact。汎用部品から機能別の部品を import しないため）。
 *
 * - 追従は欄の最後の 1 ブロックだけ。sticky の下に要素を置くと届かなくなる（2026-07 頃の記事の右欄の事故）ので、下には何も置かない。
 *   欄内スクロールは使わない（design-system.md）。
 * - ブロックが画面の高さに収まらないときは追従させない（下側が画面の外に出て届かなくなるのを防ぐ）。
 * - 広告の形は画面の高さで決める（目次の下に 300×600 が収まれば縦長、収まらなければ 300×250）。形を決めてから描くので push は 1 回。
 * - AdSense の追従の決まり（幅 300px 以下・縦にだけ動く・本文や他の広告に重ならない・追従する広告は 1 つ・PC のみ）に合わせる。
 *   自動広告のサイドレールは管理画面で切る（追従する広告が 2 つになる）。
 */
/** 追従するときの画面の上端からの距離（top-4） */
const TOP_PX = 16;
const GAP_PX = 24;
const TALL_AD_PX = TALL_MIN_HEIGHT;
const AD_PX = MIN_HEIGHT.rail;

export default function RailFollow({ toc = null }: {
  /** 現在地の目次（`<TableOfContents compact />`）。無ければ広告だけ */
  readonly toc?: ReactNode;
}) {
  const tocRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ tall: boolean; sticky: boolean } | null>(null);
  const hasToc = Boolean(toc);
  useEffect(() => {
    const measure = () => {
      const tocHeight = tocRef.current?.offsetHeight ?? 0;
      const room = window.innerHeight - TOP_PX * 2 - (tocHeight ? tocHeight + GAP_PX : 0);
      // 形は最初の 1 回だけ決める（push 済みの枠は作り直さない）。追従するかは画面の高さが変わるたびに決め直す
      setLayout((prev) => {
        const tall = prev ? prev.tall : room >= TALL_AD_PX;
        return { tall, sticky: room >= (tall ? TALL_AD_PX : AD_PX) };
      });
    };
    measure();
    // 目次は現在地に合わせて項目が入れ替わり高さが変わるので、そのたびに追従するかを決め直す
    const observer = new ResizeObserver(measure);
    if (tocRef.current) observer.observe(tocRef.current);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  return (
    <div className="flex-1 pt-6" data-rail-follow data-rail-kind="follow">
      <div className={layout?.sticky ? 'sticky top-4' : undefined}>
        {hasToc && (
          <div ref={tocRef}>{toc}</div>
        )}
        {/* 形を決めるまでは高さだけ取る（右の欄の最後なので本文はずれない） */}
        <div className={hasToc ? 'mt-6' : undefined} style={layout ? undefined : { minHeight: AD_PX }}>
          {layout && <AdSlot slot="rail" tall={layout.tall} as="div" />}
        </div>
      </div>
    </div>
  );
}

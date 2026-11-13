'use client';

import { useEffect, useRef, useState } from 'react';

/** OGP原本と同じ場所の表示用WebP。未供給時は原本へ戻し、リンクの利用を妨げない。 */
export default function ContentThumbnail({ src, sizes = '(max-width: 640px) 124px, 168px', eager = false, band }: {
  src: string; sizes?: string; eager?: boolean; band?: { text: string; color: string } | null | undefined;
}) {
  const [fallback, setFallback] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // SSR画像がハイドレーションより先に失敗した場合も原本へ戻す。
    let active = true;
    if (image.current?.complete && image.current.naturalWidth === 0) {
      image.current.decode().catch(() => { if (active) setFallback(true); });
    }
    return () => { active = false; };
  }, [src]);
  const derivative = (width: number) => src.replace(/ogp\.png$/, `ogp-thumb-${width}.webp`);
  const supported = src.endsWith('/ogp.png') && !fallback;
  const picture = <img
    ref={image}
    src={supported ? derivative(336) : src}
    srcSet={supported ? [248, 336, 640].map(w => `${derivative(w)} ${w}w`).join(', ') : undefined}
    sizes={sizes} alt="" width={1200} height={630}
    loading={eager ? 'eager' : 'lazy'} decoding="async"
    onError={() => { if (!fallback) setFallback(true); }}
    className={band ? 'h-full w-full object-cover dark:brightness-90' : 'h-full w-full object-cover'}
  />;
  if (!band) return picture;
  // 写真は OGP と同じ 1.91:1 をそのまま敷き、下端に帯を重ねる（2026-11-13）。帯の高さは枠の約 15%（config の spec.bandOverlapRatio）。
  // 写真の指示は「下端の約 15% に主題を置かない」。帯の色は資格の色（白文字のコントラスト比 4.5 以上を CI が確かめる）
  return <div className="relative h-full w-full [container-type:inline-size]">
    {picture}
    <span className="absolute inset-x-0 bottom-0 flex items-center truncate px-[5cqw] font-bold text-white" style={{ backgroundColor: band.color, height: 'max(15%, 16px)', fontSize: 'clamp(10px, 5.6cqw, 18px)' }}>{band.text}</span>
  </div>;
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface CardRailProps {
  /** レールに並べるカード群（各子要素が .card-rail > * のスナップ対象になる）。 */
  readonly children: React.ReactNode;
  /** スクリーンリーダー向けのレール全体の説明（例: "キャリア記事"）。 */
  readonly ariaLabel?: string | undefined;
}

/** 矢印アイコン（細線シェブロン・path の真実源は DisclosureChevron.tsx）。 */
function ArrowIcon({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      // Tailwind の transform 系は本 build で信頼できないためインライン style で反転
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

/**
 * 横スクロール カードレールの共通コンポーネント（全カテゴリ・全セクション再利用可）。
 *
 * - 見た目は globals.css の `.card-rail`（scroll-snap・次カード覗き・右端フェード）
 * - デスクトップ（sm 以上）のみ、レール左右端に浮き矢印をオーバーレイ
 *   （クリックで 1 画面ぶんスクロール・端に達した側は自動非表示・全カードが収まる幅なら両方非表示）
 * - モバイルは矢印を出さずスワイプのみ（タッチでは使われず場所も無い）
 * - スクロール量は clientWidth ぶん。smooth はブラウザ既定（prefers-reduced-motion 尊重は
 *   scroll-behavior を書かないことで OS 設定に委ねる）
 *
 * 使用例: <CardRail ariaLabel="キャリア記事">{docs.map(d => <DocCard … />)}</CardRail>
 */
export default function CardRail({ children, ariaLabel }: CardRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true); // 初期 true = SSR/非スクロール時は矢印を出さない

  const update = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setAtStart(rail.scrollLeft <= 2);
    setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    update();
    rail.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(rail);
    return () => {
      rail.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [update]);

  const scrollByPage = (dir: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: dir * rail.clientWidth, behavior: 'smooth' });
  };

  const arrowClass =
    'absolute z-[2] hidden h-9 w-9 items-center justify-center border border-[var(--rule-soft)] bg-[var(--paper)] text-[var(--ink-muted)] shadow-[0_1px_6px_rgba(0,0,0,0.10)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-ring sm:inline-flex';
  // 縦センタリングは inline style（Tailwind の translate 系は本 build で信頼できない）
  const arrowPos = { top: '50%', transform: 'translateY(-50%)' } as const;

  return (
    <div className="relative" role="group" aria-label={ariaLabel}>
      {!atStart && (
        <button
          type="button"
          aria-label="前のカードへ"
          onClick={() => scrollByPage(-1)}
          className={`${arrowClass} -left-3`}
          style={arrowPos}
        >
          <ArrowIcon mirrored />
        </button>
      )}
      {!atEnd && (
        <button
          type="button"
          aria-label="次のカードへ"
          onClick={() => scrollByPage(1)}
          className={`${arrowClass} -right-2`}
          style={arrowPos}
        >
          <ArrowIcon />
        </button>
      )}
      <div ref={railRef} className="card-rail">
        {children}
      </div>
    </div>
  );
}

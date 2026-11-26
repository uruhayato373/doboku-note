'use client';

import { useRef, type ReactNode } from 'react';

/**
 * 本文の図を押すと、画面いっぱいの重ね窓（<dialog>）で元の大きさまで拡大して見せる（2026-11-26）。
 * 図は文字が本文と同じくらいになる幅に抑えて出す（ArticleImage・src/config/figure-display-width.json）ので、
 * 細かい所は押して読む。閉じるのは「閉じる」・Esc・重ね窓の外を押す。
 */
export default function ZoomableFigure({ src, alt, children }: { src: string; alt: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={`図を拡大する: ${alt}`}
        className="focus-ring group relative block w-full cursor-zoom-in"
      >
        {children}
        <span
          aria-hidden="true"
          className="absolute right-1.5 bottom-1.5 rounded-card-inline bg-(--paper)/90 px-1.5 py-0.5 text-[11px] text-(--ink-muted) opacity-80 group-hover:opacity-100"
        >
          拡大
        </span>
      </button>
      <dialog
        ref={dialog}
        aria-label={alt}
        onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}
        className="m-auto max-h-[95vh] max-w-[95vw] overflow-auto rounded-card-section border border-(--rule-soft) bg-(--paper) p-3 backdrop:bg-black/60 dark:border-(--rule-soft)"
      >
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="focus-ring min-h-11 rounded-card-inline border border-(--rule-soft) px-3 text-[13px] text-(--ink) dark:border-(--rule-soft)"
          >
            閉じる
          </button>
        </div>
        {/* 元の大きさで出す（画面より大きければ重ね窓の中をスクロール） */}
        <img src={src} alt={alt} className="block h-auto max-w-none" loading="lazy" decoding="async" />
      </dialog>
    </>
  );
}

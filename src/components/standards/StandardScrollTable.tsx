'use client';

import { useEffect, useId, useRef, useState, type ComponentProps } from 'react';

/**
 * 章・節ページの表（原本と照合して組み直した規格表）。横にはみ出すときだけ、スクロール領域を
 * キーボードで操作できるようにし（tabIndex）、操作案内を出す。StandardVerbatimTable（版面の表）と同じ考え方。
 * はみ出す領域にキーボードで届かないと axe の scrollable-region-focusable（serious）に当たる。
 * 案内の行は常に描いて高さを確保し、見せるかどうかだけを切り替える（2026-11 の RUM で基準書の章の CLS が不合格）。
 */
export default function StandardScrollTable(props: ComponentProps<'table'>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const measure = () => setOverflow(wrapper.scrollWidth > wrapper.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* 案内の行は最初から置いて高さを確保し、はみ出すときだけ見せる（表示後に差し込むと表から下が押し下がり CLS になる） */}
      <p
        id={hintId}
        className={`standard-scroll-table-hint mb-1 text-[12px] text-(--ink-muted) ${overflow ? '' : 'invisible'}`}
        aria-hidden={overflow ? undefined : true}
      >
        <span aria-hidden="true">↔</span> 左右にスクロールして表を読む
      </p>
      <div
        ref={wrapperRef}
        className="table-scroll standard-scroll-table focus-ring"
        tabIndex={overflow ? 0 : undefined}
        role={overflow ? 'region' : undefined}
        aria-label={overflow ? '表' : undefined}
        aria-describedby={overflow ? hintId : undefined}
      >
        <table {...props} />
      </div>
    </>
  );
}

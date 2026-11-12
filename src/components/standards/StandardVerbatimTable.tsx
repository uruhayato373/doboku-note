'use client';

import { useEffect, useId, useRef, useState, type ComponentProps } from 'react';

/** 原本の空白・改行を保った表。帯は常に描き（CLS を出さない）、はみ出す場合だけ操作案内の文言にする。 */
export default function StandardVerbatimTable(props: ComponentProps<'pre'>) {
  const preRef = useRef<HTMLPreElement>(null);
  const hintId = useId();
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;
    const measure = () => setOverflow(pre.scrollWidth > pre.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pre);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="standard-verbatim-table not-prose my-6 overflow-hidden rounded-card-content border border-(--rule-soft) bg-(--paper) dark:border-(--rule)">
      {/* 見出しの帯は最初から置いて高さを確保し、文言だけを切り替える（表示後に差し込むと下が押し下がり CLS になる） */}
      <div id={hintId} className="flex items-center gap-2 border-b border-(--rule-soft) bg-(--accent-fill) px-4 py-2 text-[13px] text-(--ink-body) dark:border-(--rule)">
        {overflow ? (
          <>
            <span aria-hidden="true">↔</span> 左右にスクロールして表を読む
          </>
        ) : (
          '原典の表（空白・改行は原本のまま）'
        )}
      </div>
      <pre
        {...props}
        ref={preRef}
        tabIndex={overflow ? 0 : props.tabIndex}
        aria-label="原典の表・一覧"
        aria-describedby={overflow ? hintId : undefined}
        className={`standard-verbatim focus-ring ${props.className ?? ''}`}
      />
    </div>
  );
}

'use client';

import { useEffect, useId, useRef, useState, type ComponentProps } from 'react';

/** 原本の空白・改行を保った表。はみ出す場合だけ操作案内を表示する。 */
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
      {overflow && (
        <div id={hintId} className="flex items-center gap-2 border-b border-(--rule-soft) bg-(--accent-fill) px-4 py-2 text-[13px] text-(--ink-body) dark:border-(--rule)">
          <span aria-hidden="true">↔</span> 左右にスクロールして表を読む
        </div>
      )}
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

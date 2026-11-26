'use client';

import { useEffect, useRef, useState } from 'react';
import { QuestionChipList, QuestionNextLinkRow, type QuestionChipItem, type QuestionNextLinks } from './QuestionChips';

/**
 * 年度別過去問の上端の追従バー（PC・スマホ共通・2026-11-26）。冒頭の目次（#question-jump）が画面の上へ外れたら、
 * 本文の列の幅で画面の上端に「いまの問題／全何問」と「番号を選ぶ」を出し、押すと群と番号・前後の年度・演習アプリが開く。
 *
 * - 記事の枠は overflow:hidden なので position:sticky は効かない。fixed にして、幅と左端は本文の列（[data-question-column]）に合わせる。
 * - 右の欄と広告には触れない（右の欄の追従は欄の最後の 1 ブロックだけで、過去問では回遊と広告の組が流れ切るまで出てこないため）。
 * - いまの問題は、見出しが画面の上端から OFFSET_PX より上にある最後の問題。
 */
const OFFSET_PX = 160;

export default function QuestionStickyBar({ items, links }: { items: readonly QuestionChipItem[]; links: QuestionNextLinks }) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    const anchor = document.getElementById('question-jump');
    const column = anchor?.closest('[data-question-column]') as HTMLElement | null;
    const measureBox = () => {
      if (!column) return;
      const r = column.getBoundingClientRect();
      setBox({ left: r.left, width: r.width });
    };
    const update = () => {
      frame.current = 0;
      // 冒頭の目次が画面の上へ外れたら出す（下にあるうち・目次が見えているうちは出さない）
      setVisible(anchor ? anchor.getBoundingClientRect().bottom < 0 : false);
      let index = 0;
      for (let i = 0; i < items.length; i++) {
        const el = document.getElementById(items[i]!.id);
        if (el && el.getBoundingClientRect().top <= OFFSET_PX) index = i;
        else if (el) break;
      }
      setCurrentIndex(index);
    };
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(update);
    };
    const onResize = () => { measureBox(); onScroll(); };
    measureBox();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [items]);

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  if (!visible || !box) return null;
  const current = items[currentIndex];
  const close = () => setOpen(false);
  return (
    <div
      className="fixed top-2 z-40"
      style={{ left: box.left, width: box.width }}
      data-cta="nav"
      data-cta-label="question-bar"
    >
      <div className="rounded-card-section border border-(--rule-soft) bg-(--paper) shadow-card-hover dark:border-(--rule-soft)">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="question-bar-panel"
          onClick={() => setOpen((v) => !v)}
          className="focus-ring flex min-h-11 w-full items-center justify-between gap-3 px-4 text-left"
        >
          <span className="text-[14px] text-(--ink)">
            問 <span className="font-mono font-bold tabular-nums">{current?.label}</span>
            <span className="ml-2 text-[12px] text-(--ink-muted)">{currentIndex + 1} / {items.length}</span>
          </span>
          <span className="text-[13px] font-bold text-(--accent)">
            番号を選ぶ <span aria-hidden="true">{open ? '▴' : '▾'}</span>
          </span>
        </button>
        {open && (
          <div id="question-bar-panel" className="max-h-[70vh] space-y-3 overflow-y-auto border-t border-(--rule-soft) px-4 py-3 dark:border-(--rule-soft)">
            <QuestionChipList items={items} currentId={current?.id} onPick={close} />
            <QuestionNextLinkRow {...links} onPick={close} labelPrefix="question-bar" />
          </div>
        )}
      </div>
    </div>
  );
}

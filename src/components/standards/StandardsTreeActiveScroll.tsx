'use client';

import { useEffect } from 'react';

/**
 * 右の目次（sticky で中だけスクロールする欄）を、表示中の項目が見える位置まで送る。
 * scrollIntoView はページ全体も動かすので使わず、欄の scrollTop だけを動かす。
 */
export default function StandardsTreeActiveScroll() {
  useEffect(() => {
    const container = document.querySelector<HTMLElement>('[data-standards-sidebar]');
    const active = container?.querySelector<HTMLElement>('[data-standards-nav="tree"] [aria-current="page"]');
    if (!container || !active) return;
    const offset = active.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.scrollTop += offset - container.clientHeight / 3;
  }, []);
  return null;
}

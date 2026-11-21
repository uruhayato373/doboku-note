'use client';

import { useEffect, useState, type RefObject } from 'react';

/** 要素が横にはみ出しているか（ResizeObserver で追う）。基準書の表（StandardScrollTable・StandardVerbatimTable）が共用する */
export function useHorizontalOverflow(ref: RefObject<HTMLElement | null>): boolean {
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflow(el.scrollWidth > el.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return overflow;
}

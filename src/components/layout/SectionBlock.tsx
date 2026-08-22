/**
 * セクション帯の共通ラッパー。
 *
 * 各ページで手書きしていた
 *   <section className="…py-…"><div className="max-w-* mx-auto px-4 sm:px-6 lg:px-10">…</div></section>
 * を集約し、外枠幅・上下余白・帯背景・区切り罫線を統一する。
 *
 * - 外側要素が全幅の背景/罫線/左右padding を持ち、内側 div が max-w + mx-auto で中央寄せ。
 * - `band`    : 上部ヘッダー帯（paper 背景 + 下罫線）。
 * - `divider` : セクション境界の上罫線/下罫線。
 */

import type { ReactNode } from 'react';

type SectionWidth = 'wide' | '860' | '780' | '760';
type SectionSpace = 'sm' | 'md' | 'lg';

interface SectionBlockProps {
  as?: 'section' | 'div';
  /** 内側コンテナの最大幅。既定 'wide'（1280） */
  width?: SectionWidth;
  /** 上下 padding プリセット。既定 'md' */
  space?: SectionSpace;
  /** ヘッダー帯（paper 背景 + 下罫線） */
  band?: boolean;
  /** セクション境界の罫線 */
  divider?: 'top' | 'bottom' | 'none';
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}

const WIDTHS: Record<SectionWidth, string> = {
  wide: 'max-w-[1280px]',
  '860': 'max-w-[860px]',
  '780': 'max-w-[780px]',
  '760': 'max-w-[760px]',
};

const SPACES: Record<SectionSpace, string> = {
  sm: 'py-8 sm:py-10',
  md: 'py-10 sm:py-12',
  lg: 'py-12 sm:py-16',
};

export default function SectionBlock({
  as = 'section',
  width = 'wide',
  space = 'md',
  band = false,
  divider = 'none',
  ariaLabel,
  className = '',
  children,
}: SectionBlockProps) {
  const dividerClass =
    divider === 'top'
      ? 'border-t border-[var(--rule-soft)]'
      : divider === 'bottom'
        ? 'border-b border-[var(--rule-soft)]'
        : '';

  const outerClass = [
    band ? 'bg-[var(--paper)] border-b border-[var(--rule-soft)]' : '',
    dividerClass,
    SPACES[space],
    'px-4 sm:px-6 lg:px-10',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <div className={`${WIDTHS[width]} mx-auto`}>{children}</div>
  );

  if (as === 'div') {
    return (
      <div className={outerClass} aria-label={ariaLabel}>
        {inner}
      </div>
    );
  }
  return (
    <section className={outerClass} aria-label={ariaLabel}>
      {inner}
    </section>
  );
}

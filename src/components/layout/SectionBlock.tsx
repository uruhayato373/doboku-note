/**
 * セクション帯の共通ラッパー。
 *
 * 各ページで手書きしていた
 *   <section className="…py-…"><div className="max-w-* mx-auto px-4 sm:px-6 lg:px-10">…</div></section>
 * を集約し、外枠幅・上下余白・帯背景・区切り罫線を統一する。
 *
 * - 外側要素が全幅の背景/罫線を持ち、内側 div が max-w + mx-auto で中央寄せ。
 * - 左右の余白は、幅 'wide' と '760' では内側（WIDE_CONTAINER・READING_CONTAINER。ツールの本体など同じ定数を使う部品と中身の端が揃う）、
 *   読み幅（860 / 780）では外側に付ける（読み幅そのものを中身の幅にする）。
 * - `band`    : 上部ヘッダー帯（paper 背景 + 下罫線）。
 * - `divider` : セクション境界の上罫線/下罫線。
 */

import type { ReactNode } from 'react';
import { READING_CONTAINER, WIDE_CONTAINER } from './container';

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
  wide: WIDE_CONTAINER,
  '860': 'mx-auto max-w-[860px]',
  '780': 'mx-auto max-w-[780px]',
  '760': READING_CONTAINER,
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
      ? 'border-t border-(--rule-soft)'
      : divider === 'bottom'
        ? 'border-b border-(--rule-soft)'
        : '';

  const outerClass = [
    band ? 'bg-(--paper) border-b border-(--rule-soft)' : '',
    dividerClass,
    SPACES[space],
    width === 'wide' || width === '760' ? '' : 'px-4 sm:px-6 lg:px-10',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <div className={WIDTHS[width]}>{children}</div>
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

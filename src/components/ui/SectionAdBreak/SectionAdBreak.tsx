import type { ReactNode } from 'react';

/**
 * 区画と区画の間の導線（資格トップの本文の一覧の切れ目）。スマホで呼び出し側が渡した転職バナーを出す。
 * AdSense は手動で置かず、自動広告のページ内広告に任せる（2026-11-23 運営者判断。以前は PC で記事内広告を 1 枠ずつ置いていた）。
 */
export default function SectionAdBreak({ mobile = null }: {
  /** スマホで出す転職バナーなど */
  readonly mobile?: ReactNode;
}) {
  if (!mobile) return null;
  return <div data-section-ad-break className="my-10 zenn-desktop:hidden">{mobile}</div>;
}

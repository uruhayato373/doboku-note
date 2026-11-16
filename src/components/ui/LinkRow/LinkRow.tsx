import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * 区切り線の文字の行（1 行 1 リンク）。右の欄の文字の一覧・関係する基準資料・無料ツール・分野から復習などが使う。
 * 一覧の枠は LinkRowList（ul・区切り線）。行は高さ 44px 以上（押しやすさ）・題名は 2 行まで。
 */
type LinkRowProps = {
  readonly href: string;
  readonly title: ReactNode;
  /** 題名の上の小さな見出し（発行機関・テーマなど） */
  readonly eyebrow?: ReactNode;
  /** 右端に → を出す（ほかのページへ移る行き先が少ない一覧） */
  readonly arrow?: boolean;
  /** 計測の属性（data-cta-label など）。そのままリンクへ付ける */
  readonly data?: Readonly<Record<`data-${string}`, string>>;
};

export function LinkRowList({ children, className = '' }: { readonly children: ReactNode; readonly className?: string }) {
  return <ul className={`divide-y divide-(--rule-soft) ${className}`}>{children}</ul>;
}

export default function LinkRow({ href, title, eyebrow, arrow = false, data }: LinkRowProps) {
  return (
    <li>
      <Link href={href} {...data} className="focus-ring flex min-h-11 items-center justify-between gap-3 py-2 text-sm text-(--accent) hover:underline">
        <span className="min-w-0">
          {eyebrow && <span className="block text-[11px] font-bold text-(--ink-muted)">{eyebrow}</span>}
          <span className="line-clamp-2">{title}</span>
        </span>
        {arrow && <span aria-hidden="true">→</span>}
      </Link>
    </li>
  );
}

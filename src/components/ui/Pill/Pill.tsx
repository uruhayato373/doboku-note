import type { ReactNode } from 'react';

/**
 * 小さなラベル（タグ・資格名・種別・状態）。2026-11-17 に、手書きの小さなピル約 25 か所・変種 15 通り以上を 3 つの型にまとめた。
 * accent: 薄い accent の地に accent の文字（資格名・種別）
 * tag: accent の地の丸い「#タグ」
 * outline: 罫線だけの中立のラベル（版・件数）
 * 既存の専用の部品（MagazineBadge・AffiliatePrBadge・RankMarker）はそのまま使う。
 */
const VARIANT = {
  accent: 'rounded-card-inline bg-(--accent-fill) px-2 py-0.5 text-(--accent)',
  tag: 'rounded-full bg-(--accent-fill) px-2.5 py-0.5 font-mono text-(--accent)',
  outline: 'rounded-card-inline border border-(--rule-soft) px-2 py-0.5 text-(--ink-body) dark:border-(--rule-soft)',
} as const;

const SIZE = {
  xs: 'text-[10px]',
  sm: 'text-[11px]',
  md: 'text-xs',
} as const;

export default function Pill({ children, variant = 'accent', size = 'sm', className = '' }: {
  readonly children: ReactNode;
  readonly variant?: keyof typeof VARIANT;
  readonly size?: keyof typeof SIZE;
  readonly className?: string;
}) {
  return <span className={`inline-flex items-center ${VARIANT[variant]} ${SIZE[size]} ${className}`}>{children}</span>;
}

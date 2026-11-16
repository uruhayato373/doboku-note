import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * 区切り線の文字の行（1 行 1 リンク）。項目の多い一覧（右の欄の文字の一覧・資格トップのカリキュラム・人気の順位・基準書の文書と章・テーマの記事の行）が使う。
 * 一覧の枠は LinkRowList（ul・区切り線）。行は高さ 44px 以上（押しやすさ）・題名は 2 行まで。2026-11-17 に手書きの行 約 12 か所をここへまとめた。
 */
type LinkRowProps = {
  readonly href: string;
  readonly title: ReactNode;
  /** 題名の上の小さな見出し（発行機関・テーマ・記事の種類など） */
  readonly eyebrow?: ReactNode | undefined;
  /** 題名の下の説明（2 行まで） */
  readonly description?: ReactNode | undefined;
  /** 左の目印（順位・連番） */
  readonly marker?: ReactNode | undefined;
  /** 右端の補足（件数など）。arrow と一緒に出せる */
  readonly meta?: ReactNode | undefined;
  /** 右端に → を出す（ほかのページへ移る行き先が少ない一覧） */
  readonly arrow?: boolean;
  /** 題名の色。accent: 右の欄など小さな一覧／ink: 本文の幅の一覧（ホバーで accent） */
  readonly tone?: 'accent' | 'ink';
  /** 題名を明朝にする（人気の順位） */
  readonly serif?: boolean;
  /** 題名の段（一覧ページの見出しの並びに合わせる） */
  readonly headingLevel?: 'h3' | 'h4' | 'h5';
  /** li に付ける属性（絞り込みで隠す hidden など） */
  readonly hidden?: boolean;
  /** 計測の属性（data-cta-label など）。そのままリンクへ付ける */
  readonly data?: Readonly<Record<`data-${string}`, string>>;
};

export function LinkRowList({ children, className = '', as: List = 'ul', data }: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly as?: 'ul' | 'ol';
  readonly data?: Readonly<Record<`data-${string}`, string>>;
}) {
  return <List {...data} className={`divide-y divide-(--rule-soft) ${className}`}>{children}</List>;
}

/** 順位の数字の目印（人気の一覧） */
export function RankMarker({ rank }: { readonly rank: number }) {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-card-inline bg-(--accent-fill) font-mono text-xs font-bold tabular-nums text-(--accent)">
      {rank}
    </span>
  );
}

export default function LinkRow({ href, title, eyebrow, description, marker, meta, arrow = false, tone = 'accent', serif = false, headingLevel, hidden, data }: LinkRowProps) {
  const Title = headingLevel ?? 'span';
  const color = tone === 'ink' ? 'text-(--ink) group-hover:text-(--accent)' : 'text-(--accent) group-hover:underline';
  return (
    <li hidden={hidden}>
      <Link href={href} {...data} className="focus-ring group flex min-h-11 items-center gap-3 py-2 text-sm transition-colors">
        {marker}
        <div className="min-w-0 flex-1">
          {eyebrow && <span className="block text-[11px] font-bold text-(--ink-muted)">{eyebrow}</span>}
          <Title className={`line-clamp-2 block font-medium ${color}${serif ? ' font-serif' : ''}`}>{title}</Title>
          {description && <span className="mt-0.5 line-clamp-2 block text-[13px] text-(--ink-muted)">{description}</span>}
        </div>
        {meta && <span className="shrink-0 text-xs text-(--ink-muted)">{meta}</span>}
        {arrow && <span aria-hidden="true" className="shrink-0 text-(--accent)">→</span>}
      </Link>
    </li>
  );
}

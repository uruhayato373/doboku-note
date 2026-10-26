import type { DetailsHTMLAttributes, ReactNode } from 'react';
import DisclosureChevron from '@/components/ui/DisclosureChevron';

type DisclosureProps = Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'children'> & {
  /** 見出し行の左側（題名）。h タグを入れてもよい */
  summary: ReactNode;
  /** 見出し行の右側、矢印の手前（件数など） */
  meta?: ReactNode;
  children: ReactNode;
  /**
   * card = 枠と紙色の背景つき・開くと枠が accent（TableOfContents のモバイル目次・CurriculumSections の章）。
   * plain = 枠なし（カードの中に置く開閉・QuestionJumpNav）。
   */
  variant?: 'card' | 'plain';
  summaryClassName?: string | undefined;
};

const DETAILS_CLASS = {
  card: 'group rounded-card-content border border-(--rule-soft) bg-(--paper) transition-colors open:border-(--accent) dark:border-(--rule-soft)',
  plain: 'group',
} as const;

const SUMMARY_CLASS = {
  card: 'focus-ring disclosure-summary min-h-11 rounded-card-content px-4 py-3',
  plain: 'focus-ring disclosure-summary min-h-11',
} as const;

/**
 * サイトの開閉（native <details>）の単一実装。JS を使わない（閉じていても中身は DOM に残り、内部リンクとして読まれる）。
 * 見出し行のマーカー消しは globals.css の disclosure-summary、矢印は DisclosureChevron（閉=右・開=下）。
 * 見出し行は 44px 以上・フォーカスリングつき。
 */
export default function Disclosure({
  summary,
  meta,
  children,
  variant = 'card',
  className,
  summaryClassName,
  ...rest
}: DisclosureProps) {
  return (
    <details {...rest} className={[DETAILS_CLASS[variant], className].filter(Boolean).join(' ')}>
      <summary className={[SUMMARY_CLASS[variant], summaryClassName].filter(Boolean).join(' ')}>
        <span className="min-w-0 flex-1">{summary}</span>
        {meta !== undefined && <span className="shrink-0">{meta}</span>}
        <DisclosureChevron className="h-4 w-4 text-(--ink-muted)" />
      </summary>
      {children}
    </details>
  );
}

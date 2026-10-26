import type { DetailsHTMLAttributes, ReactNode } from 'react';
import DisclosureChevron from '@/components/ui/DisclosureChevron';

type DisclosureProps = Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'children'> & {
  /** 見出し行の題名。h タグを入れてもよい */
  summary: ReactNode;
  /** 見出し行の右側、矢印の手前（件数など） */
  meta?: ReactNode;
  children: ReactNode;
  /**
   * card = 枠と紙色の背景つき・開くと枠が accent。
   * plain = 枠なし（カードの中に置く開閉。罫線が要るときは className で足す）。
   */
  variant?: 'card' | 'plain';
  /** card の角。隣の部品に合わせる（content＝既定・section＝大きいカード・inline＝入力欄の高さの小さな部品・none＝角あり） */
  radius?: 'content' | 'section' | 'inline' | 'none';
  /** 矢印の位置。start は題名が複数行になる一覧（FAQ）向けで、見出し行を上でそろえる */
  chevron?: 'end' | 'start';
  summaryClassName?: string | undefined;
};

// tailwind-merge はサイト独自の rounded-card-* をまとめないので、角と余白は className の上書きでなく radius で決める。
const RADIUS = {
  content: { details: 'rounded-card-content', summary: 'rounded-card-content px-4 py-3' },
  section: { details: 'rounded-card-section', summary: 'rounded-card-section px-4 py-3' },
  inline: { details: 'rounded-card-inline', summary: 'rounded-card-inline px-3 py-2' },
  none: { details: '', summary: 'px-4 py-3' },
} as const;

const CARD = 'border border-(--rule-soft) bg-(--paper) transition-colors open:border-(--accent) dark:border-(--rule-soft)';

/**
 * サイトの開閉（native <details>）の単一実装。JS を使わない（閉じていても中身は DOM に残り、内部リンクとして読まれる）。
 * 見出し行のマーカー消しは globals.css の disclosure-summary、矢印は DisclosureChevron（閉=右・開=下）。
 * 見出し行は 44px 以上・フォーカスリングつき。中身の余白は呼び出し側が持つ。
 */
export default function Disclosure({
  summary,
  meta,
  children,
  variant = 'card',
  radius = 'content',
  chevron = 'end',
  className,
  summaryClassName,
  ...rest
}: DisclosureProps) {
  const shape = variant === 'card' ? RADIUS[radius] : undefined;
  const icon = <DisclosureChevron className={`h-4 w-4 text-(--ink-muted)${chevron === 'start' ? ' mt-1' : ''}`} />;
  return (
    <details {...rest} className={['group', variant === 'card' ? `${CARD} ${shape?.details}` : '', className].filter(Boolean).join(' ')}>
      <summary
        className={[
          'focus-ring disclosure-summary min-h-11',
          chevron === 'start' ? 'items-start' : 'items-center',
          shape?.summary,
          summaryClassName,
        ].filter(Boolean).join(' ')}
      >
        {chevron === 'start' && icon}
        <span className="min-w-0 flex-1">{summary}</span>
        {meta !== undefined && <span className="shrink-0">{meta}</span>}
        {chevron === 'end' && icon}
      </summary>
      {children}
    </details>
  );
}

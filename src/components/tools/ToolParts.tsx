import type { CSSProperties, ReactNode } from 'react';
import { READING_CONTAINER } from '@/components/layout/container';
import { EYEBROW } from '@/components/ui/Eyebrow/Eyebrow';

/**
 * 無料ツール（src/app/tools/*）の部品。2026-11-17 に、8〜12 本のツールが一字一句同じクラスの定数（inputBase・labelBase・
 * 「数値の根拠」の箱・入力と結果の枠）をそれぞれ持っていたのをまとめた。tests/tool-parts-ratchet.test.mjs が複製の再発を止める。
 * client の部品からも server の部品からも使える（state を持たない）。
 */

/** 入力欄・select・textarea の見た目。<input className={TOOL_INPUT}> のように使う */
export const TOOL_INPUT = 'focus-ring w-full rounded-card-content border border-(--rule-soft) bg-(--bg) px-3 py-2 text-[15px] text-(--ink) focus:border-(--accent)';

/** 小見出しのラベル（入力欄の上・結果の上） */
export const TOOL_LABEL = EYEBROW.label;

/** ツールの本体の外枠（読みやすい幅＋上下の余白） */
export function ToolLayout({ children }: { readonly children: ReactNode }) {
  return <div className={`${READING_CONTAINER} py-8 sm:py-10`}>{children}</div>;
}

/** 入力・結果の枠。2 枚目からは spaced で上に余白 */
export function ToolPanel({ children, spaced = false, className = '' }: { readonly children: ReactNode; readonly spaced?: boolean; readonly className?: string }) {
  return <div className={`card-surface-section p-5 sm:p-6${spaced ? ' mt-4' : ''} ${className}`}>{children}</div>;
}

/** 入力欄 1 つ（ラベル＋入力＋補足）。入力は children に TOOL_INPUT で渡す */
export function ToolField({ id, label, note, children, className = '' }: {
  readonly id: string;
  readonly label: ReactNode;
  /** 入力欄の下の補足・警告 */
  readonly note?: ReactNode | undefined;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={`${TOOL_LABEL} mb-2`}>{label}</label>
      {children}
      {note}
    </div>
  );
}

const VALUE_SIZE = {
  sm: 'text-[22px]',
  md: 'text-[24px]',
  lg: 'text-[24px] sm:text-[28px] leading-tight',
  xl: 'text-[28px]',
} as const;

/** 結果の大きな数字（ラベル＋値）。tone で色（判定の色など）を差し替える */
export function ToolResultValue({ label, children, size = 'lg', toneClass = 'text-(--ink)', className = '' }: {
  readonly label?: ReactNode;
  readonly children: ReactNode;
  readonly size?: keyof typeof VALUE_SIZE;
  /** 値の色のクラス（判定の色など） */
  readonly toneClass?: string;
  readonly className?: string;
}) {
  return (
    <div className={className}>
      {label && <div className={TOOL_LABEL}>{label}</div>}
      <div className={`font-serif font-black ${VALUE_SIZE[size]} ${label ? 'mt-1 ' : ''}${toneClass} tabular-nums`}>{children}</div>
    </div>
  );
}

/** 判定のピル（「目安超過」「OK」など）。色は toneClass か style で渡す */
export function ToolStatus({ children, toneClass = 'border border-(--rule) text-(--ink-body)', style }: {
  readonly children: ReactNode;
  readonly toneClass?: string;
  readonly style?: CSSProperties | undefined;
}) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${toneClass}`} style={style}>{children}</span>;
}

/** 警告の左罫線の箱。tone で色、borderClass で任意の色（判定の区分の色） */
export function ToolNotice({ children, tone = 'warn', borderClass, className = '' }: {
  readonly children: ReactNode;
  readonly tone?: 'warn' | 'danger';
  readonly borderClass?: string;
  readonly className?: string;
}) {
  const border = borderClass ?? (tone === 'danger' ? 'border-(--color-danger)' : 'border-(--color-warn)');
  return <div className={`rounded-card-content border-l-4 ${border} bg-(--bg) p-3 text-sm leading-6 text-(--ink-body) ${className}`}>{children}</div>;
}

/** 「数値の根拠」の箱（題名＋箇条書き）。children は <li> を並べる */
export function ToolSources({ title = '数値の根拠', children }: { readonly title?: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="mt-6 rounded-card-content border border-(--rule-soft) bg-(--bg) p-5 text-sm leading-7 text-(--ink-body)">
      <p className="mb-2 font-bold text-(--ink)">{title}</p>
      <ul className="list-disc space-y-1 pl-5">{children}</ul>
    </div>
  );
}

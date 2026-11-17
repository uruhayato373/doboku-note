import type { ReactNode } from 'react';

/**
 * 小見出しのラベル（入力欄・結果・区画の上の小さな文字）。2026-11-17 に、同じ役割のクラスの並びが約 65 行・15 通りに分かれていたのを 3 つの型にまとめた。
 * label: 11px・太字・大文字・字間（ツールのラベル・カードの英字の見出し）
 * mono: 等幅 10px・大文字・広い字間（ヘッダー・フッター・記事のメタ）
 * plain: 11px・太字（和文の小見出し）
 */
export const EYEBROW = {
  label: 'block text-[11px] font-bold uppercase tracking-wider text-(--ink-muted)',
  mono: 'font-mono text-[10px] uppercase tracking-widest text-(--ink-muted)',
  plain: 'block text-[11px] font-bold text-(--ink-muted)',
} as const;

/** 色の型（既定は muted。本文の色・accent・brand は強調したい所だけ） */
const TONE = {
  muted: 'text-(--ink-muted)',
  body: 'text-(--ink-body)',
  accent: 'text-(--accent)',
  brand: 'text-brand',
} as const;

/** 色を替えたラベルのクラス（className の文字列の中で使う所向け） */
export function eyebrowClass(variant: keyof typeof EYEBROW = 'label', tone: keyof typeof TONE = 'muted'): string {
  return tone === 'muted' ? EYEBROW[variant] : EYEBROW[variant].replace(TONE.muted, TONE[tone]);
}

export default function Eyebrow({ children, variant = 'label', tone = 'muted', as: Tag = 'span', className = '' }: {
  readonly children: ReactNode;
  readonly variant?: keyof typeof EYEBROW;
  readonly tone?: keyof typeof TONE;
  readonly as?: 'span' | 'p' | 'div';
  readonly className?: string;
}) {
  return <Tag className={`${eyebrowClass(variant, tone)} ${className}`}>{children}</Tag>;
}

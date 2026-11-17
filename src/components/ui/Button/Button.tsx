import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';

/**
 * ボタンとボタン形のリンク。2026-11-17 に、主ボタンだけで角丸 5 通り・余白 3 通りに分かれていた約 30 か所を 4 つの型にまとめた。
 * primary: accent の地（1 画面に 1 つの主な行動）／secondary: 罫線／soft: 薄い accent の地／text: 文字だけ（「もっと見る」）
 * 商品の導線（note・アフィリエイト）は CTA の部品が持つので、ここでは扱わない。
 */
const VARIANT = {
  primary: 'bg-(--accent) text-(--paper) hover:opacity-90',
  secondary: 'border border-(--rule-soft) text-(--ink-body) hover:border-(--accent) hover:text-(--accent) dark:border-(--rule-soft)',
  soft: 'border border-(--accent) bg-(--accent-fill) text-(--accent) hover:opacity-90',
  text: 'text-(--accent) underline-offset-2 hover:underline',
} as const;

const SIZE = {
  sm: 'min-h-11 px-3.5 py-2 text-sm',
  md: 'min-h-11 px-5 py-2.5 text-[15px]',
} as const;

type Variant = keyof typeof VARIANT;

const classOf = (variant: Variant, size: keyof typeof SIZE, block: boolean, className: string) =>
  `focus-ring inline-flex items-center justify-center gap-2 rounded-card-inline font-bold transition-[opacity,color,border-color] ${variant === 'text' ? 'min-h-11 text-sm' : SIZE[size]} ${VARIANT[variant]}${block ? ' w-full' : ''} ${className}`;

interface CommonProps {
  readonly variant?: Variant;
  readonly size?: keyof typeof SIZE;
  /** 横幅いっぱい */
  readonly block?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

/** リンクのボタン。外部 URL は新しいタブで開く。download を付けるとファイルを保存させる。計測の属性は data で渡す */
export function ButtonLink({ href, variant = 'primary', size = 'sm', block = false, className = '', data, download = false, children }: CommonProps & {
  readonly href: string;
  readonly data?: Readonly<Record<`data-${string}`, string>>;
  readonly download?: boolean;
}) {
  const cls = classOf(variant, size, block, className);
  if (download) return <a href={href} download {...data} className={cls}>{children}</a>;
  if (/^https?:\/\//.test(href)) return <a href={href} target="_blank" rel="noopener noreferrer" {...data} className={cls}>{children}</a>;
  return <Link href={href} {...data} className={cls}>{children}</Link>;
}

/** button 要素のボタン */
export default function Button({ variant = 'primary', size = 'sm', block = false, className = '', children, type = 'button', ...rest }: CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>) {
  return <button type={type} {...rest} className={classOf(variant, size, block, className)}>{children}</button>;
}

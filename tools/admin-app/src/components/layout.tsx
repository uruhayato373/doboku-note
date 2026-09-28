import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * 並べ方の部品。部品（Card など）は外側の余白を持たず、間隔はここの gap だけが決める。
 * 旧来の `.card + .card`（直後がカードのときだけ margin）は、間に別の箱が入ると 0 になった（PR #684）。
 */

const GAP = { sm: 'gap-2', md: 'gap-3', lg: 'gap-6' } as const;
type Gap = keyof typeof GAP;

/** 縦に積む。 */
export function Stack({ gap = 'md', className, ...props }: ComponentProps<'div'> & { gap?: Gap }) {
  return <div className={cn('flex flex-col', GAP[gap], className)} {...props} />;
}

/**
 * 幅に合わせて列数が変わる格子。min は 1 列の最小幅（この幅を下回ると列が減る）。
 * 例: <Grid min="sm">（150px）＝小さい数値タイル、<Grid min="lg">（320px）＝グラフ入りカード。
 */
const MIN = {
  sm: 'grid-cols-[repeat(auto-fit,minmax(150px,1fr))]',
  md: 'grid-cols-[repeat(auto-fit,minmax(260px,1fr))]',
  lg: 'grid-cols-[repeat(auto-fit,minmax(320px,1fr))]',
} as const;

export function Grid({
  min = 'md',
  gap = 'md',
  className,
  ...props
}: ComponentProps<'div'> & { min?: keyof typeof MIN; gap?: Gap }) {
  return <div className={cn('grid', MIN[min], GAP[gap], className)} {...props} />;
}

/** 見出しつきのまとまり。見出しと中身の間隔もここで持つ。note は中身の下に出す注記。 */
export function Section({
  title,
  note,
  children,
  className,
}: {
  title: ReactNode;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <h2 className="m-0 text-sm font-semibold">{title}</h2>
      {children}
      {note ? <p className="m-0 text-xs text-muted-foreground">{note}</p> : null}
    </section>
  );
}

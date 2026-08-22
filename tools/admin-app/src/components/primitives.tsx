import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** shadcn/ui の Card API に揃えた、管理画面専用の軽量プリミティブ。 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground shadow-card',
        className,
      )}
      {...props}
    />
  );
}

type BadgeVariant =
  'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  outline: 'border-border bg-transparent text-foreground',
  success:
    'border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning:
    'border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-300',
  destructive: 'border-transparent bg-destructive/10 text-destructive',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5',
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

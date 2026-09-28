import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/**
 * shadcn/ui の Progress と同じ見た目の横棒（サーバー描画で足りるので Radix を使わない）。
 * value は 0〜100。超えた分は 100 で止める。indicatorClassName で棒の色を変える。
 */
export function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: ComponentProps<'div'> & { value: number; indicatorClassName?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn('h-full bg-primary transition-[width]', indicatorClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

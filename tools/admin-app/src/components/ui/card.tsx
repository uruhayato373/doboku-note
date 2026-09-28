import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/**
 * shadcn/ui の Card。外側の余白（margin）は持たない。並べたときの間隔は親（Stack / Grid）の gap が決める。
 * 旧来の `className="card"`（globals.css の .card と `.card + .card` の margin）とは別物。
 */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('flex flex-col gap-4 rounded-lg border border-border bg-card py-4 text-card-foreground shadow-card', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('grid auto-rows-min items-start gap-1 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto]', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-title" className={cn('text-sm leading-none font-semibold', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-description" className={cn('text-xs text-muted-foreground', className)} {...props} />;
}

export function CardAction({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('flex items-center px-4', className)} {...props} />;
}

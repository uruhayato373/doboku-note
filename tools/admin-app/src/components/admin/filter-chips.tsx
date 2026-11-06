import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** 絞り込み・タブの並び。URL で切り替えるので、中身は FilterChip（リンク）を並べる */
export function FilterBar({ className, children }: { className?: string; children: ReactNode }) {
  return <nav className={cn('filterbar', className)}>{children}</nav>;
}

/** 絞り込みの 1 つ。active で今の選択を示す */
export function FilterChip({ active = false, className, ...props }: ComponentProps<typeof Link> & { active?: boolean }) {
  return <Link {...props} className={cn('chip', active && 'active', className)} />;
}

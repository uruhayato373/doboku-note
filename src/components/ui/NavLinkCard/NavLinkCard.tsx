import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

interface NavLinkCardProps {
  href: string;
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  description?: string | undefined;
  compact?: boolean;
  truncate?: boolean;
  className?: string;
}

/** 本文内リンクカード共通の構造と操作表現。用途固有の文言・アイコンだけを呼び出し側から渡す。 */
export default function NavLinkCard({
  href,
  eyebrow,
  title,
  icon: Icon,
  description,
  compact = false,
  truncate = false,
  className,
}: NavLinkCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'card-surface-content card-interactive not-prose group flex gap-3 hover:border-brand',
        compact ? 'my-4 items-center px-4 py-3' : 'my-5 items-start px-4 py-3.5',
        className,
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-brand text-white',
          compact ? 'h-6 w-6' : 'mt-0.5 h-7 w-7',
        )}
        aria-hidden
      >
        <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </span>

      <div className={cn('min-w-0 flex-1', compact && 'leading-tight')}>
        <div className="text-[11px] font-bold uppercase tracking-wider text-brand">
          {eyebrow}
        </div>
        <div
          className={cn(
            'mt-0.5 font-bold text-ink-strong group-hover:underline',
            compact ? 'text-[14px]' : 'text-[15px]',
            truncate && 'truncate',
          )}
        >
          {title}
        </div>
        {description && <div className="mt-1 text-sm leading-6 text-ink-body">{description}</div>}
      </div>

      <ArrowRight
        className={cn(
          'h-4 w-4 shrink-0 text-ink-muted transition-colors group-hover:text-brand',
          !compact && 'mt-1',
        )}
        aria-hidden
      />
    </Link>
  );
}

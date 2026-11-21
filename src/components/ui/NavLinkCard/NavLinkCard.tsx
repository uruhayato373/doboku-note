import { eyebrowClass } from '@/components/ui/Eyebrow/Eyebrow';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface NavLinkCardProps {
  href: string;
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  description?: string | undefined;
  /**
   * 回遊クリック計測（AnalyticsProvider の data-cta="nav" → internal_nav_click）。
   * 渡したときだけ付く。label が GA4 の event_label、placement が cta_placement になる。
   */
  cta?: { label: string; placement: string } | undefined;
}

/** 本文内リンクカード共通の構造と操作表現。用途固有の文言・アイコンだけを呼び出し側から渡す。 */
export default function NavLinkCard({
  href,
  eyebrow,
  title,
  icon: Icon,
  description,
  cta,
}: NavLinkCardProps) {
  return (
    <Link
      href={href}
      {...(cta ? { 'data-cta': 'nav', 'data-cta-label': cta.label, 'data-cta-placement': cta.placement } : {})}
      className="card-surface-content card-interactive not-prose group flex gap-3 hover:border-brand my-5 items-start px-4 py-3.5"
    >
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-brand text-white mt-0.5 h-7 w-7"
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className={eyebrowClass('label', 'brand')}>
          {eyebrow}
        </div>
        <div className="mt-0.5 font-bold text-ink-strong group-hover:underline text-[15px]">
          {title}
        </div>
        {description && <div className="mt-1 text-sm leading-6 text-ink-body">{description}</div>}
      </div>

      <ArrowRight
        className="h-4 w-4 shrink-0 text-ink-muted transition-colors group-hover:text-brand mt-1"
        aria-hidden
      />
    </Link>
  );
}

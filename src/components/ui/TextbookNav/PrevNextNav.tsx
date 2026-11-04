import Link from 'next/link';
import { getPublicDocPath } from '@/lib/content-routes';
import MetaCard from '@/components/ui/MetaCard/MetaCard';

interface NavItem {
  readonly slug: string;
  readonly title: string;
}

interface PrevNextNavProps {
  readonly heading: string;
  readonly track: string;
  readonly prev: NavItem | null;
  readonly next: NavItem | null;
  readonly prevLabel: string;
  readonly nextLabel: string;
}

/** 順序のあるページ（教科書の章・過去問の年度）の前後ナビ */
export default function PrevNextNav({ heading, track, prev, next, prevLabel, nextLabel }: PrevNextNavProps) {
  if (!prev && !next) return null;

  return (
    <MetaCard trackNav={track}>
      <h2 className="text-lg font-bold text-(--ink) mb-4">{heading}</h2>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {prev ? (
          <Link
            href={getPublicDocPath(prev.slug)}
            className="block rounded-card-content border border-(--rule-soft) p-4 transition-colors hover:border-(--accent)"
          >
            <div className="text-xs text-(--ink-muted) mb-1">← {prevLabel}</div>
            <div className="text-sm font-semibold text-(--accent)">{prev.title}</div>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={getPublicDocPath(next.slug)}
            className="block rounded-card-content border border-(--rule-soft) p-4 text-right transition-colors hover:border-(--accent)"
          >
            <div className="text-xs text-(--ink-muted) mb-1">{nextLabel} →</div>
            <div className="text-sm font-semibold text-(--accent)">{next.title}</div>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </MetaCard>
  );
}

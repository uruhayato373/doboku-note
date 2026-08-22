'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import MetaCard from '@/components/ui/MetaCard/MetaCard';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TocGroup {
  heading: TocItem;
  children: TocItem[];
}

interface TableOfContentsProps {
  headings: TocItem[];
  variant?: 'sidebar' | 'mobile';
}

export default function TableOfContents({ headings, variant = 'sidebar' }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible.length > 0) {
        setActiveId(visible[0]!.target.id);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: '-80px 0px -80% 0px',
    });

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];

    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [headings]);

  // Build nested groups: H2 → group, H3/H4 → children of last group
  const groups = useMemo<TocGroup[]>(() => {
    const result: TocGroup[] = [];
    for (const h of headings) {
      if (h.level === 2) {
        result.push({ heading: h, children: [] });
      } else {
        if (result.length === 0) {
          // Orphan H3/H4 before any H2: promote to top-level
          result.push({ heading: h, children: [] });
        } else {
          result[result.length - 1]!.children.push(h);
        }
      }
    }
    return result;
  }, [headings]);

  if (headings.length === 0) return null;

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    }
  };

  const tocList = (
    <ol className="ol-depth-1">
      {groups.map((group) => (
        <li
          key={group.heading.id}
          className={activeId === group.heading.id ? 'active' : undefined}
        >
          <a
            href={`#${group.heading.id}`}
            onClick={(e) => handleClick(e, group.heading.id)}
            className={activeId === group.heading.id ? 'active' : undefined}
          >
            {group.heading.text}
          </a>
          {variant === 'sidebar' && group.children.length > 0 && (
            <ol className="ol-depth-2">
              {group.children.map((child) => (
                <li
                  key={child.id}
                  className={activeId === child.id ? 'active' : undefined}
                >
                  <a
                    href={`#${child.id}`}
                    onClick={(e) => handleClick(e, child.id)}
                    className={activeId === child.id ? 'active' : undefined}
                  >
                    {child.text}
                  </a>
                </li>
              ))}
            </ol>
          )}
        </li>
      ))}
    </ol>
  );

  if (variant === 'mobile') {
    return (
      <details
        className="group rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)] open:border-[var(--accent)] transition-colors"
        data-cta="nav"
        data-cta-label="mobile-article-toc"
      >
        <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-card-content px-4 py-3 marker:hidden">
          <span className="min-w-0 flex-1 font-serif text-[16px] font-bold text-[var(--ink)]">
            このページの内容
          </span>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
            {groups.length}項目
          </span>
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 text-[var(--ink-muted)] transition-transform group-open:rotate-180"
          />
        </summary>
        <nav
          aria-label="このページの目次"
          className="toc-content toc-content-mobile max-h-[55vh] overflow-y-auto border-t border-[var(--rule-soft)] px-4 py-3"
        >
          {tocList}
        </nav>
      </details>
    );
  }

  return (
    <MetaCard as="div" padding="none" className="toc-scroll p-5 pb-6">
      <div className="toc-title">目次</div>
      <nav className="toc-content">
        {tocList}
      </nav>
    </MetaCard>
  );
}

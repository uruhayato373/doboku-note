'use client';

import { useEffect, useMemo, useState } from 'react';
import Disclosure from '@/components/ui/Disclosure/Disclosure';
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
  /**
   * 右の欄の追従ブロック（RailFollow）用。画面の高さを超えないよう、現在の H2 の前後 COMPACT_AROUND 項目と、
   * 現在の H2 の下の見出しを現在地の周り COMPACT_CHILDREN 項目だけ出す（欄内スクロールは使わない・design-system.md）。
   */
  compact?: boolean;
}

/** 見出しがこの位置（画面の上端からの px）より上に来たら現在地にする */
const ACTIVE_LINE_PX = 96;
const COMPACT_AROUND = 2;
const COMPACT_CHILDREN = 5;

/** start から count 項目の窓を、center が入るように length の中で取る */
function windowAround(length: number, center: number, count: number): [number, number] {
  const start = Math.min(Math.max(0, center - Math.floor(count / 2)), Math.max(0, length - count));
  return [start, start + count];
}

export default function TableOfContents({ headings, variant = 'sidebar', compact = false }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  // 現在地＝画面の上端（ACTIVE_LINE_PX）より上にある最後の見出し。目次のリンク・ページ内リンクで一気に飛んでも外れないよう、
  // 見出しが帯を横切るのを待つ（IntersectionObserver）のではなく、スクロールのたびに位置で決める（1 フレームに 1 回）
  useEffect(() => {
    if (variant === 'mobile' || headings.length === 0) return;
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];
    let frame = 0;
    const update = () => {
      frame = 0;
      const passed = elements.filter((el) => el.getBoundingClientRect().top <= ACTIVE_LINE_PX);
      setActiveId(passed.at(-1)?.id ?? '');
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, [headings, variant]);

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

  // 追従ブロックでは現在地の周りだけを出す（まだ現在地が無いときは先頭から）
  const visibleGroups = useMemo<TocGroup[]>(() => {
    if (!compact) return groups;
    const at = Math.max(0, groups.findIndex(g => g.heading.id === activeId || g.children.some(c => c.id === activeId)));
    const [from, to] = windowAround(groups.length, at, COMPACT_AROUND * 2 + 1);
    return groups.slice(from, to).map((group, i) => {
      if (from + i !== at) return { ...group, children: [] };
      const child = Math.max(0, group.children.findIndex(c => c.id === activeId));
      const [cFrom, cTo] = windowAround(group.children.length, child, COMPACT_CHILDREN);
      return { ...group, children: group.children.slice(cFrom, cTo) };
    });
  }, [compact, groups, activeId]);

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
      {visibleGroups.filter(group => variant === 'sidebar' || group.heading.level === 2).map((group) => (
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
      <>
        <MetaCard as="div" padding="compact" className="hidden zenn-desktop:block" trackNav="article-toc">
          <div className="toc-title">このページの内容</div>
          <nav aria-label="このページの目次" className="toc-content toc-content-mobile">{tocList}</nav>
        </MetaCard>
        <Disclosure
          className="zenn-desktop:hidden"
          data-cta="nav"
          data-cta-label="article-toc"
          summary={<span className="font-serif text-[16px] font-bold text-(--ink)">このページの内容</span>}
          meta={<span className="font-mono text-[11px] tabular-nums text-(--ink-muted)">{groups.filter(group => group.heading.level === 2).length}項目</span>}
        >
          <nav
            aria-label="このページの目次"
            className="toc-content toc-content-mobile max-h-[55vh] overflow-y-auto border-t border-(--rule-soft) dark:border-(--rule-soft) px-4 py-3"
          >
            {tocList}
          </nav>
        </Disclosure>
      </>
    );
  }

  if (compact) {
    return (
      <MetaCard as="div" padding="compact" trackNav="rail-follow-toc">
        <div className="toc-title">このページの現在地</div>
        <nav aria-label="このページの目次（現在地の周り）" className="toc-content">{tocList}</nav>
      </MetaCard>
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

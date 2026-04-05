'use client';

import { useEffect, useRef, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings: TocItem[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
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

  if (headings.length === 0) return null;

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        目次
      </h3>
      <nav className="relative max-h-[calc(100vh-14rem)] overflow-y-auto toc-scroll">
        {/* 縦線（最初のドットから最後のドットまで） */}
        <div
          className="absolute left-[11px] top-[16px] bottom-[16px] w-[1px] bg-gray-200 dark:bg-gray-700"
        />

        {headings.map((heading) => {
          const isActive = activeId === heading.id;

          return (
            <div key={heading.id} className="relative flex items-start">
              {/* 見出し点 */}
              <div className="flex items-center justify-center w-6 h-10 flex-shrink-0">
                <span
                  className={`rounded border-2 border-white dark:border-gray-800 ${
                    heading.level === 2 ? 'w-[8px] h-[8px]' : 'w-[6px] h-[6px]'
                  } ${
                    isActive
                      ? 'bg-blue-600 dark:bg-blue-400'
                      : heading.level === 2
                      ? 'bg-blue-400 dark:bg-blue-500'
                      : 'bg-blue-300 dark:bg-blue-600'
                  }`}
                />
              </div>

              {/* 見出しリンク */}
              <a
                href={`#${heading.id}`}
                onClick={(e) => handleClick(e, heading.id)}
                className={`flex-1 text-left py-2 pr-3 transition-all duration-200 ${
                  isActive
                    ? 'text-blue-800 dark:text-blue-200 font-medium'
                    : heading.level === 2
                    ? 'text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
                style={{
                  paddingLeft: heading.level >= 3 ? `${(heading.level - 2) * 12}px` : '0px',
                }}
              >
                <span
                  className={`text-sm leading-relaxed block ${
                    heading.level === 2 ? 'font-medium' : 'font-normal'
                  }`}
                >
                  {heading.text}
                </span>
              </a>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

interface Heading {
  depth: number;
  text: string;
  id: string;
}

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '0px 0px -80% 0px' }
    );

    const headingElements = document.querySelectorAll('h2, h3, h4');
    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;

  return (
    <aside className="w-[200px] flex-shrink-0 hidden xl:block overflow-y-auto h-[calc(100vh-3.5rem)] sticky top-14 py-4 px-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">目次</h4>
      <ul className="space-y-1">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{ paddingLeft: `${(heading.depth - 2) * 12}px` }}
          >
            <a
              href={`#${heading.id}`}
              className={`block text-xs py-0.5 no-underline transition-colors ${
                activeId === heading.id
                  ? 'text-primary font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

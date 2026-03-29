'use client';

import { useState } from 'react';

interface Heading {
  depth: number;
  text: string;
  id: string;
}

export default function MobileTableOfContents({ headings }: { headings: Heading[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (headings.length === 0) return null;

  return (
    <div className="xl:hidden mb-6 border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700"
      >
        <span>目次</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <ul className="px-4 pb-3 space-y-1">
          {headings.map((heading) => (
            <li key={heading.id} style={{ paddingLeft: `${(heading.depth - 2) * 12}px` }}>
              <a
                href={`#${heading.id}`}
                className="block text-[13px] py-0.5 text-gray-600 hover:text-primary no-underline"
                onClick={() => setIsOpen(false)}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

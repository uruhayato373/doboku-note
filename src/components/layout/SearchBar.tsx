'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchEntry {
  title: string;
  path: string;
  preview: string;
}

export default function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [searchIndex, setSearchIndex] = useState<SearchEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Lazy-load search index on first open
  useEffect(() => {
    if (isOpen && searchIndex.length === 0) {
      fetch('/search-index.json')
        .then((r) => r.json())
        .then((data) => setSearchIndex(data))
        .catch(() => {});
    }
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen, searchIndex.length]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      setSelectedIndex(0);
      if (q.length < 2) {
        setResults([]);
        return;
      }
      const lower = q.toLowerCase();
      const matched = searchIndex
        .filter(
          (item) =>
            item.title.toLowerCase().includes(lower) ||
            item.preview.toLowerCase().includes(lower)
        )
        .slice(0, 10);
      setResults(matched);
    },
    [searchIndex]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].path);
      setIsOpen(false);
      setQuery('');
      setResults([]);
    }
  };

  const close = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5 hover:bg-gray-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline">検索</span>
        <kbd className="hidden md:inline text-xs bg-white border border-gray-300 rounded px-1.5 py-0.5 text-gray-400">
          Ctrl+K
        </kbd>
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
          onClick={close}
        >
          <div
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ドキュメントを検索..."
                className="flex-grow text-sm outline-none"
              />
              <kbd className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-gray-400">
                Esc
              </kbd>
            </div>
            {results.length > 0 && (
              <ul className="max-h-[40vh] overflow-y-auto py-2">
                {results.map((r, i) => (
                  <li key={i}>
                    <a
                      href={r.path}
                      className={`block px-4 py-2 text-sm no-underline transition-colors ${
                        i === selectedIndex
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={close}
                    >
                      <div className="font-semibold">{r.title}</div>
                      <div className="text-xs text-gray-500 truncate">{r.preview}</div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {query.length >= 2 && results.length === 0 && (
              <div className="px-4 py-8 text-sm text-gray-500 text-center">
                検索結果がありません
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

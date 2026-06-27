'use client';

import { useEffect, useState } from 'react';

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="ページの先頭に戻る"
      title="トップに戻る"
      className="fixed bottom-6 right-6 z-50 w-11 h-11 flex items-center justify-center rounded-full bg-[var(--paper)] border border-[var(--rule-soft)] shadow-md text-[var(--ink-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] hover:shadow-lg transition-all duration-200"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}

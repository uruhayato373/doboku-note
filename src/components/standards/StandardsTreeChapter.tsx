'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

type TreeSection = { number: number; title: string; href: string };

// 同じ文書の toc.json は 1 回だけ読む（章を開くたびに取りに行かない）。
const tocCache = new Map<string, Promise<Record<string, TreeSection[]>>>();

function loadToc(url: string): Promise<Record<string, TreeSection[]>> {
  let pending = tocCache.get(url);
  if (!pending) {
    pending = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`${url}: ${response.status}`);
      return response.json() as Promise<Record<string, TreeSection[]>>;
    });
    pending.catch(() => tocCache.delete(url));
    tocCache.set(url, pending);
  }
  return pending;
}

/**
 * 表示中でない章。開いたときに toc.json から節を読んで並べる（見た目は globals.css の standards-tree）。
 * 章名はリンク（章ページへ）、行の残りとシェブロンで開閉する。読み込みの案内は開いてから出す。
 */
export default function StandardsTreeChapter({
  tocUrl,
  chapterId,
  children,
}: {
  tocUrl: string;
  chapterId: string;
  children: ReactNode;
}) {
  const [sections, setSections] = useState<TreeSection[] | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');

  function handleToggle(event: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open || sections) return;
    setState('loading');
    loadToc(tocUrl)
      .then((toc) => setSections(toc[chapterId] ?? []))
      .catch(() => setState('failed'));
  }

  return (
    <details onToggle={handleToggle}>
      <summary>{children}</summary>
      {sections ? (
        <ol>
          {sections.map((section) => (
            <li key={section.number}>
              <Link href={section.href} className="focus-ring">
                <span>{section.number}節</span>
                <span>{section.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : state !== 'idle' && (
        <p className="py-1 pl-10 text-[12px] text-(--ink-muted)" role="status">
          {state === 'failed' ? '節の一覧を読み込めませんでした。章名から章ページを開いてください。' : '読み込み中…'}
        </p>
      )}
    </details>
  );
}

'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import DisclosureChevron from '@/components/ui/DisclosureChevron';
import { TREE_SECTION_LINK, TREE_SECTIONS, TREE_SUMMARY } from '@/components/standards/standards-tree-classes';

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
 * 表示中でない章。開いたときに toc.json から節を読んで並べる。
 * 章名はリンク（章ページへ）、行の残りとシェブロンで開閉する。
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
  const [failed, setFailed] = useState(false);

  function handleToggle(event: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open || sections) return;
    loadToc(tocUrl)
      .then((toc) => setSections(toc[chapterId] ?? []))
      .catch(() => setFailed(true));
  }

  return (
    <details onToggle={handleToggle}>
      <summary className={`${TREE_SUMMARY} pl-2`}>
        {children}
        <DisclosureChevron className="disclosure-chevron h-4 w-4 shrink-0 text-(--ink-muted)" />
      </summary>
      {sections ? (
        <ol className={TREE_SECTIONS}>
          {sections.map((section) => (
            <li key={section.number}>
              <Link href={section.href} className={TREE_SECTION_LINK}>
                <span className="w-7 shrink-0 font-mono text-[11px] tabular-nums text-(--ink-muted)">{section.number}節</span>
                <span className="min-w-0 flex-1">{section.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-1 pl-10 text-[12px] text-(--ink-muted)" role="status">
          {failed ? '節の一覧を読み込めませんでした。章名から章ページを開いてください。' : '読み込み中…'}
        </p>
      )}
    </details>
  );
}

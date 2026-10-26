'use client';

import Link from 'next/link';
import { useId, useState, type ReactNode } from 'react';

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
 * 章名はリンク（章ページへ）、右のボタンで開閉する。リンクを <summary> に入れると操作できる要素の入れ子になる
 * （axe の nested-interactive）ので <details> は使わない。読み込みの案内は開いてから出す。
 */
export default function StandardsTreeChapter({
  tocUrl,
  chapterId,
  label,
  children,
}: {
  tocUrl: string;
  chapterId: string;
  /** 開閉ボタンの読み上げ名に使う章の名前 */
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<TreeSection[] | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const listId = useId();

  function handleToggle() {
    setOpen((value) => !value);
    if (sections || state === 'loading') return;
    setState('loading');
    loadToc(tocUrl)
      .then((toc) => setSections(toc[chapterId] ?? []))
      .catch(() => setState('failed'));
  }

  return (
    <>
      <div data-tree-row>
        {children}
        <button
          type="button"
          className="focus-ring"
          data-tree-toggle
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${label}の節を${open ? '閉じる' : '開く'}`}
          onClick={handleToggle}
        />
      </div>
      {!open ? null : sections ? (
        <ol id={listId} data-tree-sections>
          {sections.map((section) => (
            <li key={section.number}>
              <Link href={section.href} className="focus-ring">
                <span>{section.number}節</span>
                <span>{section.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p id={listId} className="py-1 pl-10 text-[12px] text-(--ink-muted)" role="status">
          {state === 'failed' ? '節の一覧を読み込めませんでした。章名から章ページを開いてください。' : '読み込み中…'}
        </p>
      )}
    </>
  );
}

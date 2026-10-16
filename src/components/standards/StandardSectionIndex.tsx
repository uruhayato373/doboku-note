import Link from 'next/link';
import type { StandardDocument } from '@/lib/standards';
import { standardSectionPageRange, type StandardChapter } from '@/lib/standards-articles';
import { standardSectionPath } from '@/lib/standards-section-split.mjs';
import { generateHeadingId } from '@/lib/toc';

/**
 * 節ページに分けた章（splitBySection）の章ページ本文。節ごとに条の見出しまで並べ、
 * 条は節ページの該当アンカーへ直接飛べるようにする（章ページで探していた条にそのまま届く）。
 * アンカーは generateHeadingId（本文の見出しへ ID を振る関数と同じ）で導出する。
 */
export default function StandardSectionIndex({
  document,
  chapter,
}: {
  document: StandardDocument;
  chapter: StandardChapter;
}) {
  return (
    <section aria-labelledby="chapter-sections" data-standards-section-index={chapter.chapterId}>
      <h2 id="chapter-sections" className="text-2xl font-bold text-(--ink)">節から読む</h2>
      <p className="mt-2 text-[14px] leading-[1.8] text-(--ink-muted)">
        この章は原本 {chapter.firstPage}–{chapter.lastPage} ページと長いため、{chapter.sections.length}節に分けて掲載しています。読みたい節・条を選んでください。
      </p>
      <ol className="mt-5 space-y-4">
        {chapter.sections.map((section, index) => {
          const href = standardSectionPath(document, chapter, section.number);
          const pages = standardSectionPageRange(chapter, index);
          return (
            <li key={section.number} className="border border-(--rule-soft) bg-(--paper) dark:border-(--rule-soft)">
              <Link
                href={href}
                className="focus-ring flex min-h-14 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-(--accent-fill)"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-(--ink)">{section.headingText}</span>
                  <span className="mt-1 block font-mono text-[11px] text-(--ink-muted)">
                    {section.articles.length > 0 && `${section.articles.length}条 · `}原本 p.{pages.first}–{pages.last}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-(--ink-muted)">→</span>
              </Link>
              {section.articles.length > 0 && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-(--rule-soft) px-4 py-3 text-[13px] leading-[1.7]">
                  {section.articles.map((article) => (
                    <li key={article.number}>
                      <Link
                        href={`${href}#${generateHeadingId(article.headingText)}`}
                        className="focus-ring inline-flex min-h-8 items-center text-(--ink-body) hover:text-(--accent) hover:underline"
                      >
                        {article.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

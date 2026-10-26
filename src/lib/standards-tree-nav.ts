import 'server-only';

import type { StandardDocument } from '@/lib/standards';
import { getStandardChapters, standardChapterPath, type StandardChapter } from '@/lib/standards-articles';
import { standardSectionPath } from '@/lib/standards-section-split.mjs';
import { generateHeadingId } from '@/lib/toc';

/**
 * 試作: 右の欄を 編 → 章 → 節 の 1 本の目次にする文書。
 * 効果と重さを近畿の共通仕様書で確かめてから広げる。
 */
const TREE_NAV_DOCUMENTS = new Set(['kinki/common']);

export function usesTreeNav(document: Pick<StandardDocument, 'agencyId' | 'documentId'>): boolean {
  return TREE_NAV_DOCUMENTS.has(`${document.agencyId}/${document.documentId}`);
}

export function treeNavDocumentKeys(): { agency: string; document: string }[] {
  return [...TREE_NAV_DOCUMENTS].map((key) => {
    const [agency = '', document = ''] = key.split('/');
    return { agency, document };
  });
}

/** 目次の節 1 件。表示中の章は HTML に書き、他の章は toc.json から開いたときに読む。 */
export type StandardTreeSection = { number: number; title: string; href: string };

/**
 * 節のリンク先。節ページに分けた章は節ページ、分けていない章は章ページの見出しアンカー
 * （アンカーは rehypeHeadingIds と同じ generateHeadingId から導出する）。
 */
export function standardTreeSections(
  document: Pick<StandardDocument, 'agencyId' | 'documentId'>,
  chapter: StandardChapter,
  { samePage }: { samePage: boolean },
): StandardTreeSection[] {
  const chapterPath = standardChapterPath(document, chapter);
  return chapter.sections.map((section) => {
    const anchor = `#${generateHeadingId(section.headingText)}`;
    return {
      number: section.number,
      title: section.title,
      href: chapter.splitBySection
        ? standardSectionPath(document, chapter, section.number)
        : samePage ? anchor : `${chapterPath}${anchor}`,
    };
  });
}

/** toc.json の中身（章 ID → 節の並び）。全章の節を HTML に書くと 1 ページ約 1MB 増えるので分けて配る。 */
export function standardTreeToc(
  document: Pick<StandardDocument, 'agencyId' | 'documentId'>,
): Record<string, StandardTreeSection[]> {
  return Object.fromEntries(
    getStandardChapters(document.agencyId, document.documentId)
      .filter((chapter) => chapter.sections.length > 0)
      .map((chapter) => [chapter.chapterId, standardTreeSections(document, chapter, { samePage: false })]),
  );
}

export function standardTreeTocPath(document: Pick<StandardDocument, 'agencyId' | 'documentId'>): string {
  return `/standards/${document.agencyId}/${document.documentId}/toc.json`;
}

import PrevNextNav from '@/components/ui/TextbookNav/PrevNextNav';
import { getStandardChapters, standardChapterPath } from '@/lib/standards-articles';
import type { StandardChapter as Chapter } from '@/lib/standards-articles';
import type { StandardDocument } from '@/lib/standards';

/**
 * 章の末尾の「前の章・次の章」（同じ文書の章の並び＝getStandardChapters の順）。
 * 右のナビ欄（StandardsNavigation）は PC だけ・目次の形なので、読み終えた位置から次の章へ 1 回で移れるようにする（2026-11 の SEO 計画 §6）。
 * クリックは internal_nav_click（label=standards-chapter-nav）。カードは前後ナビの共通部品（PrevNextNav）。
 */
export default function StandardChapterPager({ document, chapter }: { document: StandardDocument; chapter: Chapter }) {
  const chapters = getStandardChapters(document.agencyId, document.documentId);
  const i = chapters.findIndex((c) => c.chapterId === chapter.chapterId);
  if (i < 0) return null;
  const item = (c: Chapter | undefined) => c ? { href: standardChapterPath(document, c), title: c.title } : null;
  return (
    <PrevNextNav
      heading="この文書の前後の章"
      track="standards-chapter-nav"
      prev={item(chapters[i - 1])}
      next={item(chapters[i + 1])}
      prevLabel="前の章"
      nextLabel="次の章"
    />
  );
}

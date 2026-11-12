import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { getStandardChapters, standardChapterPath, type StandardChapter as Chapter } from '@/lib/standards-articles';
import type { StandardDocument } from '@/lib/standards';

/**
 * 章の末尾の「前の章・次の章」（同じ文書の章の並び＝getStandardChapters の順）。
 * 右のナビ欄（StandardsNavigation）は PC だけ・目次の形なので、読み終えた位置から次の章へ 1 回で移れるようにする（2026-11 の SEO 計画 §6）。
 * クリックは internal_nav_click（label=standards-chapter-nav）。
 */
export default function StandardChapterPager({ document, chapter }: { document: StandardDocument; chapter: Chapter }) {
  const chapters = getStandardChapters(document.agencyId, document.documentId);
  const i = chapters.findIndex((c) => c.chapterId === chapter.chapterId);
  if (i < 0) return null;
  const prev = chapters[i - 1];
  const next = chapters[i + 1];
  if (!prev && !next) return null;
  const item = (c: Chapter, label: string, align: string) => (
    <Link
      href={standardChapterPath(document, c)}
      className={`block rounded-card-content border border-(--rule-soft) p-4 transition-colors hover:border-(--accent) dark:border-(--rule) ${align}`}
    >
      <div className="mb-1 text-xs text-(--ink-muted)">{label}</div>
      <div className="text-sm font-semibold text-(--accent)">{c.title}</div>
    </Link>
  );
  return (
    <MetaCard trackNav="standards-chapter-nav">
      <h2 className="mb-4 text-lg font-bold text-(--ink)">この文書の前後の章</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {prev ? item(prev, '← 前の章', '') : <div />}
        {next ? item(next, '次の章 →', 'text-right') : <div />}
      </div>
    </MetaCard>
  );
}

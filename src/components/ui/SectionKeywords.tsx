import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { getPublicDocPath } from '@/lib/content-routes';
import { peKeywordSlug, peSectionKeywords } from '@/lib/pe-section-keywords';

interface SectionKeywordsProps {
  currentSlug: string;
  section: string;
}

/**
 * 同セクション内のキーワードリンク一覧（スマホの記事末。右の欄は CategoryNavCard の SectionCard）。
 * 解決は src/lib/pe-section-keywords.ts（ページの無い slug は除く）。
 */
export default function SectionKeywords({ currentSlug, section }: SectionKeywordsProps) {
  const resolved = peSectionKeywords(section, currentSlug);
  if (!resolved) return null;
  const { chapter, section: sec, currentSuffix } = resolved;
  // 現在のページを除外する
  const others = resolved.keywords.filter(k => k.slug !== currentSuffix);
  if (others.length === 0) return null;

  return (
    <MetaCard ariaLabel="同セクションのキーワード" trackNav="section-keywords" title={sec.title} lead={<>{chapter.title} &mdash; セクション {section}</>}>
      <div className="flex flex-wrap gap-2">
        {others.map(kw => (
          <Link
            key={kw.slug}
            href={getPublicDocPath(peKeywordSlug(kw.slug))}
            className="text-sm px-3 py-1.5 rounded-full border border-(--rule-soft) bg-(--bg) text-(--ink-body) hover:border-(--accent) hover:text-(--accent) transition-colors"
          >
            {kw.title}
          </Link>
        ))}
      </div>
    </MetaCard>
  );
}

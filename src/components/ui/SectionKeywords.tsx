import Link from 'next/link';
import peChaptersData from '@/config/pe-chapters.json';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { peKeywordPageExists } from '@/lib/pe-keyword-nav';
import { getPublicDocPath } from '@/lib/content-routes';

interface SectionKeywordsProps {
  currentSlug: string;
  section: string;
}

/**
 * 同セクション内のキーワードリンク一覧。
 * pe-chapters.json のデータを使って自動生成。
 */
export default function SectionKeywords({ currentSlug, section }: SectionKeywordsProps) {
  const chapterId = section.split('.')[0];
  const chapter = peChaptersData.chapters.find(c => c.id === chapterId);
  if (!chapter) return null;

  const sec = chapter.sections.find(s => s.id === section);
  if (!sec || !sec.keywords) return null;

  // 現在のページを除外し、ページが実在するキーワードだけをリンク対象にする
  // （pe-chapters.json の phantom slug への内部リンク切れを防ぐ）。
  const currentSlugSuffix = currentSlug.replace('pe-comprehensive-management-', '');
  const others = sec.keywords.filter(
    k => k.slug !== currentSlugSuffix && peKeywordPageExists(k.slug),
  );
  if (others.length === 0) return null;

  return (
    <MetaCard ariaLabel="同セクションのキーワード" trackNav="section-keywords">
      <h2 className="text-lg font-bold text-[var(--ink)] mb-1">
        {sec.title}
      </h2>
      <p className="text-sm text-[var(--ink-muted)] mb-4">
        {chapter.title} &mdash; セクション {section}
      </p>
      <div className="flex flex-wrap gap-2">
        {others.map(kw => (
          <Link
            key={kw.slug}
            href={getPublicDocPath(`pe-comprehensive-management-${kw.slug}`)}
            className="text-sm px-3 py-1.5 rounded-full border border-[var(--rule-soft)] bg-[var(--bg)] text-[var(--ink-body)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            {kw.title}
          </Link>
        ))}
      </div>
    </MetaCard>
  );
}

import Link from 'next/link';
import { Metadata } from 'next';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionBlock from '@/components/layout/SectionBlock';
import { getDocsMetaByCategory, type DocMeta } from '@/lib/docs';
import peChaptersData from '@/config/pe-chapters.json';
import type { PeChapter } from '@/config/pe-chapters';
import { getPublicDocPath } from '@/lib/content-routes';
import { getCategoryHubPath } from '@/lib/categories';

const PE_CHAPTERS: PeChapter[] = peChaptersData.chapters;

export const metadata: Metadata = {
  // title テンプレート "%s | doboku-note" が自動付与するため "| doboku-note" を重ねない
  // （旧: "… キーワード索引 | doboku-note" + テンプレ = 二重サイト名だった）。
  title: '総合技術監理 キーワード索引',
  description: '技術士・総合技術監理部門のキーワード集 2026（5 管理 × 26 セクション）の全キーワード索引。経済性管理・人的資源管理・情報管理・安全管理・社会環境管理の体系で整理。',
  alternates: {
    canonical: 'https://doboku-note.com/sitemap-keywords',
  },
  // og:url を明示（未設定だと root の homepage og:url を継承してしまう）。
  openGraph: {
    url: 'https://doboku-note.com/sitemap-keywords',
    title: '総合技術監理 キーワード索引',
    description: '技術士・総合技術監理部門のキーワード集 2026 の全キーワード索引。',
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * PE セクション別ツリー表示
 * キーワード集の5管理体系に基づきキーワードをグルーピング
 */
function PeSectionTree({ keywordDocs }: { keywordDocs: DocMeta[] }) {
  const keywordsBySection = new Map<string, DocMeta[]>();
  const unmapped: DocMeta[] = [];
  for (const doc of keywordDocs) {
    const sec = doc.section as string | undefined;
    if (sec) {
      if (!keywordsBySection.has(sec)) keywordsBySection.set(sec, []);
      keywordsBySection.get(sec)!.push(doc);
    } else {
      unmapped.push(doc);
    }
  }

  return (
    <div className="space-y-10">
      {PE_CHAPTERS.map(chapter => {
        const hasContent = chapter.sections.some(sec =>
          keywordsBySection.has(sec.id)
        );
        if (!hasContent) return null;

        return (
          <div key={chapter.id}>
            <h2 className="text-lg font-bold text-[var(--ink)] mb-4">
              {chapter.title}
            </h2>
            <div className="space-y-3 ml-2">
              {chapter.sections.map(sec => {
                const keywords = keywordsBySection.get(sec.id) || [];
                if (keywords.length === 0) return null;

                return (
                  <div key={sec.id} className="border-l-2 border-[var(--rule-soft)] pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-semibold text-[var(--ink-body)]">{sec.title}</span>
                      <span className="text-xs text-[var(--ink-muted)]">({keywords.length} 件)</span>
                    </div>
                    <div className="flex flex-wrap gap-2 ml-2 mt-2">
                      {keywords
                        .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'))
                        .map(kw => (
                          <Link
                            key={kw.slug}
                            href={getPublicDocPath(kw.slug)}
                            className="text-base px-2.5 py-1 rounded-full border border-[var(--rule-soft)] bg-[var(--paper)] text-[var(--ink-body)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                          >
                            {kw.title}
                          </Link>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {unmapped.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-4">その他</h2>
          <div className="flex flex-wrap gap-2 ml-2">
            {unmapped
              .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'))
              .map(kw => (
                <Link
                  key={kw.slug}
                  href={getPublicDocPath(kw.slug)}
                  className="text-base px-2.5 py-1 rounded-full border border-[var(--rule-soft)] bg-[var(--paper)] text-[var(--ink-body)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                  {kw.title}
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function SitemapKeywordsPage() {
  const allDocs = await getDocsMetaByCategory('pe-comprehensive-management');
  const keywordDocs = allDocs.filter(d =>
    d.published !== false && d.group === 'keyword'
  );

  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="wide"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: '総合技術監理', href: getCategoryHubPath('pe-comprehensive-management') },
          { label: 'キーワード索引' },
        ]}
        label="SITEMAP"
        title="総合技術監理 キーワード索引"
        lead={
          <>
            <a href="https://www.mext.go.jp/b_menu/shingi/gijyutu/gijyutu7/toushin/1411203_00007.htm" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">文部科学省「総合技術監理 キーワード集 2026」</a>に基づき、5 管理（経済性 / 人的資源 / 情報 / 安全 / 社会環境）× 26 セクションの体系で整理した全キーワードの索引です。
          </>
        }
        meta={<span className="tabular-nums">{keywordDocs.length.toLocaleString()} keywords</span>}
      />

      <SectionBlock width="wide" space="md">
        <div className="text-[17px] leading-[1.9]">
          <PeSectionTree keywordDocs={keywordDocs} />
        </div>
      </SectionBlock>
    </PageShell>
  );
}

/**
 * カテゴリナビカード
 * PE・Civil 両カテゴリのグループナビゲーションを
 * ページの分類に応じて右サイドバーまたは記事末尾に表示する。
 */
import Link from 'next/link';
import type { DocMeta } from '@/lib/docs';
import { classifyDoc, type DocGroupKey } from '@/lib/doc-classifier';
import { resolveCurriculum } from '@/lib/category-curriculum';
import { resolveNavTitle } from '@/lib/doc-title';
import { buildPastExamNavData } from '@/components/ui/PastExamNav/exam-nav-utils';
import peChaptersData from '@/config/pe-chapters.json';
import type { PeChapter } from '@/config/pe-chapters';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { peKeywordPageExists } from '@/lib/pe-keyword-nav';

const peChapters = peChaptersData.chapters as PeChapter[];

interface CategoryNavCardProps {
  variant: 'sidebar' | 'mobile';
  category: string;
  currentSlug: string;
  docGroup: DocGroupKey;
  categoryArticles: DocMeta[];
}

/* ─── 共通: セルリンク ─── */
function CellLink({ slug, label, currentSlug }: { slug: string | undefined; label: string; currentSlug: string }) {
  if (!slug) return <span className="text-[var(--ink-muted)] opacity-50">—</span>;
  if (slug === currentSlug) return <span className="font-bold text-[var(--ink)]">{label}</span>;
  return (
    <Link href={`/docs/${slug}`} className="text-brand hover:text-brand-deep hover:underline">
      {label}
    </Link>
  );
}

/* ━━━ 過去問カード ━━━ */
function PastExamCard({ variant, currentSlug, categoryArticles, category }: { variant: 'sidebar' | 'mobile'; currentSlug: string; categoryArticles: DocMeta[]; category: string }) {
  const data = buildPastExamNavData(category, categoryArticles);
  if (!data || data.years.length === 0) return null;

  if (variant === 'sidebar') {
    return (
      <SidebarWrapper title="過去問">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--rule-soft)]">
              <th className="text-left py-1 pr-2 font-medium text-[var(--ink-muted)] text-xs" />
              <th className="text-center py-1 px-1 font-medium text-[var(--ink-muted)] text-xs">{data.col1Header}</th>
              <th className="text-center py-1 px-1 font-medium text-[var(--ink-muted)] text-xs">{data.col2Header}</th>
              {data.col3Header && <th className="text-center py-1 px-1 font-medium text-[var(--ink-muted)] text-xs">{data.col3Header}</th>}
            </tr>
          </thead>
          <tbody>
            {data.years.map((year) => {
              const isCurrent = year.col1?.slug === currentSlug || year.col2?.slug === currentSlug || year.col3?.slug === currentSlug;
              return (
                <tr key={year.yearCode} className={isCurrent ? 'bg-[var(--accent-fill)]' : ''}>
                  <td className="py-1.5 pr-2 text-[var(--ink-body)] font-medium whitespace-nowrap">{year.label}</td>
                  <td className="py-1.5 px-1 text-center"><CellLink slug={year.col1?.slug} label={data.col1Header} currentSlug={currentSlug} /></td>
                  <td className="py-1.5 px-1 text-center"><CellLink slug={year.col2?.slug} label={data.col2Header} currentSlug={currentSlug} /></td>
                  {data.col3Header && <td className="py-1.5 px-1 text-center"><CellLink slug={year.col3?.slug} label={data.col3Header} currentSlug={currentSlug} /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </SidebarWrapper>
    );
  }

  return (
    <MobileWrapper title="過去問一覧">
      <div className="overflow-x-auto">
        <table className="w-full text-base border-collapse">
          <thead>
            <tr className="border-b-2 border-[var(--rule-soft)]">
              <th className="text-left py-3 px-4 font-semibold text-[var(--ink-body)]">年度</th>
              <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">{data.col1Header === '択一' ? '択一式' : `問題${data.col1Header}`}</th>
              <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">{data.col2Header === '記述' ? '記述式' : `問題${data.col2Header}`}</th>
              {data.col3Header && <th className="text-center py-3 px-4 font-semibold text-[var(--ink-body)]">第2次検定</th>}
            </tr>
          </thead>
          <tbody>
            {data.years.map((year) => {
              const isCurrent = year.col1?.slug === currentSlug || year.col2?.slug === currentSlug || year.col3?.slug === currentSlug;
              return (
                <tr key={year.yearCode} className={`border-b border-[var(--rule-soft)] transition-colors ${isCurrent ? 'bg-[var(--accent-fill)]' : 'hover:bg-[var(--accent-fill)]'}`}>
                  <td className={`py-3 px-4 text-[var(--ink)] ${isCurrent ? 'font-bold' : 'font-medium'}`}>{year.label}</td>
                  <td className="py-3 px-4 text-center"><CellLink slug={year.col1?.slug} label={data.col1Header === '択一' ? '択一式' : `問題${data.col1Header}`} currentSlug={currentSlug} /></td>
                  <td className="py-3 px-4 text-center"><CellLink slug={year.col2?.slug} label={data.col2Header === '記述' ? '記述式' : `問題${data.col2Header}`} currentSlug={currentSlug} /></td>
                  {data.col3Header && <td className="py-3 px-4 text-center"><CellLink slug={year.col3?.slug} label="第2次検定" currentSlug={currentSlug} /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </MobileWrapper>
  );
}

/* ━━━ セクション別解説カード ━━━ */
function SectionCard({ variant, currentSlug, currentSection }: { variant: 'sidebar' | 'mobile'; currentSlug: string; currentSection: string | undefined }) {
  const chapters = peChapters;
  const currentChapterId = currentSection?.split('.')[0];

  if (variant === 'sidebar') {
    const chapter = chapters.find(c => c.id === currentChapterId);
    const section = chapter?.sections.find(s => s.id === currentSection);
    const currentSuffix = currentSlug.replace('pe-comprehensive-management-', '');
    // 実在ページ（＋現在ページ）だけを残す。pe-chapters.json の phantom slug への
    // 内部リンク切れを防ぐ（build 後 SEO ゲートと整合）。
    const keywords = section?.keywords?.filter(
      kw => kw.slug === currentSuffix || peKeywordPageExists(kw.slug),
    );

    if (!section || !keywords || keywords.length === 0) return null;

    return (
      <SidebarWrapper title="同セクションのキーワード">
        <p className="text-xs text-[var(--ink-muted)] mb-2">
          {section.id} {section.title}
        </p>
        <ul className="max-h-[280px] overflow-y-auto toc-scroll">
          {keywords.map(kw => (
            <li key={kw.slug} className="border-b border-[var(--rule-soft)] last:border-b-0">
              {kw.slug === currentSuffix ? (
                <span className="block text-sm py-2 font-bold text-[var(--ink)]">
                  {kw.title}
                </span>
              ) : (
                <Link
                  href={`/docs/pe-comprehensive-management-${kw.slug}`}
                  className="block text-sm py-2 text-brand underline decoration-brand/30 underline-offset-2 hover:text-brand-deep hover:decoration-brand transition-colors"
                >
                  {kw.title}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </SidebarWrapper>
    );
  }

  return (
    <MobileWrapper title="セクション別解説">
      <div className="space-y-4">
        {chapters.map((ch) => {
          const isCurrentChapter = ch.id === currentChapterId;
          return (
            <div key={ch.id}>
              <h3 className={`text-sm font-bold mb-2 ${isCurrentChapter ? 'text-[var(--accent)]' : 'text-[var(--ink-body)]'}`}>
                {ch.title}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {ch.sections.map((sec) => {
                  const isCurrentSection = sec.id === currentSection;
                  return (
                    <span
                      key={sec.id}
                      className={`text-xs px-2.5 py-1 rounded-full border ${
                        isCurrentSection
                          ? 'bg-[var(--accent-fill)] border-[var(--accent)] font-bold text-[var(--accent)]'
                          : 'border-[var(--rule-soft)] text-[var(--ink-body)]'
                      }`}
                    >
                      {sec.id} {sec.title}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </MobileWrapper>
  );
}

/* ─── ラッパー（デザイン統一） ─── */
function SidebarWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <MetaCard as="div" padding="compact" trackNav="category-nav">
      <div
        className="nav-card-title text-[var(--ink)]"
      >
        {title}
      </div>
      {children}
    </MetaCard>
  );
}

function MobileWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <MetaCard trackNav="category-nav">
      <h2 className="text-lg font-bold text-[var(--ink)] mb-4">{title}</h2>
      {children}
    </MetaCard>
  );
}

/**
 * ナビ一覧の 2 行目（サブタイトル）。
 * subtitle は平均 27 字・最大 50 字あり、サイドバー幅 288px では 3 行以上になりうるので
 * 2 行で打ち切る（全件が「主題 1 行 + サブ 2 行」以内に収まりリストのリズムが安定する）。
 */
function NavSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mt-0.5 block text-[12px] leading-[1.5] text-[var(--ink-muted)] overflow-hidden"
      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
    >
      {children}
    </span>
  );
}

/* ━━━ リンクリストカード（汎用） ━━━ */
function LinkListCard({
  variant,
  title,
  currentSlug,
  docs,
  navList,
}: {
  variant: 'sidebar' | 'mobile';
  title: string;
  currentSlug: string;
  docs: DocMeta[];
  /** ビルド後検査用のマーカー（例 "exam-guide"）。check-career-separation --built が参照する。 */
  navList?: string;
}) {
  if (docs.length === 0) return null;

  if (variant === 'sidebar') {
    return (
      <SidebarWrapper title={title}>
        <ul data-nav-list={navList}>
          {docs.map((d) => {
            const { main, sub } = resolveNavTitle(d);
            return (
              <li key={d.slug} className="border-b border-[var(--rule-soft)] last:border-b-0">
                {d.slug === currentSlug ? (
                  <span className="block py-2">
                    <span className="block text-sm font-bold text-[var(--ink)]">{main}</span>
                    {sub && <NavSubtitle>{sub}</NavSubtitle>}
                  </span>
                ) : (
                  <Link href={`/docs/${d.slug}`} className="group block py-2">
                    <span className="block text-sm text-brand underline decoration-brand/30 underline-offset-2 group-hover:text-brand-deep group-hover:decoration-brand transition-colors">
                      {main}
                    </span>
                    {sub && <NavSubtitle>{sub}</NavSubtitle>}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </SidebarWrapper>
    );
  }

  return (
    <MobileWrapper title={title}>
      <ul className="space-y-2" data-nav-list={navList}>
        {docs.map((d) => {
          const { main, sub } = resolveNavTitle(d);
          return (
            <li key={d.slug} className={`rounded-card-content border px-4 py-3 transition-colors ${d.slug === currentSlug ? 'bg-[var(--accent-fill)] border-[var(--accent)]' : 'border-[var(--rule-soft)] hover:border-[var(--accent)]'}`}>
              {d.slug === currentSlug ? (
                <>
                  <span className="block text-sm font-bold text-[var(--ink)]">{main}</span>
                  {sub && <NavSubtitle>{sub}</NavSubtitle>}
                </>
              ) : (
                <Link href={`/docs/${d.slug}`} className="group block">
                  <span className="block text-sm text-brand group-hover:underline">{main}</span>
                  {sub && <NavSubtitle>{sub}</NavSubtitle>}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </MobileWrapper>
  );
}

/* ━━━ メインコンポーネント ━━━ */
export default function CategoryNavCard({ variant, category, currentSlug, docGroup, categoryArticles }: CategoryNavCardProps) {
  if (category === 'pe-comprehensive-management') {
    const currentDoc = categoryArticles.find((m) => m.slug === currentSlug);
    const currentSection = currentDoc?.section as string | undefined;

    switch (docGroup) {
      case 'guide': {
        const guides = categoryArticles
          .filter((m) => classifyDoc(m) === 'guide')
          .sort((a, b) => (a.guide_order ?? 999) - (b.guide_order ?? 999));
        return <LinkListCard variant={variant} title="試験概要" currentSlug={currentSlug} docs={guides} />;
      }
      case 'pillar': {
        const pillars = categoryArticles
          .filter((m) => classifyDoc(m) === 'pillar')
          .sort((a, b) => parseFloat(a.section ?? '99') - parseFloat(b.section ?? '99'));
        return (
          <>
            <LinkListCard variant={variant} title="5 管理学習ガイド" currentSlug={currentSlug} docs={pillars} />
            <div className={variant === 'sidebar' ? 'mt-3' : 'mt-6'}>
              <PastExamCard variant={variant} currentSlug={currentSlug} categoryArticles={categoryArticles} category={category} />
            </div>
          </>
        );
      }
      case 'pastExam':
        return <PastExamCard variant={variant} currentSlug={currentSlug} categoryArticles={categoryArticles} category={category} />;
      case 'keyword':
        return <SectionCard variant={variant} currentSlug={currentSlug} currentSection={currentSection} />;
      default:
        return null;
    }
  }

  if (category === 'civil-construction-1' || category === 'civil-construction-2') {
    switch (docGroup) {
      case 'guide': {
        // 学習系ガイドのみを curriculum の意図順で出す。
        // classifyDoc は career 記事も 'guide' を返すため、素で filter すると転職記事が混入する
        // （2026-07-28 実測: civil-1 は 49 件中 26 件が転職系・並びは slug のアルファベット順）。
        // カテゴリページと同じ resolveCurriculum に寄せることで career 除外と表示順が構造的に入る。
        // 転職導線はサイドバーのアフィリ枠とカテゴリページの CareerSection が担当（ここには出さない）。
        const guideDocs = categoryArticles.filter((m) => classifyDoc(m) === 'guide');
        const curriculum = resolveCurriculum(category, guideDocs);
        const guides = [...(curriculum.examGuide?.docs ?? []), ...curriculum.unassigned];
        return (
          <LinkListCard
            variant={variant}
            title="試験ガイド"
            currentSlug={currentSlug}
            docs={guides}
            navList="exam-guide"
          />
        );
      }
      case 'primary':
        return <PastExamCard variant={variant} currentSlug={currentSlug} categoryArticles={categoryArticles} category={category} />;
      case 'secondary': {
        const secondaryDocs = categoryArticles.filter((m) => classifyDoc(m) === 'secondary');
        return <LinkListCard variant={variant} title="第2次検定" currentSlug={currentSlug} docs={secondaryDocs} />;
      }
      case 'textbook': {
        const textbooks = categoryArticles
          .filter((m) => classifyDoc(m) === 'textbook')
          .sort((a, b) => (a.textbook_order ?? 999) - (b.textbook_order ?? 999));
        return <LinkListCard variant={variant} title="テキスト" currentSlug={currentSlug} docs={textbooks} />;
      }
      default:
        return null;
    }
  }

  return null;
}

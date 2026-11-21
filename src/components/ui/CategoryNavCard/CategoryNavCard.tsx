import { categoryNavPlan } from '@/lib/category-nav-plan';
/**
 * カテゴリナビカード
 * PE・Civil 両カテゴリのグループナビゲーションを
 * ページの分類に応じて右サイドバーまたは記事末尾に表示する。
 */
import Link from 'next/link';
import type { RailKind } from '@/lib/rail-kinds.mjs';
import LinkTile from '@/components/ui/LinkTile/LinkTile';
import LinkRow, { LinkRowList } from '@/components/ui/LinkRow/LinkRow';
import { DiscoveryNav } from '@/components/ui/SidebarDiscovery';
import type { DocMeta } from '@/lib/docs';
import { type DocGroupKey } from '@/lib/doc-classifier';
import { resolveNavTitle } from '@/lib/doc-title';
import { buildPastExamNavData } from '@/lib/past-exam-nav';
import { peKeywordSlug, peSectionKeywords } from '@/lib/pe-section-keywords';
import peChaptersData from '@/config/pe-chapters.json';
import type { PeChapter } from '@/config/pe-chapters';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { getPublicDocPath } from '@/lib/content-routes';

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
  if (!slug) return <span className="text-(--ink-muted) opacity-50">—</span>;
  if (slug === currentSlug) return <span className="font-bold text-(--ink)">{label}</span>;
  return (
    <Link href={getPublicDocPath(slug)} className="text-brand hover:text-brand-deep hover:underline">
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
            <tr className="border-b border-(--rule-soft)">
              <th className="text-left py-1 pr-2 font-medium text-(--ink-muted) text-xs" />
              <th className="text-center py-1 px-1 font-medium text-(--ink-muted) text-xs">{data.col1Header}</th>
              <th className="text-center py-1 px-1 font-medium text-(--ink-muted) text-xs">{data.col2Header}</th>
              {data.col3Header && <th className="text-center py-1 px-1 font-medium text-(--ink-muted) text-xs">{data.col3Header}</th>}
            </tr>
          </thead>
          <tbody>
            {data.years.map((year) => {
              const isCurrent = year.col1?.slug === currentSlug || year.col2?.slug === currentSlug || year.col3?.slug === currentSlug;
              return (
                <tr key={year.yearCode} className={isCurrent ? 'bg-(--accent-fill)' : ''}>
                  <td className="py-1.5 pr-2 text-(--ink-body) font-medium whitespace-nowrap">{year.label}</td>
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
            <tr className="border-b-2 border-(--rule-soft)">
              <th className="text-left py-3 px-4 font-semibold text-(--ink-body)">年度</th>
              <th className="text-center py-3 px-4 font-semibold text-(--ink-body)">{data.col1Header === '択一' ? '択一式' : `問題${data.col1Header}`}</th>
              <th className="text-center py-3 px-4 font-semibold text-(--ink-body)">{data.col2Header === '記述' ? '記述式' : `問題${data.col2Header}`}</th>
              {data.col3Header && <th className="text-center py-3 px-4 font-semibold text-(--ink-body)">第2次検定</th>}
            </tr>
          </thead>
          <tbody>
            {data.years.map((year) => {
              const isCurrent = year.col1?.slug === currentSlug || year.col2?.slug === currentSlug || year.col3?.slug === currentSlug;
              return (
                <tr key={year.yearCode} className={`border-b border-(--rule-soft) transition-colors ${isCurrent ? 'bg-(--accent-fill)' : 'hover:bg-(--accent-fill)'}`}>
                  <td className={`py-3 px-4 text-(--ink) ${isCurrent ? 'font-bold' : 'font-medium'}`}>{year.label}</td>
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
    const resolved = peSectionKeywords(currentSection, currentSlug);
    if (!resolved || resolved.keywords.length === 0) return null;
    const { section, keywords, currentSuffix } = resolved;

    return (
      <SidebarWrapper title="同セクションのキーワード" lead={`${section.id} ${section.title}`}>
        <LinkRowList>
          {keywords.map(kw => (
            <LinkRow
              key={kw.slug}
              href={getPublicDocPath(peKeywordSlug(kw.slug))}
              title={kw.title}
              current={kw.slug === currentSuffix}
            />
          ))}
        </LinkRowList>
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
              <h3 className={`text-sm font-bold mb-2 ${isCurrentChapter ? 'text-(--accent)' : 'text-(--ink-body)'}`}>
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
                          ? 'bg-(--accent-fill) border-(--accent) font-bold text-(--accent)'
                          : 'border-(--rule-soft) text-(--ink-body)'
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
function SidebarWrapper({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <MetaCard as="div" padding="compact" trackNav="category-nav" title={title} lead={lead}>
      {children}
    </MetaCard>
  );
}

function MobileWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <MetaCard trackNav="category-nav" title={title}>
      {children}
    </MetaCard>
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
        <LinkRowList {...(navList ? { data: { 'data-nav-list': navList } } : {})}>
          {docs.map((d) => {
            const { main, sub } = resolveNavTitle(d);
            return (
              <LinkRow
                key={d.slug}
                href={getPublicDocPath(d.slug)}
                title={main}
                description={sub}
                current={d.slug === currentSlug}
              />
            );
          })}
        </LinkRowList>
      </SidebarWrapper>
    );
  }

  return (
    <MobileWrapper title={title}>
      <ul className="space-y-2" data-nav-list={navList}>
        {docs.map((d) => {
          const { main, sub } = resolveNavTitle(d);
          return (
            <li key={d.slug}>
              <LinkTile href={getPublicDocPath(d.slug)} title={main} description={sub} current={d.slug === currentSlug} />
            </li>
          );
        })}
      </ul>
    </MobileWrapper>
  );
}

/* ━━━ メインコンポーネント ━━━ */
export function categoryNavCards(props: CategoryNavCardProps) {
 return categoryNavPlan(props).map(spec => {
  if (spec.kind === 'discovery') return <DiscoveryNav category={props.category} currentSlug={props.currentSlug} docs={props.categoryArticles} />;
  if (spec.kind === 'pastExam') return <PastExamCard {...props} />;
  if (spec.kind === 'section') return <SectionCard variant={props.variant} currentSlug={props.currentSlug} currentSection={spec.currentSection} />;
  return <LinkListCard variant={props.variant} currentSlug={props.currentSlug} title={spec.title} docs={spec.docs} {...(spec.navList ? { navList: spec.navList } : {})} />;
 });
}
/** categoryNavCards の 1 枚ずつの右の欄の種類（src/lib/rail-kinds.mjs）。年度の表だけ years */
export function categoryNavKinds(props: CategoryNavCardProps): RailKind[] {
 return categoryNavPlan(props).map(spec => spec.kind === 'pastExam' ? 'years' : 'nav');
}
export default function CategoryNavCard(props: CategoryNavCardProps) {
 return <>{categoryNavCards(props).map((card, index) => <div key={index} className={index ? (props.variant === 'sidebar' ? 'mt-3' : 'mt-6') : undefined}>{card}</div>)}</>;
}

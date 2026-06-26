import { type DocMeta } from '@/lib/docs';
import { type DocGroupKey } from '@/lib/doc-classifier';
import { type SidebarAdCreative } from '@/config/affiliate-creatives';
import { type TocHeading } from '@/lib/toc';
import AuthorSidebarCard from '@/components/ui/AuthorSidebarCard';
import SidebarAdBanner from '@/components/ui/SidebarAdBanner';
import TableOfContents from '@/components/ui/TableOfContents';
import ExamQuestionNav from '@/components/ui/ExamQuestionNav';
import CategoryNavCard from '@/components/ui/CategoryNavCard/CategoryNavCard';
import PillarNavCard from '@/components/ui/PillarNavCard';

interface ArticleSidebarProps {
  readonly careerSidebarAd: { creative: SidebarAdCreative; trackLabel: string };
  readonly headings: TocHeading[];
  readonly category: DocMeta['category'];
  readonly docGroup: DocGroupKey;
  readonly slugStr: string;
  readonly sectionStr: string | undefined;
  readonly categoryArticles: DocMeta[];
  readonly hasCategoryNavCard: boolean;
  readonly showPillarNav: boolean;
}

/**
 * docs 記事の右サイドバー（PC ≥993px・sticky）。
 * 転職アフィリ枠（最上部・唯一のピクセル源）→ 運営者プロフィール → TOC/設問ナビ →
 * カテゴリナビ → ピラーナビ の順。note CTA は記事末尾へ集約したためサイドバーには出さない
 * （2026-06-26：最上部の転職インプレッションを確保）。
 */
export default function ArticleSidebar({
  careerSidebarAd,
  headings,
  category,
  docGroup,
  slugStr,
  sectionStr,
  categoryArticles,
  hasCategoryNavCard,
  showPillarNav,
}: ArticleSidebarProps) {
  return (
    <aside className="hidden zenn-desktop:block w-[300px] shrink-0 py-10">
      <div className="sticky top-6">
        {/* 転職アフィリエイトを全 docs サイドバー最上部に常設（唯一のピクセル発火源・ファーストビュー）。
            全 docs 無条件表示。creative を期間で出し分け（resolveCareerSidebarAd）。
            note CTA は記事末尾へ集約したため、最上部は転職枠が占める（2026-06-26）。 */}
        <div className="mb-3">
          <SidebarAdBanner {...careerSidebarAd.creative} trackLabel={careerSidebarAd.trackLabel} />
        </div>
        {/* 運営者プロフィール（合格体験者＝発注者）。転職枠の直下に置き E-E-A-T を提示（2026-06-26）。
            記事末尾の横型 AuthorCard とは別フォーマットの縦型で、カテゴリ hub と共通。 */}
        <div className="mb-3">
          <AuthorSidebarCard />
        </div>
        {/* 過去問ページ（CEM 択一=pastExam, 1級2級土木/コンクリート系=primary/secondary）は
            TOC が問番号の羅列になりナビゲーションとして機能しないため非表示にし、
            primary は代わりに設問番号グリッド（ExamQuestionNav）を出す。 */}
        {docGroup !== 'pastExam' && docGroup !== 'primary' && docGroup !== 'secondary' && (
          <TableOfContents headings={headings} />
        )}
        {docGroup === 'primary' && (
          <ExamQuestionNav headings={headings} variant="sidebar" />
        )}
        {hasCategoryNavCard && category && (
          <div className="mt-3">
            <CategoryNavCard
              variant="sidebar"
              category={category}
              currentSlug={slugStr}
              docGroup={docGroup}
              categoryArticles={categoryArticles}
            />
          </div>
        )}
        {showPillarNav && (
          <div className="mt-3">
            <PillarNavCard variant="sidebar" currentSection={sectionStr} />
          </div>
        )}
      </div>
    </aside>
  );
}

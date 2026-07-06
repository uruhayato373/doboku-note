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
 * docs 記事の右サイドバー（PC ≥993px）。
 *
 * 2 ブロック構成:
 *  1. 通常フロー（追従させない）: 転職アフィリ枠（最上部・唯一のピクセル源）→ note CTA →
 *     運営者プロフィール。広告・著者を追従させると「広告が追いかけてくる」体験になるため固定。
 *  2. sticky クラスタ（列の最終要素・読中に追従）: TOC / 設問ナビ → カテゴリナビ → ピラーナビ。
 *     ナビゲーションだけを追従させ、長記事でも導線が視界に残る。
 *
 * 経緯: 2026-06-27 に全体 sticky を解除（落ち着いた読書体験）→ 2026-07 に「TOC+ナビのみ」へ限定復活。
 * sticky クラスタの下に非 sticky を置くと下スクロールで届かなくなる（過去事故）ため、クラスタは末尾に置く。
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
  const hasStickyCluster =
    docGroup === 'pastExam' || docGroup === 'primary' || docGroup === 'secondary'
      ? docGroup === 'primary' || hasCategoryNavCard || showPillarNav
      : true;
  return (
    <aside className="hidden zenn-desktop:block w-[300px] shrink-0 py-10">
      {/* ブロック1: 通常フロー（追従させない）——転職ピクセル・note・著者 */}
      {/* 転職アフィリを全 docs サイドバー最上部に常設（唯一のピクセル発火源・ファーストビュー）。 */}
      <div className="mb-3">
        <SidebarAdBanner {...careerSidebarAd.creative} trackLabel={careerSidebarAd.trackLabel} />
      </div>
      {/* note CTA は記事末尾（footerMagazines＋footerMokuji）に一本集約する方針（2026-07-06）。
          読書中サイドバーへのもくじ再掲は撤去し、サイドバーは転職枠＋著者＋ナビに絞る。 */}
      {/* 運営者プロフィール（合格体験者＝発注者）。E-E-A-T を提示。 */}
      <div className="mb-3">
        <AuthorSidebarCard />
      </div>

      {/* ブロック2: sticky クラスタ（列の最終要素・読中に追従）——TOC/ナビのみ。
          自身をスクロール可能にし、低解像度でも見切れない（TOC 側の max-h は撤去し高さ制御をここへ一元化）。 */}
      {hasStickyCluster && (
        <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
          {/* 過去問ページ（pastExam / primary / secondary）は TOC が問番号の羅列になり機能しないため
              非表示にし、primary は代わりに設問番号グリッド（ExamQuestionNav）を出す。 */}
          {docGroup !== 'pastExam' && docGroup !== 'primary' && docGroup !== 'secondary' && (
            <TableOfContents headings={headings} />
          )}
          {docGroup === 'primary' && <ExamQuestionNav headings={headings} variant="sidebar" />}
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
      )}
    </aside>
  );
}

import { type DocMeta } from '@/lib/docs';
import { type DocGroupKey } from '@/lib/doc-classifier';
import { type SidebarAdCreative } from '@/config/affiliate-creatives';
import { type TocHeading } from '@/lib/toc';
import { type ResolvedHubCta } from '@/lib/hub-cta';
import AuthorSidebarCard from '@/components/ui/AuthorSidebarCard';
import SidebarAdBanner from '@/components/ui/SidebarAdBanner';
import HubCtaBanner from '@/components/ui/HubCtaBanner/HubCtaBanner';
import TableOfContents from '@/components/ui/TableOfContents';
import ExamQuestionNav from '@/components/ui/ExamQuestionNav';
import CategoryNavCard from '@/components/ui/CategoryNavCard/CategoryNavCard';
import PillarNavCard from '@/components/ui/PillarNavCard';

interface ArticleSidebarProps {
  readonly careerSidebarAd: { creative: SidebarAdCreative; trackLabel: string };
  /** もくじ（L2 索引）タイル。HUB 資格 & 非 career のとき非 null。記事末尾と同一もくじを PC 側で併掲。 */
  readonly sidebarMokuji: ResolvedHubCta | null;
  readonly headings: TocHeading[];
  readonly category: DocMeta['category'];
  readonly docGroup: DocGroupKey;
  readonly slugStr: string;
  readonly sectionStr: string | undefined;
  readonly categoryArticles: DocMeta[];
  readonly hasCategoryNavCard: boolean;
  readonly showPillarNav: boolean;
  readonly showTableOfContents: boolean;
}

/**
 * docs 記事の右サイドバー（PC ≥993px）。
 *
 * 2 ブロック構成:
 *  1. 通常フロー（追従させない）: 運営者プロフィール → 転職アフィリ枠（唯一のピクセル源）→
 *     note もくじタイル。広告・著者を追従させると「広告が追いかけてくる」体験になるため固定。
 *  2. sticky クラスタ（列の最終要素・読中に追従）: TOC / 設問ナビ → カテゴリナビ → ピラーナビ。
 *     ナビゲーションだけを追従させ、長記事でも導線が視界に残る。
 *
 * 経緯: 2026-06-27 に全体 sticky を解除（落ち着いた読書体験）→ 2026-07 に「TOC+ナビのみ」へ限定復活。
 * sticky クラスタの下に非 sticky を置くと下スクロールで届かなくなる（過去事故）ため、クラスタは末尾に置く。
 * note もくじタイル: 2026-07-06 に一旦撤去したが全ページ統一の一環で復活（記事末尾と同一もくじを PC で併掲・
 * utm -docs-sb で面分離）。sidebarMokuji が null（非 HUB 資格・career）のときは枠ごと非表示。
 */
export default function ArticleSidebar({
  careerSidebarAd,
  sidebarMokuji,
  headings,
  category,
  docGroup,
  slugStr,
  sectionStr,
  categoryArticles,
  hasCategoryNavCard,
  showPillarNav,
  showTableOfContents,
}: ArticleSidebarProps) {
  const hasStickyCluster =
    docGroup === 'pastExam' || docGroup === 'primary' || docGroup === 'secondary'
      ? docGroup === 'primary' || hasCategoryNavCard || showPillarNav
      : true;
  return (
    // 根の <aside> 要素・幅（w-[316px]）・表示制御（≥993px）・py-10 は TwoColumnShell が所有する。
    // ここは中身のみを返す（aside 入れ子の意味論を回避）。
    <>
      {/* ブロック1: 通常フロー（追従させない）——著者・転職ピクセル・note。
          読者への信頼提示を先に置き、ファーストビューの商業要素を減らす。 */}
      <div className="mb-3">
        <AuthorSidebarCard />
      </div>
      <div className="mb-3">
        <SidebarAdBanner {...careerSidebarAd.creative} trackLabel={careerSidebarAd.trackLabel} />
      </div>
      {/* note もくじタイル（L2 索引）。HUB 資格の全 docs ページで記事末尾と併掲（全ページ統一・2026-07）。
          非 HUB 資格（一次・concrete・reference）と career タグ記事は sidebarMokuji=null で非表示。 */}
      {sidebarMokuji && (
        <div className="mb-3">
          <HubCtaBanner cta={sidebarMokuji} placement="article-sidebar" />
        </div>
      )}
      {/* ブロック2: sticky クラスタ（列の最終要素・読中に追従）——TOC/ナビのみ。
          自身をスクロール可能にし、低解像度でも見切れない（TOC 側の max-h は撤去し高さ制御をここへ一元化）。 */}
      {hasStickyCluster && (
        <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
          {/* 年度別過去問は TOC が問番号の羅列になるため呼び出し側で showTableOfContents=false。
              primary は代わりに設問番号グリッド（ExamQuestionNav）を出す。 */}
          {showTableOfContents && (
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
    </>
  );
}

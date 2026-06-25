import { type DocMeta } from '@/lib/docs';
import { type DocGroupKey } from '@/lib/doc-classifier';
import { type NoteMagazine } from '@/lib/note-magazines';
import { type PlacementSlot } from '@/lib/magazine-placement';
import { type SidebarAdCreative } from '@/config/affiliate-creatives';
import { type TocHeading } from '@/lib/toc';
import MagazineSidebarCard from '@/components/ui/MagazineSidebarCard';
import SidebarMagazineList from '@/components/ui/SidebarMagazineList';
import AuthorSidebarCard from '@/components/ui/AuthorSidebarCard';
import SidebarAdBanner from '@/components/ui/SidebarAdBanner';
import TableOfContents from '@/components/ui/TableOfContents';
import ExamQuestionNav from '@/components/ui/ExamQuestionNav';
import CategoryNavCard from '@/components/ui/CategoryNavCard/CategoryNavCard';
import PillarNavCard from '@/components/ui/PillarNavCard';

interface ArticleSidebarProps {
  readonly sidebarMagazines: ReadonlyArray<{ slot: PlacementSlot; magazine: NoteMagazine }>;
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
 * docs 記事の右サイドバー（PC ≥993px・sticky）。docs/[...slug]/page.tsx から抽出。
 * note CTA（sidebar）→ 転職アフィリ枠 → TOC/設問ナビ → カテゴリナビ → ピラーナビ の順。
 * 構成・条件は抽出前と不変。
 */
export default function ArticleSidebar({
  sidebarMagazines,
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
        {/* note 有料マガジン CTA (sidebar)。配置解決済みのマガジンを画像オンリーで上部に並べる。
            文言・価格はバナー画像 (sidebarImageUrl, 300×250) に焼き込む方針。カテゴリ hub と共通の
            SidebarMagazineList に集約（2026-06-26）。 */}
        <SidebarMagazineList magazines={sidebarMagazines} />
        {/* 汎用キーワードページ (個別キーワード辞書ページ): 単一マガジン直送ではなく
            note 有料教材まとめ /links へ誘導する画像バナー。hub/essay 等は上の
            コンテキスト一致マガジンが出るため、ここは sidebarMagazines 空のときのみ。 */}
        {category === 'pe-comprehensive-management' &&
          (docGroup === 'keyword' || docGroup === 'guide' || docGroup === 'pastExam') &&
          sidebarMagazines.length === 0 && (
            <div className="mb-3">
              <MagazineSidebarCard
                href="/links"
                imageUrl="/images/magazines/links-hub-sidebar.webp"
                alt="note 有料教材まとめ"
                external={false}
                trackLabel="links-hub"
              />
            </div>
          )}
        {/* 転職アフィリエイトを全 docs サイドバー上部に常設（位置 A: note CTA の下・既存アフィリの上）。
            全 docs 無条件表示。creative を期間で出し分け（resolveCareerSidebarAd）。
            この 1 枠が当該案件の唯一のピクセル発火源（本文インライン CareerAffiliate は href のみ）。 */}
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

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import { getAllCategories, getCategoryBySlug } from '@/lib/categories';
import { getDocsMetaByCategory } from '@/lib/docs';
import { groupDocs } from '@/lib/category-groups';
import { DocCard, DocSection } from '@/components/category/CategorySections';
import { PopularShowcase, PopularRanking } from '@/components/category/PopularSections';
import { getPopularDocs } from '@/lib/popular';
import {
  CivilConstruction1View,
  CivilConstruction2View,
  PeFirstStageView,
  PeComprehensiveView,
  PeConstructionView,
} from '@/components/category/CategoryViews';
import SidebarMagazineList from '@/components/ui/SidebarMagazineList';
import AuthorSidebarCard from '@/components/ui/AuthorSidebarCard';
import { resolveCategoryMagazines } from '@/lib/magazine-placement';
import { getMagazine } from '@/lib/note-magazines';
import SidebarAdBanner from '@/components/ui/SidebarAdBanner';
import { resolveCategoryCareerAd } from '@/config/affiliate-creatives';

export async function generateStaticParams() {
  const categories = getAllCategories();
  return categories.map(cat => ({
    slug: cat.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) {
    return {
      title: 'カテゴリが見つかりません',
    };
  }
  // SEO description は cat.description（50〜160 文字）を優先、未指定なら subtitle に fallback。
  // UI の <p> は subtitle を使うため、SEO 用の description と分離している。
  return {
    title: cat.label,
    description: cat.description ?? cat.subtitle,
  };
}

// グループ化レイアウトを持つカテゴリ（持たないものは従来どおりフラットグリッド）。
const GROUPED_CATEGORIES = new Set([
  'civil-construction-1',
  'civil-construction-2',
  'pe-comprehensive-management',
  'pe-first-stage',
  'concrete-chief-engineer',
  'concrete-diagnostician',
  'pe-construction',
]);

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);

  if (!cat) {
    notFound();
  }

  const allDocs = await getDocsMetaByCategory(slug);
  const docs = allDocs.filter(d => d.published !== false && !d.tags?.includes('模範論文') && !d.hideFromCategory);

  const groups = GROUPED_CATEGORIES.has(slug) ? groupDocs(docs, slug) : null;

  // よく読まれている記事（GA4 実アクセス上位・直近 28 日）。特集ショーケース top3 ＋ サイドバー人気ランキング top5。
  // 計測実績のある記事のみ・データ未生成や該当なしは空配列＝各コンポーネントで graceful 非表示。
  const popularDocs = getPopularDocs(docs, 5);

  // note 有料マガジン CTA（カテゴリ hub 用・文脈一致）。公開済みのみ残す（防御的）。
  const categoryMagazines = resolveCategoryMagazines(slug)
    .map((s) => ({ slot: s, magazine: getMagazine(s.magazineId) }))
    .filter((x): x is { slot: typeof x.slot; magazine: NonNullable<typeof x.magazine> } => Boolean(x.magazine));

  // 転職アフィリ（資格別セグメント）。PC は右サイドバー上部に sticky 配置してファーストビュー内で
  // インプレッションを確保し、モバイルは本文 1 セクション目の直後に visible 配置する（記事到達を阻害しない）。
  // ピクセルは PC サイドバー側のみ発火させ「1 ページ 1 ピクセル」を厳守（モバイルは href のみ）。
  // creative は資格層に合わせて出し分け（civil=施工管理系 BuildJob/GKS、pe=ハイクラス DX/コンサル）。
  // 戻り値 null＝転職枠なし（concrete / pe-construction / pe-first-stage は単一カラム）。
  const careerSidebar = resolveCategoryCareerAd(slug);
  // 右サイドバー（PC・≥993px）は「note 有料マガジン CTA」または「転職枠」のどちらかがあれば出す。
  // note CTA は冒頭全幅グリッドから PC 右サイドバーへ集約し、モバイルは記事一覧の下に出す（2026-06-20）。
  // サイドバーは縦積みのため上位 3 マガジン（placement 優先順）に絞ってコンパクトに保つ。
  const hubMagazines = categoryMagazines.slice(0, 3);
  // モバイル本文中の visible バナー（pixelSrc を渡さない＝PC サイドバー側が唯一の発火源）。
  const mobileCareerAd = careerSidebar ? (
    <div className="zenn-desktop:hidden my-10">
      <SidebarAdBanner
        href={careerSidebar.creative.href}
        imageSrc={careerSidebar.creative.imageSrc}
        alt={careerSidebar.creative.alt}
        width={careerSidebar.creative.width}
        height={careerSidebar.creative.height}
        trackLabel={careerSidebar.trackLabel}
      />
    </div>
  ) : null;

  return (
    <PageShell variant="article">
        {/* カテゴリ本文 + 右サイドバー（PC ≥993px・常に 2 カラム）。サイドバーは上から
            転職アフィリ（SidebarAdBanner＝当ページ唯一のピクセル源）→ 運営者プロフィール →
            人気記事 → note マガジン CTA を配置。note CTA はモバイルでは記事一覧の下に出す。
            カテゴリ見出しは全幅ヒーロー帯を廃し、左カラム上部にコンパクト配置（2026-06-26）。
            これにより右サイドバー（転職枠）がファーストビューへ繰り上がる。 */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 flex gap-8 relative">
          <main className="flex-1 min-w-0">
            {/* カテゴリ見出し（縮小版・H1/パンくず/説明は SEO のため維持。CATEGORY チップは
                パンくずと重複のため削除） */}
            <div className="pt-8 sm:pt-10 pb-5 border-b border-[var(--rule-soft)]">
              <nav aria-label="breadcrumb" className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-widest mb-2 flex items-center gap-2">
                <Link href="/" className="hover:text-[var(--accent)] transition-colors">Home</Link>
                <span aria-hidden className="opacity-60">›</span>
                <span>Category</span>
              </nav>
              <h1 className="font-serif font-bold tracking-tight text-[var(--ink)] text-[24px] sm:text-[28px] leading-[1.3] mb-2">
                {cat.label}
              </h1>
              <p className="text-[15px] leading-[1.8] text-[var(--ink-body)] max-w-[60ch]">{cat.subtitle}</p>
              <div className="mt-3 flex gap-4 flex-wrap font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
                <span>{docs.length.toLocaleString()} docs</span>
              </div>
            </div>
            <div className="pt-8 sm:pt-10 pb-10 sm:pb-12 text-[17px] leading-[1.9]">
          {/* よく読まれている記事 特集（GA4 上位 top3・グループ別セクションの上）。データ無しなら描画されない。 */}
          {popularDocs.length > 0 && (
            <div className="mb-16">
              <PopularShowcase items={popularDocs.slice(0, 3)} />
            </div>
          )}
          {docs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                このカテゴリにはまだコンテンツがありません。
              </p>
            </div>
          ) : groups ? (
            <div className="space-y-16">
              {slug === 'civil-construction-1' ? (
                <CivilConstruction1View groups={groups} mobileCareerAd={mobileCareerAd} />
              ) : slug === 'civil-construction-2' ? (
                <CivilConstruction2View groups={groups} mobileCareerAd={mobileCareerAd} />
              ) : slug === 'pe-first-stage' ? (
                <PeFirstStageView groups={groups} />
              ) : slug === 'pe-comprehensive-management' ? (
                <PeComprehensiveView groups={groups} mobileCareerAd={mobileCareerAd} />
              ) : slug === 'pe-construction' ? (
                <PeConstructionView groups={groups} />
              ) : (
                groups.map(group => (
                  <DocSection key={group.title} group={group} />
                ))
              )}
            </div>
          ) : (
            /* Default flat grid for other categories */
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {docs.map(doc => (
                <DocCard key={doc.slug} doc={doc} />
              ))}
            </div>
          )}
            </div>

            {/* note 有料マガジン CTA（モバイル＜993px のみ・画像オンリーに統一）。PC は右サイドバーへ集約。
                サイドバー非表示のモバイルでは記事一覧の下にフォールバック表示する。 */}
            <div className="zenn-desktop:hidden pb-10 mx-auto max-w-sm">
              <SidebarMagazineList magazines={hubMagazines} className="space-y-3" />
            </div>
          </main>

          <aside className="hidden zenn-desktop:block w-[300px] shrink-0 py-10 sm:py-12">
              {/* 2026-06-27 sticky 解除: 読中に広告/著者/ランキングを追従させない */}
              <div className="space-y-3">
                {/* 転職アフィリ（PC 右サイドバー最上部・sticky）。当ページ唯一のピクセル発火源。
                    ファーストビュー内でインプレッションを最大化するため最上部に置く（2026-06-26 並べ替え）。
                    creative は resolveCareerSidebarAd で期間出し分け（〜2026-08-31 ビルドジョブ / 以降 GKS）。 */}
                {careerSidebar && (
                  <SidebarAdBanner
                    {...careerSidebar.creative}
                    trackLabel={careerSidebar.trackLabel}
                  />
                )}
                {/* 運営者プロフィール（合格体験者＝発注者）。転職枠の直下に置き E-E-A-T を提示（2026-06-26）。 */}
                <AuthorSidebarCard />
                {/* 人気記事ランキング（GA4 上位 top5・直近 28 日）。データ無しなら描画されない。 */}
                <PopularRanking items={popularDocs} />
                {/* note 有料マガジン CTA（文脈一致・画像オンリー）。回遊導線（人気記事）の下、
                    スクロール下部に配置して訴求する（2026-06-26 並べ替え：旧 最上部 → 最下部）。
                    docs サイドバーと共通の SidebarMagazineList。未公開マガジンは getMagazine で除外済み。 */}
                <SidebarMagazineList magazines={hubMagazines} className="space-y-3" />
              </div>
            </aside>
        </div>
    </PageShell>
  );
}

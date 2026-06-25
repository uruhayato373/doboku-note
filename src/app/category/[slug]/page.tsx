import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getAllCategories, getCategoryBySlug } from '@/lib/categories';
import { getDocsMetaByCategory } from '@/lib/docs';
import { groupDocs } from '@/lib/category-groups';
import { DocCard, DocSection } from '@/components/category/CategorySections';
import {
  CivilConstruction1View,
  CivilConstruction2View,
  PeFirstStageView,
  PeComprehensiveView,
  PeConstructionView,
} from '@/components/category/CategoryViews';
import MagazineInlineCard from '@/components/ui/MagazineInlineCard';
import MagazineSidebarPromoCard from '@/components/ui/MagazineSidebarPromoCard';
import { resolveCategoryMagazines } from '@/lib/magazine-placement';
import { getMagazine, buildMagazineUrl } from '@/lib/note-magazines';
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
  const hasSidebar = Boolean(careerSidebar) || hubMagazines.length > 0;
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
    <div className="min-h-screen flex flex-col bg-[var(--bg)] transition-colors duration-300">
      <Header />

      <main className="flex-grow">
        {/* Category Header — editorial */}
        <div className="border-b border-[var(--rule-soft)] py-10 sm:py-12 px-4 sm:px-6 lg:px-10 bg-[var(--paper)]">
          <div className="max-w-[1280px] mx-auto">
            <nav aria-label="breadcrumb" className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
              <Link href="/" className="hover:text-[var(--accent)] transition-colors">Home</Link>
              <span aria-hidden className="opacity-60">›</span>
              <span>Category</span>
            </nav>
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] px-2.5 py-1 bg-[var(--accent-fill)] rounded-full mb-4">
              CATEGORY
            </div>
            <h1 className="font-serif font-black tracking-tight text-[var(--ink)] text-[32px] sm:text-[40px] md:text-[48px] leading-[1.2] mb-3">
              {cat.label}
            </h1>
            <p className="text-[16px] leading-[1.9] text-[var(--ink-body)] max-w-[60ch]">{cat.subtitle}</p>
            <div className="mt-5 flex gap-4 flex-wrap font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
              <span>{docs.length.toLocaleString()} docs</span>
            </div>
          </div>
        </div>

        {/* カテゴリ本文 + 右サイドバー。note CTA（hub・文脈一致）または転職枠があれば 2 カラム化し、
            PC（≥993px）右サイドバー上部に note マガジン CTA、その下に転職アフィリ（SidebarAdBanner＝
            当ページ唯一のピクセル源）を sticky 配置。note CTA はモバイルでは記事一覧の下に出す。
            note CTA も転職枠も無いカテゴリは従来どおり単一カラム（flex 子 1 つ＝全幅）。 */}
        <div className={hasSidebar
          ? 'max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 flex gap-8 relative'
          : 'max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10'}>
          <div className="flex-1 min-w-0">
            <div className="py-10 sm:py-12 text-[17px] leading-[1.9]">
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

            {/* note 有料マガジン CTA（モバイル＜993px のみ）。PC は右サイドバーへ集約するため、
                サイドバー非表示のモバイルでは記事一覧の下にフォールバック表示する。 */}
            {hubMagazines.length > 0 && (
              <div className="zenn-desktop:hidden pb-10 grid gap-3 sm:grid-cols-2">
                {hubMagazines.map(({ slot, magazine }) => (
                  <MagazineInlineCard
                    key={slot.magazineId}
                    url={buildMagazineUrl(magazine, slot.utmContent)}
                    title={magazine.title}
                    description={magazine.description}
                    imageUrl={magazine.imageUrl}
                    badge={magazine.badge}
                    trackLabel={slot.utmContent}
                  />
                ))}
              </div>
            )}
          </div>

          {hasSidebar && (
            <aside className="hidden zenn-desktop:block w-[300px] shrink-0 py-10 sm:py-12">
              <div className="sticky top-6 space-y-3">
                {/* note 有料マガジン CTA（PC 右サイドバー上部・文脈一致）。試験単位の旗艦商品を提示する。
                    冒頭全幅グリッドから集約（2026-06-20）。未公開マガジンは getMagazine で除外済み。 */}
                {hubMagazines.map(({ slot, magazine }) => (
                  <MagazineSidebarPromoCard
                    key={slot.magazineId}
                    url={buildMagazineUrl(magazine, slot.utmContent)}
                    title={magazine.title}
                    description={magazine.description}
                    imageUrl={magazine.imageUrl}
                    badge={magazine.badge}
                    trackLabel={slot.utmContent}
                  />
                ))}
                {/* 転職アフィリ（PC 右サイドバー・sticky）。当ページ唯一のピクセル発火源。
                    creative は resolveCareerSidebarAd で期間出し分け（〜2026-08-31 ビルドジョブ / 以降 GKS）。 */}
                {careerSidebar && (
                  <SidebarAdBanner
                    {...careerSidebar.creative}
                    trackLabel={careerSidebar.trackLabel}
                  />
                )}
              </div>
            </aside>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

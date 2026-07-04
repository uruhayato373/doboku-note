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
  ConcreteView,
  PeFirstStageView,
  PeComprehensiveView,
  PeConstructionView,
} from '@/components/category/CategoryViews';
import SidebarMagazineList from '@/components/ui/SidebarMagazineList';
import MagazineCard from '@/components/ui/MagazineCard/MagazineCard';
import AuthorSidebarCard from '@/components/ui/AuthorSidebarCard';
import { resolveCategoryMagazines, resolveSeasonalHubMagazine } from '@/lib/magazine-placement';
import { getMagazine } from '@/lib/note-magazines';
import SidebarAdBanner from '@/components/ui/SidebarAdBanner';
import { resolveCategoryCareerAds } from '@/config/affiliate-creatives';

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

  // 転職アフィリ（資格別セグメント）。カテゴリ hub は **両方表示（show-both）**: civil/建設部門は
  // 建設JOBs（登録 ¥4,500）＋ビルドジョブ（面談 ¥50,000）の補完 2 案件を出し、読者に選ばせる。
  // PC は右サイドバーに縦積み、モバイルは記事カードの隙間（グループ境界）に配置して可視化する。
  // ピクセルは PC サイドバー側のみ発火（モバイルは href のみ）＝各プログラム 1 ピクセルずつ。
  // 戻り値 []＝転職枠なし（concrete / pe-first-stage は単一カラム）。記事ページは別途 A/B（直交）。
  const careerAds = resolveCategoryCareerAds(slug);
  // 右サイドバー（PC・≥993px）は「note 有料マガジン CTA」または「転職枠」のどちらかがあれば出す。
  // note CTA は冒頭全幅グリッドから PC 右サイドバーへ集約し、モバイルは記事一覧の下に出す（2026-06-20）。
  // サイドバーは縦積みのため上位 3 マガジン（placement 優先順）に絞ってコンパクトに保つ。
  const hubMagazines = categoryMagazines.slice(0, 3);
  // 本文フロー用の季節モード CTA（試験日前=直前商品／後=旗艦・ビルド時確定）。sidebar とは別枠。
  const seasonalHub = resolveSeasonalHubMagazine(slug);
  // モバイル本文中の visible バナー（pixelSrc を渡さない＝PC サイドバー側が唯一の発火源）。
  // 各案件を 1 枚ずつの node にしてビューのグループ境界に分散配置する（カードの隙間に「両方」）。
  const mobileCareerAds = careerAds.map((ad, i) => (
    <div key={ad.trackLabel + i} className="zenn-desktop:hidden my-10">
      <SidebarAdBanner
        href={ad.creative.href}
        imageSrc={ad.creative.imageSrc}
        alt={ad.creative.alt}
        width={ad.creative.width}
        height={ad.creative.height}
        trackLabel={ad.trackLabel}
      />
    </div>
  ));

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
          {/* 季節モード note CTA（本文フロー・最大送客源のカテゴリ hub を最適化）。直前期は直前商品、
              試験日以降は旗艦へビルド時に自動切替。未公開なら MagazineCard が null を返す（防御）。 */}
          {seasonalHub && (
            <div className="mb-16 max-w-2xl">
              <MagazineCard id={seasonalHub.magazineId} utmContent={seasonalHub.utmContent} />
            </div>
          )}
          {docs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--ink-muted)] text-lg">
                このカテゴリにはまだコンテンツがありません。
              </p>
            </div>
          ) : groups ? (
            <div className="space-y-16">
              {slug === 'civil-construction-1' ? (
                <CivilConstruction1View groups={groups} mobileCareerAds={mobileCareerAds} />
              ) : slug === 'civil-construction-2' ? (
                <CivilConstruction2View groups={groups} mobileCareerAds={mobileCareerAds} />
              ) : slug === 'pe-first-stage' ? (
                <PeFirstStageView groups={groups} />
              ) : slug === 'pe-comprehensive-management' ? (
                <PeComprehensiveView groups={groups} mobileCareerAds={mobileCareerAds} />
              ) : slug === 'pe-construction' ? (
                <PeConstructionView groups={groups} />
              ) : slug === 'concrete-chief-engineer' || slug === 'concrete-diagnostician' ? (
                <ConcreteView groups={groups} />
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
                {/* 転職アフィリ（PC 右サイドバー最上部）。当ページのピクセル発火源（各プログラム 1 回ずつ）。
                    civil/建設部門は 建設JOBs＋ビルドジョブ の両方を縦積み（show-both）、総監は DX 単独。
                    creative は resolveCategoryCareerAds が解決（建設JOBs ＋ resolveCareerSidebarAd の期間出し分け）。 */}
                {careerAds.map((ad, i) => (
                  <SidebarAdBanner
                    key={ad.trackLabel + i}
                    {...ad.creative}
                    trackLabel={ad.trackLabel}
                  />
                ))}
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

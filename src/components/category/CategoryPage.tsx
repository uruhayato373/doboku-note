import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import { getCategoryBySlug, getCategoryHubPath } from '@/lib/categories';
import { getDocsMetaByCategory } from '@/lib/docs';
import HubStructuredData from '@/components/seo/HubStructuredData';
import { groupDocs } from '@/lib/category-groups';
import { DocCard, DocSection } from '@/components/category/CategorySections';
import { PopularShowcase, PopularRanking } from '@/components/category/PopularSections';
import { getPopularDocs } from '@/lib/popular';
import {
  CivilConstruction1View,
  CivilConstruction2View,
  ConcreteView,
  PracticeView,
  PeFirstStageView,
  PeComprehensiveView,
  PeConstructionView,
} from '@/components/category/CategoryViews';
import HubCtaBanner from '@/components/ui/HubCtaBanner/HubCtaBanner';
import AuthorSidebarCard from '@/components/ui/AuthorSidebarCard';
import { resolveHubCta } from '@/lib/hub-cta';
import { resolveOffsiteCta } from '@/lib/offsite-cta';
import OffsiteCta from '@/components/ui/OffsiteCta/OffsiteCta';
import SidebarAdBanner from '@/components/ui/SidebarAdBanner';
import { pixelFor, resolvePlacements } from '@/lib/affiliate-placement';
import CategoryJumpNav from '@/components/category/CategoryJumpNav';
import CategoryStudyNav from '@/components/category/CategoryStudyNav';
import { SidebarProduct } from '@/components/ui/SidebarDiscovery';
import { ConcreteEngineerStudy, ConcreteEngineerProduct, ConcreteEngineerRelated } from '@/components/category/ConcreteEngineerResources';

// グループ化レイアウトを持つカテゴリ（持たないものは従来どおりフラットグリッド）。
const GROUPED_CATEGORIES = new Set([
  'civil-construction-1',
  'civil-construction-2',
  'civil-practice',
  'pe-comprehensive-management',
  'pe-first-stage',
  'concrete-engineer',
  'concrete-chief-engineer',
  'concrete-diagnostician',
  'pe-construction',
  'rccm',
  'surveyor',
  'pavement',
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

  // 転職アフィリ（資格別セグメント）。PC は右サイドバー、モバイルは記事カードの隙間（グループ境界）に置く。
  // どの案件を出すかは config/affiliate-placements.json のルール（資格トップのサイドバーとモバイルに 1 枠ずつ）。
  // ピクセルは PC サイドバー側だけ（cta-placements の pixelPriority。モバイルは href のみ）。
  const placements = resolvePlacements({ pageKind: 'category', category: slug });
  const sidebarAd = placements['category-sidebar'] ?? null;
  const mobileAd = placements['category-mobile'] ?? null;
  const sidebarPixel = pixelFor(placements, sidebarAd ? ['category-sidebar'] : []);
  // note CTA（資格別リッチ背景×HTML文字）。幅広面はもくじへ集約、直前期は特定商品へ直リンク。
  // 本文・PC サイドバー・モバイルの 3 面に同一内容を出し、utm で面分離する（旧 上位3誌直リンクを廃止し
  // 「もくじ集約」に一本化・2026-07）。HUB 非対応資格（concrete/一次）は null → 非表示。
  // note もくじ CTA は面ごとに 1 つずつ（重複回避）: PC=右サイドバー（hubCtaSidebar）／モバイル=見出し直後
  // （hubCtaMobile）。2026-07-06 は「記事一覧の手前に販売タイルを割り込ませない」で最下部に置いたが、
  // SNS から着地する入口でスマホの note 導線が最下部（86〜89%）・転職広告が先になっていたため、
  // 2026-09-27（DN-0364）に見出し直後へ移した。utm で面分離。
  const hubCtaSidebar = resolveHubCta(slug, { utmSuffix: 'sb' });
  const hubCtaMobile = resolveHubCta(slug, { utmSuffix: 'mob' });
  // ココナラ（自社出品・A8 経由）。記事末尾と同じ部品で、資格トップでは見出し直後に出す。
  const offsiteCta = resolveOffsiteCta(slug);
  // モバイル本文中の visible バナー（pixelSrc を渡さない＝PC サイドバー側が唯一の発火源）。
  // 各案件を 1 枚ずつの node にしてビューのグループ境界に分散配置する（カードの隙間に「両方」）。
  const mobileCareerAds = mobileAd
    ? [
        <div key={mobileAd.ruleId} className="zenn-desktop:hidden my-10">
          <SidebarAdBanner
            href={mobileAd.banner.href}
            imageSrc={mobileAd.banner.imageSrc}
            alt={mobileAd.banner.alt}
            width={mobileAd.banner.width}
            height={mobileAd.banner.height}
            trackLabel={mobileAd.trackLabel}
            placement="category-mobile"
          />
        </div>,
      ]
    : [];

  // 右サイドバー（PC ≥993px・TwoColumnShell の aside prop へ渡す）。上から
  // 技士は学習→教材→関連リンクを先頭にまとめる。他資格は演習・復習ナビ。
  // 転職アフィリ（当ページ唯一のピクセル発火源・各プログラム 1 回ずつ）→
  // 運営者プロフィール（E-E-A-T）→ note もくじ CTA（PC 唯一の note 面・utm -sb）→ 人気記事ランキング。
  const categorySidebar = (
    <div className="space-y-3">
      {slug === 'concrete-engineer' ? <>
        <ConcreteEngineerStudy />
        <ConcreteEngineerProduct placement="category-sidebar" />
        <ConcreteEngineerRelated />
      </> : <CategoryStudyNav category={slug} />}
      {slug !== 'concrete-engineer' && !hubCtaSidebar && <SidebarProduct category={slug} placement="category-sidebar" />}
      {sidebarAd && (
        <SidebarAdBanner
          href={sidebarAd.banner.href}
          imageSrc={sidebarAd.banner.imageSrc}
          alt={sidebarAd.banner.alt}
          width={sidebarAd.banner.width}
          height={sidebarAd.banner.height}
          pixelSrc={sidebarPixel?.slot === 'category-sidebar' ? sidebarPixel.pixelSrc : undefined}
          trackLabel={sidebarAd.trackLabel}
          placement="category-sidebar"
        />
      )}
      <AuthorSidebarCard />
      {hubCtaSidebar && <HubCtaBanner cta={hubCtaSidebar} placement="category-sidebar" />}
      <PopularRanking items={popularDocs} />
    </div>
  );

  return (
    <PageShell variant="article">
        <HubStructuredData path={getCategoryHubPath(slug)} name={cat.label} description={cat.description ?? cat.subtitle} docs={docs} />
        {/* 学習の入口を本文と右列の先頭に置く。note CTA はモバイルでは記事一覧の下に表示。 */}
        <TwoColumnShell gutter="default" mainClassName="pt-8 sm:pt-10 pb-10" aside={categorySidebar}>
            {/* 左メインカラム全体を 1 枚の白カードに統一（グレー地に白サーフェス・角丸ゼロの
                エディトリアル面）。見出し・人気記事・各セクションを同一カード内に載せ、内側は
                リスト/テーブル/フラットタイルで構成してカード内カードを避ける（2026-07 A-1）。 */}
            <div className="card-surface-section px-5 sm:px-8 lg:px-10 pb-8 sm:pb-10">
            {/* カテゴリ見出し（縮小版・H1/パンくず/説明は SEO のため維持。CATEGORY チップは
                パンくずと重複のため削除） */}
            <div className="pt-6 sm:pt-8 pb-5 border-b border-(--rule-soft)">
              <nav aria-label="breadcrumb" className="font-mono text-[11px] text-(--ink-muted) uppercase tracking-widest mb-2 flex items-center gap-2">
                <Link href="/" className="hover:text-(--accent) transition-colors">Home</Link>
                <span aria-hidden className="opacity-60">›</span>
                <span>Category</span>
              </nav>
              <h1 className="font-serif font-bold tracking-tight text-(--ink) text-[24px] sm:text-[28px] leading-[1.3] mb-2">
                {cat.label}
              </h1>
              <p className="text-[15px] leading-[1.8] text-(--ink-body) max-w-[60ch]">{cat.subtitle}</p>
            </div>
            <CategoryJumpNav category={slug} />
            {hubCtaMobile && (
              <div className="zenn-desktop:hidden mt-6 mx-auto max-w-[360px]">
                <HubCtaBanner cta={hubCtaMobile} placement="category-mobile" />
              </div>
            )}
            <OffsiteCta items={offsiteCta} heading="この資格に関連するサービス" />
            {slug === 'reference-materials' && (
              <section className="border-b border-(--rule-soft) py-6" aria-labelledby="reference-materials-about">
                <h2 id="reference-materials-about" className="font-serif text-[20px] font-bold text-(--ink)">
                  公的資料を実務判断に使いやすく整理
                </h2>
                <p className="mt-2 max-w-[65ch] text-[14px] leading-[1.9] text-(--ink-body)">
                  国土交通省・地方整備局・自治体が公開する設計便覧や土木工事共通仕様書から、設計・施工時に確認しやすい規定を資料別に整理しています。原典の代替ではなく、該当箇所を探すための索引として利用し、最終判断では各発注機関が公開する最新版の原文と適用条件を確認してください。
                </p>
              </section>
            )}
            <div className="pt-8 text-[17px] leading-[1.9]">
          {docs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-(--ink-muted) text-lg">
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
                <PeFirstStageView groups={groups} mobileCareerAds={mobileCareerAds} />
              ) : slug === 'pe-comprehensive-management' ? (
                <PeComprehensiveView groups={groups} mobileCareerAds={mobileCareerAds} />
              ) : slug === 'pe-construction' ? (
                <PeConstructionView groups={groups} mobileCareerAds={mobileCareerAds} />
              ) : slug === 'concrete-engineer' || slug === 'concrete-chief-engineer' || slug === 'concrete-diagnostician' || slug === 'rccm' || slug === 'surveyor' || slug === 'pavement' ? (
                <ConcreteView groups={groups} mobileCareerAds={mobileCareerAds} />
              ) : slug === 'civil-practice' ? (
                <PracticeView groups={groups} mobileCareerAds={mobileCareerAds} />
              ) : (
                <>
                  {groups.map(group => (
                    <DocSection key={group.title} group={group} />
                  ))}
                  {/* 専用ビューの無い資格（建築など）もモバイルの転職枠を出す（2026-10-07・EXP-018） */}
                  {mobileCareerAds}
                </>
              )}
            </div>
          ) : (
            /* Default flat grid for other categories */
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {docs.map(doc => (
                  <DocCard key={doc.slug} doc={doc} />
                ))}
              </div>
              {mobileCareerAds}
            </>
          )}
            {popularDocs.length > 0 && (
              <div className="mt-10"><PopularShowcase items={popularDocs.slice(0, 2)} /></div>
            )}
            </div>
            </div>

            {slug === 'concrete-engineer' && <div className="zenn-desktop:hidden mt-8 space-y-3">
              <ConcreteEngineerProduct placement="category-mobile" />
              <ConcreteEngineerRelated />
            </div>}
            {slug !== 'concrete-engineer' && !hubCtaMobile && <div className="zenn-desktop:hidden mt-8"><SidebarProduct category={slug} placement="category-mobile" /></div>}
        </TwoColumnShell>
    </PageShell>
  );
}

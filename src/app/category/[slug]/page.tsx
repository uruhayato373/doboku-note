import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/lib/metadata';
import PageShell from '@/components/layout/PageShell';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
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
import HubCtaBanner from '@/components/ui/HubCtaBanner/HubCtaBanner';
import AuthorSidebarCard from '@/components/ui/AuthorSidebarCard';
import { resolveHubCta } from '@/lib/hub-cta';
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
  // self canonical / og:url を必ず設定する（root 継承事故の防止）。title はテンプレート
  // "%s | doboku-note" を活かすため absolute にしない。
  return buildPageMetadata({
    title: cat.label,
    description: cat.description ?? cat.subtitle,
    path: `/category/${slug}`,
  });
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

  // 転職アフィリ（資格別セグメント）。カテゴリ hub は **両方表示（show-both）**: civil/建設部門は
  // 建設JOBs（登録 ¥4,500）＋ビルドジョブ（面談 ¥50,000）の補完 2 案件を出し、読者に選ばせる。
  // PC は右サイドバーに縦積み、モバイルは記事カードの隙間（グループ境界）に配置して可視化する。
  // ピクセルは PC サイドバー側のみ発火（モバイルは href のみ）＝各プログラム 1 ピクセルずつ。
  // 戻り値 []＝転職枠なし（総監以外の非建設カテゴリのみ）。civil/建設部門/concrete/pe-first-stage は
  // 建設業界読者ゆえ [建設JOBs, BuildJob/GKS] を返す（2026-07-06 拡大）。記事ページは別途 A/B（直交）。
  const careerAds = resolveCategoryCareerAds(slug);
  // note CTA（資格別リッチ背景×HTML文字）。幅広面はもくじへ集約、直前期は特定商品へ直リンク。
  // 本文・PC サイドバー・モバイルの 3 面に同一内容を出し、utm で面分離する（旧 上位3誌直リンクを廃止し
  // 「もくじ集約」に一本化・2026-07）。HUB 非対応資格（concrete/一次）は null → 非表示。
  // note もくじ CTA は面ごとに 1 つずつ（重複回避）: PC=右サイドバー（hubCtaSidebar）／モバイル=最下部
  // （hubCtaMobile）。本文フロー内には置かない（カテゴリ hub は回遊が主タスクで、記事一覧の手前に販売
  // タイルを割り込ませない・2026-07-06。旧 hubCta 本文 CTA は撤去）。utm で面分離。
  const hubCtaSidebar = resolveHubCta(slug, { utmSuffix: 'sb' });
  const hubCtaMobile = resolveHubCta(slug, { utmSuffix: 'mob' });
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
        placement="category-mobile"
      />
    </div>
  ));

  // 右サイドバー（PC ≥993px・TwoColumnShell の aside prop へ渡す）。上から
  // 転職アフィリ（SidebarAdBanner＝当ページ唯一のピクセル発火源・各プログラム 1 回ずつ）→
  // 運営者プロフィール（E-E-A-T）→ note もくじ CTA（PC 唯一の note 面・utm -sb）→ 人気記事ランキング。
  const categorySidebar = (
    <div className="space-y-3">
      {careerAds.map((ad, i) => (
        <SidebarAdBanner
          key={ad.trackLabel + i}
          {...ad.creative}
          trackLabel={ad.trackLabel}
          placement="category-sidebar"
        />
      ))}
      <AuthorSidebarCard />
      {hubCtaSidebar && <HubCtaBanner cta={hubCtaSidebar} placement="category-sidebar" />}
      <PopularRanking items={popularDocs} />
    </div>
  );

  return (
    <PageShell variant="article">
        {/* カテゴリ本文 + 右サイドバー（PC ≥993px・常に 2 カラム）。サイドバーは上から
            転職アフィリ（SidebarAdBanner＝当ページ唯一のピクセル源）→ 運営者プロフィール →
            人気記事 → note マガジン CTA を配置。note CTA はモバイルでは記事一覧の下に出す。
            カテゴリ見出しは全幅ヒーロー帯を廃し、左カラム上部にコンパクト配置（2026-06-26）。
            これにより右サイドバー（転職枠）がファーストビューへ繰り上がる。 */}
        <TwoColumnShell gutter="default" mainClassName="pt-8 sm:pt-10 pb-10" aside={categorySidebar}>
            {/* 左メインカラム全体を 1 枚の白カードに統一（グレー地に白サーフェス・角丸ゼロの
                エディトリアル面）。見出し・人気記事・各セクションを同一カード内に載せ、内側は
                リスト/テーブル/フラットタイルで構成してカード内カードを避ける（2026-07 A-1）。 */}
            <div className="card-surface-section px-5 sm:px-8 lg:px-10 pb-8 sm:pb-10">
            {/* カテゴリ見出し（縮小版・H1/パンくず/説明は SEO のため維持。CATEGORY チップは
                パンくずと重複のため削除） */}
            <div className="pt-6 sm:pt-8 pb-5 border-b border-[var(--rule-soft)]">
              <nav aria-label="breadcrumb" className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-widest mb-2 flex items-center gap-2">
                <Link href="/" className="hover:text-[var(--accent)] transition-colors">Home</Link>
                <span aria-hidden className="opacity-60">›</span>
                <span>Category</span>
              </nav>
              <h1 className="font-serif font-bold tracking-tight text-[var(--ink)] text-[24px] sm:text-[28px] leading-[1.3] mb-2">
                {cat.label}
              </h1>
              <p className="text-[15px] leading-[1.8] text-[var(--ink-body)] max-w-[60ch]">{cat.subtitle}</p>
            </div>
            <div className="pt-8 text-[17px] leading-[1.9]">
          {/* よく読まれている記事 特集（GA4 上位 top3・グループ別セクションの上）。データ無しなら描画されない。 */}
          {popularDocs.length > 0 && (
            <div className="mb-16">
              <PopularShowcase items={popularDocs.slice(0, 3)} />
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
                <PeFirstStageView groups={groups} mobileCareerAds={mobileCareerAds} />
              ) : slug === 'pe-comprehensive-management' ? (
                <PeComprehensiveView groups={groups} mobileCareerAds={mobileCareerAds} />
              ) : slug === 'pe-construction' ? (
                <PeConstructionView groups={groups} mobileCareerAds={mobileCareerAds} />
              ) : slug === 'concrete-chief-engineer' || slug === 'concrete-diagnostician' ? (
                <ConcreteView groups={groups} mobileCareerAds={mobileCareerAds} />
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
            </div>

            {/* note もくじ CTA（モバイル＜993px のみ）。PC は右サイドバーへ集約。 */}
            {hubCtaMobile && (
              <div className="zenn-desktop:hidden pb-10 mx-auto max-w-[360px]">
                <HubCtaBanner cta={hubCtaMobile} placement="category-mobile" />
              </div>
            )}
        </TwoColumnShell>
    </PageShell>
  );
}

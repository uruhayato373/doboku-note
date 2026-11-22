import type { Metadata } from "next";
import { isStructuralTag } from '@/lib/content-taxonomy';
import PageShell from "@/components/layout/PageShell";
import { Hero, ExamCards, LatestArticles, AboutSection, NoteNowSection } from "@/components/home";
import type { LatestArticle } from "@/components/home";
import { getAllDocsMeta, type DocMeta } from "@/lib/docs";
import { getCardImage } from "@/lib/site-thumbnail";
import { buildExamCards } from "@/lib/home-exam-cards";
import categoriesData from "@/config/categories.json";
import { CategoryDef } from "@/lib/categories";
import LinkTile from '@/components/ui/LinkTile/LinkTile';
import SectionBlock from '@/components/layout/SectionBlock';
import AffiliateSlot from '@/components/ui/AffiliateSlot/AffiliateSlot';
import AdSlot from '@/components/ads/AdSlot';
import { getStandardsCatalog } from '@/lib/standards';

const categories = categoriesData as CategoryDef[];
const standardsTotals = getStandardsCatalog().totals;

// ホームの自己 canonical / og:url。root（getCommonSeoData）は継承事故防止のため
// canonical/og:url を持たないので、ホーム自身がここで "/" を明示する。
// title/description は root の default をそのまま継承する。
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

// 2026-04-26 #84 LCP 追加改善（Task B-2 revert）:
// LatestArticles / AboutSection を next/dynamic でラップしたが、これらは React Server Component
// （"use client" 無し）であり、Next.js 16 の RSC モデルではそもそもクライアント JS を出さない。
// next/dynamic でラップすると逆にクライアント境界扱いとなり JS 増・LCP 悪化（PSI 8072ms 計測）。
// 本コミットで通常 import に戻す。katex の docs 限定化（Task B-1）は維持。

function pickRecent(allMeta: DocMeta[], n: number): LatestArticle[] {
  const labelByCategory = new Map<string, string>();
  categories.forEach((c) => labelByCategory.set(c.slug, c.label));
  return allMeta
    .filter((m) => m.published !== false)
    .filter((m) => !m.hideFromHome)
    .filter((m) => m.title && !m.title.startsWith("§"))
    .map((m) => {
      const dateStr =
        m.updatedAt ||
        m.dateModified ||
        m.publishedAt ||
        m.created;
      const date = dateStr ? new Date(dateStr) : null;
      return { meta: m, ts: date && !Number.isNaN(date.getTime()) ? date.getTime() : 0 };
    })
    .filter((x) => x.ts > 0)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, n)
    .map(({ meta }) => ({
      slug: meta.slug,
      title: meta.shortTitle || meta.title,
      category: meta.category,
      categoryLabel: meta.category ? labelByCategory.get(meta.category) : undefined,
      date: meta.updatedAt || meta.dateModified || meta.publishedAt || meta.created,
      tags: (meta.tags || []).filter((t) => !isStructuralTag(t)),
      image: getCardImage(meta),
    }));
}

export default async function HomePage() {
  const allMeta = getAllDocsMeta();
  const exams = buildExamCards();

  const latest = pickRecent(allMeta, 4);
  const lawPageCount = allMeta.filter((d) => d.category === 'laws' && d.published !== false).length;

  return (
    <PageShell variant="default">
      <Hero />
      <ExamCards exams={exams} />
      {/* 重点資格の note の案内（もくじ・試験の前後はその時期の商品）。資格カードの直後に置く（2026-11-22・表示がセッションの 12% だった） */}
      <NoteNowSection />
      <SectionBlock space="sm" ariaLabel="実務・基準資料・法令・テーマ">
        {/* 4 つの領域の入口。法令（/laws）だけトップから入口が無かった（2026-11-15・DN-1219） */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-cta="nav" data-cta-label="home-areas">
          {[
            {
              href: '/practice',
              label: 'PRACTICE',
              title: '土木施工の実務',
              description: '現場で迷いやすい管理値・計画・安全判断を、公的根拠とともに確認',
            },
            {
              href: '/standards',
              label: 'STANDARDS',
              title: '共通仕様書・工事必携',
              description: `全国${standardsTotals.agencies}機関・${standardsTotals.documents}文書・${standardsTotals.pages.toLocaleString('ja-JP')}ページの全文文字起こしライブラリ`,
            },
            {
              href: '/laws',
              label: 'LAWS',
              title: '土木の法令の解説',
              description: `建設業法・労働安全衛生法・道路法などの解説${lawPageCount}本。試験と実務の両方から条文を読む`,
            },
            {
              href: '/topics',
              label: 'TOPICS',
              title: 'テーマから横断検索',
              description: '試験・実務・基準資料を、コンクリートや安全管理などのテーマで接続',
            },
          ].map((item) => (
            <LinkTile
              key={item.href}
              href={item.href}
              size="lg"
              serif
              eyebrow={item.label}
              title={item.title}
              description={item.description}
              headingLevel="h2"
            />
          ))}
        </div>
      </SectionBlock>
      <LatestArticles articles={latest} />
      {/* AdSense の Multiplex（記事末と同じユニット）。転職・note の枠と隣り合わせない */}
      <SectionBlock space="sm" ariaLabel="おすすめの記事（広告）">
        <AdSlot slot="endMultiplex" />
      </SectionBlock>
      <AboutSection />
      {/* 転職の案内（1 枠。案件は配置ルール・素材の大きさは CTA の面の台帳の home-section）。
          PC は横の空き（300×250 の左右）に AdSense のディスプレイ広告（右の欄と同じ rail のユニット）を並べる。
          スマホは縦に積むと広告が 2 つ続くので転職の 1 枠だけ（隠れた AdSense の枠は AdSlot が要求しない） */}
      <SectionBlock space="sm" ariaLabel="転職の相談先と広告">
        <div className="grid items-center gap-6 lg:grid-cols-2">
          <AffiliateSlot page={{ pageKind: 'home' }} slot="home-section" />
          <div className="hidden lg:block">
            <AdSlot slot="rail" />
          </div>
        </div>
      </SectionBlock>
    </PageShell>
  );
}

import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import { Hero, ExamCards, LatestArticles, RecentUpdatesStrip, AboutSection, PremiumNoteHero } from "@/components/home";
import type { LatestArticle } from "@/components/home";
import { getAllDocsMeta, type DocMeta } from "@/lib/docs";
import { getOgpImageUrl } from "@/lib/r2-image-loader";
import { buildExamCards } from "@/lib/home-exam-cards";
import categoriesData from "@/config/categories.json";
import { CategoryDef } from "@/lib/categories";
import Link from 'next/link';
import SectionBlock from '@/components/layout/SectionBlock';

const categories = categoriesData as CategoryDef[];

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
      tags: (meta.tags || []).filter(
        (t) => !["primary", "secondary", "past-questions", "guide", "textbook", "keyword"].includes(t),
      ),
      image: getOgpImageUrl(meta.slug),
    }));
}

export default async function HomePage() {
  const allMeta = getAllDocsMeta();
  const exams = buildExamCards();

  const latest = pickRecent(allMeta, 4);

  return (
    <PageShell variant="default">
      <Hero />
      <RecentUpdatesStrip articles={latest.slice(0, 2)} />
      <ExamCards exams={exams} />
      <SectionBlock space="sm" ariaLabel="実務と基準資料">
        <div className="grid gap-4 md:grid-cols-3">
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
              description: '全国10機関・72文書・11,109ページの全文文字起こしライブラリ',
            },
            {
              href: '/topics',
              label: 'TOPICS',
              title: 'テーマから横断検索',
              description: '試験・実務・基準資料を、コンクリートや安全管理などのテーマで接続',
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring card-interactive border border-[var(--rule-soft)] bg-[var(--paper)] p-5 transition-[border-color,box-shadow] hover:border-[var(--accent)]"
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent)]">{item.label}</div>
              <h2 className="mt-2 font-serif text-xl font-bold text-[var(--ink)]">{item.title}</h2>
              <p className="mt-2 text-[13px] leading-[1.75] text-[var(--ink-muted)]">{item.description}</p>
            </Link>
          ))}
        </div>
      </SectionBlock>
      <LatestArticles articles={latest} />
      <AboutSection />
      {/* note 有料教材ハブへの導線（複数資格横断のトップは単一商品でなく /links 集約へ）。
          ブランド背景＋HTML文字のヒーロー（PremiumNoteHero）。data-cta="note" で計測。 */}
      <PremiumNoteHero />
    </PageShell>
  );
}

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BookCard from "@/components/ui/BookCard/BookCard";
import BookSection from "@/components/ui/BookSection/BookSection";
import { Hero, ExamCards, LatestArticles, AboutSection } from "@/components/home";
import type { LatestArticle } from "@/components/home";
import { getDocsMetaByCategory, getAllDocsMeta, type DocMeta } from "@/lib/docs";
import categoriesData from "@/config/categories.json";
import { CategoryDef } from "@/lib/categories";

// 2026-04-26 #84 LCP 追加改善（Task B-2 revert）:
// LatestArticles / AboutSection を next/dynamic でラップしたが、これらは React Server Component
// （"use client" 無し）であり、Next.js 16 の RSC モデルではそもそもクライアント JS を出さない。
// next/dynamic でラップすると逆にクライアント境界扱いとなり JS 増・LCP 悪化（PSI 8072ms 計測）。
// 本コミットで通常 import に戻す。katex の docs 限定化（Task B-1）は維持。

const categories = categoriesData as CategoryDef[];

const EXAM_DATA = [
  {
    slug: "civil-construction-1",
    label: "1級土木施工管理技士",
    en: "CCCE Grade 1",
    subtitle: "第1次・第2次検定 完全対策",
    description: "土木工事の施工計画・品質管理・安全管理を体系的に整理。過去問題、キーワード解説、記述式の要点を収録。",
    nextExam: "2026年7月 第1次 / 10月 第2次",
    variant: "civil" as const,
  },
  {
    slug: "civil-construction-2",
    label: "2級土木施工管理技士",
    en: "CCCE Grade 2",
    subtitle: "第1次・第2次検定 完全対策（前期・後期2回開催）",
    description: "受験資格緩和後の若手技術者向け。令和3年度〜7年度 過去問解説、経験記述ガイド、分野別の基礎ポイントを収録。",
    nextExam: "2026年6月 前期 / 10月 後期・第2次",
    variant: "civil" as const,
  },
  {
    slug: "pe-comprehensive-management",
    label: "技術士（総合技術監理部門）",
    en: "PE Comprehensive Management",
    subtitle: "筆記・口頭試験 論文対策",
    description: "5つの管理技術（経済性・人的資源・情報・安全・社会環境）のキーワード集。各概念の定義・要点・過去問リンクを収録。",
    nextExam: "2026年7月 筆記 / 12月 口頭",
    variant: "pe" as const,
  },
  {
    slug: "concrete-chief-engineer",
    label: "コンクリート主任技師",
    en: "JCI Senior Concrete Engineer",
    subtitle: "四肢択一・小論文 完全対策",
    description: "材料・配合設計・施工・耐久性・品質管理など8分野を体系整理。分野別の過去問解説・テキスト・小論文対策を収録。",
    nextExam: "2026年11月（予定）",
    variant: "civil" as const,
  },
];

function pickRecent(allMeta: DocMeta[], n: number): LatestArticle[] {
  const labelByCategory = new Map<string, string>();
  categories.forEach((c) => labelByCategory.set(c.slug, c.label));
  return allMeta
    .filter((m) => m.published !== false)
    .filter((m) => !(m as any).hideFromHome)
    .filter((m) => m.title && !m.title.startsWith("§"))
    .map((m) => {
      const dateStr =
        (m as any).updatedAt ||
        (m as any).dateModified ||
        (m as any).publishedAt ||
        (m as any).created;
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
      date: (meta as any).updatedAt || (meta as any).dateModified || (meta as any).publishedAt || (meta as any).created,
      tags: (meta.tags || []).filter(
        (t) => !["primary", "secondary", "past-questions", "guide", "textbook", "keyword"].includes(t),
      ),
    }));
}

export default async function HomePage() {
  const allMeta = getAllDocsMeta();
  const civil = getDocsMetaByCategory("civil-construction-1");
  const civil2 = getDocsMetaByCategory("civil-construction-2");
  const pe = getDocsMetaByCategory("pe-comprehensive-management");
  const concrete = getDocsMetaByCategory("concrete-chief-engineer");

  const exams = [
    {
      ...EXAM_DATA[0]!,
      stats: [
        { k: "記事", v: civil.length.toLocaleString() },
        { k: "過去問", v: civil.filter((m) => m.tags?.includes("past-questions") || m.group === "primary" || m.group === "secondary").length.toLocaleString() },
        { k: "教科書", v: civil.filter((m) => m.tags?.includes("textbook") || m.group === "textbook").length.toLocaleString() },
      ],
    },
    {
      ...EXAM_DATA[1]!,
      stats: [
        { k: "記事", v: civil2.length.toLocaleString() },
        { k: "過去問", v: civil2.filter((m) => m.tags?.includes("past-questions") || m.group === "primary" || m.group === "secondary").length.toLocaleString() },
        { k: "ガイド", v: civil2.filter((m) => m.tags?.includes("guide") || m.group === "guide").length.toLocaleString() },
      ],
    },
    {
      ...EXAM_DATA[2]!,
      stats: [
        { k: "記事", v: pe.length.toLocaleString() },
        { k: "キーワード", v: pe.filter((m) => m.group === "keyword" || m.tags?.includes("keyword")).length.toLocaleString() },
        { k: "過去問", v: pe.filter((m) => m.group === "pastExam" || m.tags?.includes("past-questions")).length.toLocaleString() },
      ],
    },
    {
      ...EXAM_DATA[3]!,
      stats: [
        { k: "記事", v: concrete.length.toLocaleString() },
        { k: "過去問", v: concrete.filter((m) => m.group === "primary" || m.tags?.includes("past-questions")).length.toLocaleString() },
        { k: "テキスト", v: concrete.filter((m) => m.group === "textbook").length.toLocaleString() },
      ],
    },
  ];

  const articleCount = allMeta.filter((m) => m.published !== false).length;

  const latest = pickRecent(allMeta, 4);
  const lastUpdated = latest[0]?.date
    ? new Date(latest[0].date).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, ".")
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] transition-colors duration-300">
      <Header />
      <main className="flex-grow">
        <Hero articleCount={articleCount} lastUpdated={lastUpdated} />
        <ExamCards exams={exams} />
        <LatestArticles articles={latest} />
        <AboutSection />
        {/* 参考書籍（補完ポジション・トップ最下部。ファーストビュー外） */}
        <div className="mx-auto max-w-3xl px-4 py-10">
          <BookSection
            title="総監受験の参考書籍"
            caption="総監受験を申込書から口頭試験まで通して押さえたいときに。"
          >
            <BookCard asin="4526084263" />
          </BookSection>
        </div>
      </main>
      <Footer />
    </div>
  );
}

import PageShell from "@/components/layout/PageShell";
import MagazineSidebarCard from "@/components/ui/MagazineSidebarCard";
import { Hero, ExamCards, LatestArticles, AboutSection } from "@/components/home";
import type { LatestArticle } from "@/components/home";
import { getDocsMetaByCategory, getAllDocsMeta, type DocMeta } from "@/lib/docs";
import { resolveCardImage } from "@/lib/card-image";
import categoriesData from "@/config/categories.json";
import homeExamCardsData from "@/config/home-exam-cards.json";
import { CategoryDef } from "@/lib/categories";

// 2026-04-26 #84 LCP 追加改善（Task B-2 revert）:
// LatestArticles / AboutSection を next/dynamic でラップしたが、これらは React Server Component
// （"use client" 無し）であり、Next.js 16 の RSC モデルではそもそもクライアント JS を出さない。
// next/dynamic でラップすると逆にクライアント境界扱いとなり JS 増・LCP 悪化（PSI 8072ms 計測）。
// 本コミットで通常 import に戻す。katex の docs 限定化（Task B-1）は維持。

const categories = categoriesData as CategoryDef[];

// トップの資格カード固有のコピー（label/subtitle/description/en/nextExam/stats/order）は
// ナビ用の categories.json と意図的に異なる（例: pe-construction はナビ「技術士第二次試験（建設部門）」
// に対しカードは「技術士（建設部門）」）。そのためカード固有データは home-exam-cards.json に分離する。
// 「どの資格をトップに出すか」は categories.json（visible / variant）が真実源で、両者の slug 整合は
// scripts/check-home-exam-coverage.mjs（pre-commit / CI）が強制する。
// → 新資格をトップに出すには home-exam-cards.json にカードを追加する。
type HomeStatSpec = {
  label: string;
  total?: boolean;
  groups?: string[];
  tags?: string[];
  distinctYear?: boolean;
  value?: string;
};
type HomeExamCard = {
  slug: string;
  order: number;
  label: string;
  en: string;
  subtitle: string;
  description: string;
  nextExam: string;
  stats: HomeStatSpec[];
};
const homeExamCards = homeExamCardsData as HomeExamCard[];
const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

// 各カテゴリページの種別セクション(id=`sec-<DocGroupKey>`)へ直行させるためのアンカー。
// spec.groups の frontmatter 値を canonical な DocGroupKey へ寄せる（past-exam → pastExam）。
function statAnchor(spec: HomeStatSpec): string | undefined {
  if (spec.value !== undefined || spec.distinctYear || spec.total) return undefined;
  const raw = spec.groups?.[0];
  if (!raw) return undefined;
  return raw === "past-exam" ? "pastExam" : raw;
}

function computeStat(metas: DocMeta[], spec: HomeStatSpec): { k: string; v: string; anchor?: string } {
  const anchor = statAnchor(spec);
  if (spec.value !== undefined) return { k: spec.label, v: spec.value };
  if (spec.distinctYear) {
    const years = new Set(metas.map((m) => (String(m.slug).match(/r\d+/) || [])[0]).filter(Boolean));
    return { k: spec.label, v: String(years.size) };
  }
  if (spec.total) return { k: spec.label, v: metas.length.toLocaleString() };
  const groups = spec.groups ?? [];
  const tags = spec.tags ?? [];
  const n = metas.filter(
    (m) => (m.group ? groups.includes(m.group) : false) || tags.some((t) => m.tags?.includes(t)),
  ).length;
  return { k: spec.label, v: n.toLocaleString(), ...(anchor ? { anchor } : {}) };
}

// categories.json（visible≠false・variant≠reference）に存在する資格だけを、
// home-exam-cards.json の order 順でカード化する。variant はカテゴリ定義から取得（単一ソース）。
function buildExamCards() {
  return [...homeExamCards]
    .filter((card) => {
      const cat = categoryBySlug.get(card.slug);
      return !!cat && cat.visible !== false && cat.variant !== "reference";
    })
    .sort((a, b) => a.order - b.order)
    .map((card) => {
      const cat = categoryBySlug.get(card.slug)!;
      const metas = getDocsMetaByCategory(card.slug);
      return {
        slug: card.slug,
        label: card.label,
        en: card.en,
        subtitle: card.subtitle,
        description: card.description,
        nextExam: card.nextExam,
        variant: cat.variant as "civil" | "pe",
        stats: card.stats.map((s) => computeStat(metas, s)),
      };
    });
}

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
      image: resolveCardImage(meta.category, meta.slug),
    }));
}

export default async function HomePage() {
  const allMeta = getAllDocsMeta();
  const exams = buildExamCards();

  const latest = pickRecent(allMeta, 4);

  return (
    <PageShell variant="default">
      <Hero />
      <ExamCards exams={exams} />
      <LatestArticles articles={latest} />
      <AboutSection />
      {/* note 有料教材ハブへの導線（複数資格を横断するトップは単一商品でなく /links 集約へ）。
          data-cta="note" で AnalyticsProvider のクリック計測対象になる。 */}
      <div className="mx-auto max-w-3xl px-4 pt-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)] mb-3">Premium</div>
        <h2 className="font-serif text-xl sm:text-2xl font-black text-[var(--ink)] mb-1.5">note 有料教材</h2>
        <p className="text-[14px] text-[var(--ink-muted)] mb-4">
          記述式・経験記述の模範答案集や精読ガイドをまとめています。
        </p>
        <div className="max-w-sm">
          <MagazineSidebarCard
            href="/links"
            imageUrl="/images/magazines/links-hub-sidebar.webp"
            alt="note 有料教材まとめ"
            external={false}
            trackLabel="home-links-hub"
          />
        </div>
      </div>
    </PageShell>
  );
}

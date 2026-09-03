import { getDocsMetaByCategory, type DocMeta } from "@/lib/docs";
import { type CategoryDef } from "@/lib/categories";
import categoriesData from "@/config/categories.json";
import homeExamCardsData from "@/config/home-exam-cards.json";
import { getNextExamEvent } from "@/lib/exam-schedule";
import type { ExamData } from "@/components/home";

// トップの資格カード固有のコピー（label/subtitle/description/en/nextExam/stats/order）は
// ナビ用の categories.json と意図的に異なる（例: pe-construction はナビ「技術士第二次試験（建設部門）」
// に対しカードは「技術士（建設部門）」）。そのためカード固有データは home-exam-cards.json に分離する。
// 「どの資格をトップに出すか」は categories.json（visible / variant）が真実源で、両者の slug 整合は
// scripts/check-home-exam-coverage.mjs（pre-commit / CI）が強制する。
// → 新資格をトップに出すには home-exam-cards.json にカードを追加する。
//
// もとは src/app/page.tsx にべた書きだったが、検索ゼロステート（SearchZeroState）も同じ資格カードを
// 横展開するため lib へ抽出した（DN-0079③・2026-08-28）。トップページと検索ページの両方から呼ぶ。
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

const categories = categoriesData as CategoryDef[];
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
export function buildExamCards(): ExamData[] {
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
        // 試験日は exam-calendar（SSOT）から解決し、未来のイベントが無い資格だけ手打ち文字列（nextExam）へ退避
        nextExam: card.nextExam,
        nextExamEvent: getNextExamEvent(card.slug),
        variant: cat.variant as "civil" | "pe",
        stats: card.stats.map((s) => computeStat(metas, s)),
      };
    });
}

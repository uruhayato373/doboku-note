import { type CategoryDef } from "@/lib/categories";
import categoriesData from "@/config/categories.json";
import homeExamCardsData from "@/config/home-exam-cards.json";
import type { ExamData } from "@/components/home";

// トップの資格カードは「どの資格を・どの順に・どの名前で出すか」だけを持つ（slug / order / label。
// 画面に出すのは名前だけ。説明文・試験日・件数は持たない。試験日の正本は config/exam-calendar.json）。
// label はナビ用の categories.json と意図的に異なる（例: pe-construction はナビ「技術士第二次試験（建設部門）」
// に対しカードは「技術士（建設部門）」）。そのためカード固有データは home-exam-cards.json に分離する。
// 「どの資格をトップに出すか」は categories.json（visible / variant）が真実源で、両者の slug 整合は
// scripts/check-home-exam-coverage.mjs（pre-commit / CI）が強制する。
// → 新資格をトップに出すには home-exam-cards.json にカードを追加する。
//
// もとは src/app/page.tsx にべた書きだったが、検索ゼロステート（SearchZeroState）も同じ資格カードを
// 横展開するため lib へ抽出した（DN-0079③・2026-08-28）。トップページと検索ページの両方から呼ぶ。
type HomeExamCard = {
  slug: string;
  // label は qualification-registry.json の正式名を npm run sync-qualification-names が書く（手で書かない）
  qualification?: string;
  order: number;
  label: string;
};

const categories = categoriesData as CategoryDef[];
const homeExamCards = homeExamCardsData as HomeExamCard[];
const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

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
      return {
        slug: card.slug,
        label: card.label,
        variant: cat.variant as "civil" | "pe",
      };
    });
}

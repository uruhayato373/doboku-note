/**
 * コンポーネント動的ローダー
 * 共通コンポーネントと記事固有コンポーネントを効率的に管理
 */

import React from "react";
import { commonComponents, CommonComponentName } from "./common";
import { specificComponents, SpecificComponentName } from "./specific";

/**
 * 共通コンポーネントを読み込み
 * 全記事で使用される基本コンポーネント
 */
export async function getCommonComponents() {
  return {
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
      React.createElement("img", { ...props, loading: "lazy" }),
    ArticleImage: (await import("@/components/ui/ArticleImage/ArticleImage"))
      .default,
    Callout: (await import("@/components/ui/Callout/Callout")).default,
    ExamPoint: (await import("@/components/ui/ExamPoint/ExamPoint")).default,
    RelatedKeywords: (await import("@/components/ui/RelatedKeywords/RelatedKeywords")).default,
    RelatedExamQuestions: (await import("@/components/ui/RelatedExamQuestions/RelatedExamQuestions")).default,
    SpecSheetList: (
      await import("@/components/ui/SpecSheetList/SpecSheetList")
    ).default,
    LinkCard: (await import("@/components/ui/LinkCard/LinkCard")).default,
    NoteLink: (await import("@/components/ui/NoteLink/NoteLink")).default,
    MagazineInlineCard: (await import("@/components/ui/MagazineInlineCard/MagazineInlineCard")).default,
    MagazineCard: (await import("@/components/ui/MagazineCard/MagazineCard")).default,
    SeeAlso: (await import("@/components/ui/SeeAlso/SeeAlso")).default,
    SpokeNavCard: (await import("@/components/ui/SpokeNavCard/SpokeNavCard")).default,
    PersonaSelector: (await import("@/components/ui/PersonaSelector")).default,
    SourceBadges: (await import("@/components/ui/SourceBadges")).default,
    CardList: (await import("@/components/ui/CardList/CardList")).default,
    ReferenceLinks: (await import("@/components/ui/ReferenceLinks")).default,
    ExamContext: (await import("@/components/ui/ExamContext")).default,
    DataTable: (await import("@/components/ui/DataTable/DataTable")).default,
    Nowrap: (await import("@/components/ui/Nowrap/Nowrap")).default,
    Underline: (await import("@/components/ui/Underline/Underline")).default,
    Timeline: (await import("@/components/ui/Timeline/Timeline")).default,
    ExamFields: (await import("@/components/ui/ExamFields/ExamFields")).default,
    StatsCard: (await import("@/components/ui/StatsCard/StatsCard")).default,
    PdcaCycle: (await import("@/components/ui/PdcaCycle/PdcaCycle")).default,
    CourseAffiliate: (await import("@/components/ui/CourseAffiliate/CourseAffiliate")).default,
    BookCard: (await import("@/components/ui/BookCard/BookCard")).default,
    Question: (await import("@/components/ui/ChatBubble/Question")).default,
    Answer: (await import("@/components/ui/ChatBubble/Answer")).default,
  };
}

/**
 * 記事固有コンポーネントを動的に読み込み
 * 必要なコンポーネントのみを読み込んでバンドルサイズを最適化
 */
export async function getSpecificComponents(componentNames: string[]) {
  const components: { [key: string]: any } = {};

  for (const componentName of componentNames) {
    try {
      switch (componentName) {
        case "RealEstateCostsTable":
          components[componentName] = (
            await import(
              "@/features/real-estate-investment/RealEstateCostsTable"
            )
          ).default;
          break;
        case "RealEstateApartmentCostsTable":
          components[componentName] = (
            await import(
              "@/features/real-estate-investment/RealEstateApartmentCostsTable"
            )
          ).default;
          break;
        case "StackedBarChart":
          components[componentName] = (
            await import(
              "@/features/nisa-ideco-guide-civil-servants/StackedBarChart"
            )
          ).default;
          break;
        case "PieChart":
          components[componentName] = (
            await import("@/features/nisa-ideco-guide-civil-servants/PieChart")
          ).default;
          break;
        case "TimeBlockChart":
          components[componentName] = (
            await import("@/features/time-management-techniques/TimeBlockChart")
          ).default;
          break;
        default:
          console.warn(`Unknown specific component: ${componentName}`);
      }
    } catch (error) {
      console.error(`Failed to load component ${componentName}:`, error);
    }
  }

  return components;
}

/**
 * 統合コンポーネント管理システム
 * 共通コンポーネント + 記事固有コンポーネントを効率的に結合
 */
export async function getAllComponents(post: any) {
  // 1. 共通コンポーネントを常時読み込み
  const commonComps = await getCommonComponents();

  // 2. MDXコンテンツから使用されているコンポーネントを解析
  const { analyzeMDXComponents } = await import("./mdx-component-analyzer");
  const usedComponents = analyzeMDXComponents(post.content);

  // 3. 記事固有コンポーネントのみを動的に読み込み
  const specificComponentNames = usedComponents.filter((name) =>
    Object.keys(specificComponents).includes(name)
  );
  const specificComps = await getSpecificComponents(specificComponentNames);

  // 4. 共通 + 記事固有コンポーネントを結合
  const result = {
    ...commonComps,
    ...specificComps,
  };

  return result;
}

/**
 * 利用可能な全コンポーネント名を取得
 * デバッグや分析用
 */
export function getAllAvailableComponentNames() {
  return {
    common: Object.keys(commonComponents),
    specific: Object.keys(specificComponents),
    all: [...Object.keys(commonComponents), ...Object.keys(specificComponents)],
  };
}

import React from "react";
import { commonComponents } from "./common";
import { specificComponents } from "./specific";

type MdxComponent = React.ElementType;
type ComponentRegistry = Record<string, MdxComponent>;
type ComponentLoader = () => Promise<MdxComponent>;

const commonLoaders = {
  ArticleImage: () => import("@/components/ui/ArticleImage/ArticleImage").then((m) => m.default),
  Callout: () => import("@/components/ui/Callout/Callout").then((m) => m.default),
  ExamPoint: () => import("@/components/ui/ExamPoint/ExamPoint").then((m) => m.default),
  RelatedKeywords: () => import("@/components/ui/RelatedKeywords/RelatedKeywords").then((m) => m.default),
  RelatedExamQuestions: () => import("@/components/ui/RelatedExamQuestions/RelatedExamQuestions").then((m) => m.default),
  SpecSheetList: () => import("@/components/ui/SpecSheetList/SpecSheetList").then((m) => m.default),
  LinkCard: () => import("@/components/ui/LinkCard/LinkCard").then((m) => m.default),
  NoteLink: () => import("@/components/ui/NoteLink/NoteLink").then((m) => m.default),
  MagazineInlineCard: () => import("@/components/ui/MagazineInlineCard/MagazineInlineCard").then((m) => m.default),
  MagazineCard: () => import("@/components/ui/MagazineCard/MagazineCard").then((m) => m.default),
  SeeAlso: () => import("@/components/ui/SeeAlso/SeeAlso").then((m) => m.default),
  SpokeNavCard: () => import("@/components/ui/SpokeNavCard/SpokeNavCard").then((m) => m.default),
  PersonaSelector: () => import("@/components/ui/PersonaSelector").then((m) => m.default),
  SourceBadges: () => import("@/components/ui/SourceBadges").then((m) => m.default),
  CardList: () => import("@/components/ui/CardList/CardList").then((m) => m.default),
  ReferenceLinks: () => import("@/components/ui/ReferenceLinks").then((m) => m.default),
  ExamContext: () => import("@/components/ui/ExamContext").then((m) => m.default),
  DataTable: () => import("@/components/ui/DataTable/DataTable").then((m) => m.default),
  Nowrap: () => import("@/components/ui/Nowrap/Nowrap").then((m) => m.default),
  Underline: () => import("@/components/ui/Underline/Underline").then((m) => m.default),
  Timeline: () => import("@/components/ui/Timeline/Timeline").then((m) => m.default),
  ExamFields: () => import("@/components/ui/ExamFields/ExamFields").then((m) => m.default),
  StatsCard: () => import("@/components/ui/StatsCard/StatsCard").then((m) => m.default),
  PdcaCycle: () => import("@/components/ui/PdcaCycle/PdcaCycle").then((m) => m.default),
  CourseAffiliate: () => import("@/components/ui/CourseAffiliate/CourseAffiliate").then((m) => m.default),
  CareerAffiliate: () => import("@/components/ui/CareerAffiliate/CareerAffiliate").then((m) => m.default),
  DokugakuBanner: () => import("@/components/ui/DokugakuBanner/DokugakuBanner").then((m) => m.default),
  SatTextLink: () => import("@/components/ui/SatTextLink/SatTextLink").then((m) => m.default),
  DokugakuKeikenLink: () => import("@/components/ui/DokugakuKeikenLink/DokugakuKeikenLink").then((m) => m.default),
  BookCard: () => import("@/components/ui/BookCard/BookCard").then((m) => m.default),
  Question: () => import("@/components/ui/ChatBubble/Question").then((m) => m.default),
  Answer: () => import("@/components/ui/ChatBubble/Answer").then((m) => m.default),
} satisfies Record<string, ComponentLoader>;

const specificLoaders = {
  RealEstateCostsTable: () =>
    import("@/features/real-estate-investment/RealEstateCostsTable").then((m) => m.default),
  RealEstateApartmentCostsTable: () =>
    import("@/features/real-estate-investment/RealEstateApartmentCostsTable").then((m) => m.default),
  StackedBarChart: () =>
    import("@/features/nisa-ideco-guide-civil-servants/StackedBarChart").then((m) => m.default),
  PieChart: () =>
    import("@/features/nisa-ideco-guide-civil-servants/PieChart").then((m) => m.default),
  TimeBlockChart: () =>
    import("@/features/time-management-techniques/TimeBlockChart").then((m) => m.default),
} satisfies Record<string, ComponentLoader>;

async function loadSelectedComponents(
  componentNames: readonly string[],
  loaders: Record<string, ComponentLoader>,
): Promise<ComponentRegistry> {
  const components: ComponentRegistry = {};

  await Promise.all(
    componentNames.map(async (componentName) => {
      const loader = loaders[componentName];
      if (!loader) return;
      components[componentName] = await loader();
    }),
  );

  return components;
}

export async function getCommonComponents(componentNames?: readonly string[]) {
  const selectedNames = componentNames ?? Object.keys(commonLoaders);
  return {
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
      React.createElement("img", { ...props, loading: "lazy" }),
    ...(await loadSelectedComponents(selectedNames, commonLoaders)),
  };
}

export async function getSpecificComponents(componentNames: readonly string[]) {
  const unknownNames = componentNames.filter((name) => !specificLoaders[name]);
  for (const name of unknownNames) {
    console.warn(`Unknown specific component: ${name}`);
  }

  return loadSelectedComponents(componentNames, specificLoaders);
}

export async function getAllComponents(post: { content: string }) {
  const content = post.content;

  const commonComponentNames = Object.keys(commonLoaders).filter((name) =>
    content.includes(`<${name}`),
  );
  const specificComponentNames = Object.keys(specificLoaders).filter((name) =>
    content.includes(`<${name}`),
  );

  const [commonComps, specificComps] = await Promise.all([
    getCommonComponents(commonComponentNames),
    getSpecificComponents(specificComponentNames),
  ]);

  return {
    ...commonComps,
    ...specificComps,
  };
}

export function getAllAvailableComponentNames() {
  return {
    common: Object.keys(commonComponents),
    specific: Object.keys(specificComponents),
    all: [...Object.keys(commonComponents), ...Object.keys(specificComponents)],
  };
}

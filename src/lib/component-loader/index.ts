import React from "react";

type MdxComponent = React.ElementType;
type ComponentRegistry = Record<string, MdxComponent>;
type ComponentLoader = () => Promise<MdxComponent>;

const commonLoaders = {
  ArticleImage: () => import("@/components/ui/ArticleImage/ArticleImage").then((m) => m.default),
  Callout: () => import("@/components/ui/Callout/Callout").then((m) => m.default),
  ExamPoint: () => import("@/components/ui/ExamPoint/ExamPoint").then((m) => m.default),
  RelatedKeywords: () => import("@/components/ui/RelatedKeywords/RelatedKeywords").then((m) => m.default),
  SpecSheetList: () => import("@/components/ui/SpecSheetList/SpecSheetList").then((m) => m.default),
  LinkCard: () => import("@/components/ui/LinkCard/LinkCard").then((m) => m.default),
  NoteLink: () => import("@/components/ui/NoteLink/NoteLink").then((m) => m.default),
  MagazineInlineCard: () => import("@/components/ui/MagazineInlineCard/MagazineInlineCard").then((m) => m.default),
  MagazineCard: () => import("@/components/ui/MagazineCard/MagazineCard").then((m) => m.default),
  MagazineHeroCta: () => import("@/components/ui/MagazineHeroCta/MagazineHeroCta").then((m) => m.default),
  SeeAlso: () => import("@/components/ui/SeeAlso/SeeAlso").then((m) => m.default),
  SpokeNavCard: () => import("@/components/ui/SpokeNavCard/SpokeNavCard").then((m) => m.default),
  PersonaSelector: () => import("@/components/ui/PersonaSelector").then((m) => m.default),
  SourceBadges: () => import("@/components/ui/SourceBadges").then((m) => m.default),
  DataTable: () => import("@/components/ui/DataTable/DataTable").then((m) => m.default),
  Nowrap: () => import("@/components/ui/Nowrap/Nowrap").then((m) => m.default),
  Underline: () => import("@/components/ui/Underline/Underline").then((m) => m.default),
  Timeline: () => import("@/components/ui/Timeline/Timeline").then((m) => m.default),
  ExamFields: () => import("@/components/ui/ExamFields/ExamFields").then((m) => m.default),
  PdcaCycle: () => import("@/components/ui/PdcaCycle/PdcaCycle").then((m) => m.default),
  CareerAffiliate: () => import("@/components/ui/CareerAffiliate/CareerAffiliate").then((m) => m.default),
} satisfies Record<string, ComponentLoader>;

// 記事固有コンポーネント（特定記事でのみ使う仕組み）。現在は登録なし。
// テンプレ由来の不動産/NISA/時間管理エントリは 2026-06-25 にデッドコードとして削除。
const specificLoaders: Record<string, ComponentLoader> = {};

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

async function getCommonComponents(componentNames?: readonly string[]) {
  const selectedNames = componentNames ?? Object.keys(commonLoaders);
  return {
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
      React.createElement("img", { ...props, loading: "lazy" }),
    ...(await loadSelectedComponents(selectedNames, commonLoaders)),
  };
}

async function getSpecificComponents(componentNames: readonly string[]) {
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

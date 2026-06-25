// 利用可能なコンポーネントのマッピング
export const availableComponents = {
  // 基本コンポーネント
  ArticleImage: "ArticleImage",
  ArticleHeader: "ArticleHeader",
  ArticleFooter: "ArticleFooter",
  Callout: "Callout",
  ExamPoint: "ExamPoint",
  RelatedKeywords: "RelatedKeywords",
  SpecSheetList: "SpecSheetList",
  LinkCard: "LinkCard",
  NoteLink: "NoteLink",
  CareerAffiliate: "CareerAffiliate",

  // 投資関連コンポーネント
  PieChart: "PortfolioChart",
  PortfolioChart: "PortfolioChart",

  // 記事固有コンポーネント
  StackedBarChart: "StackedBarChart",

  // テーブルコンポーネント
  RealEstateCostsTable: "RealEstateCostsTable",
  RealEstateApartmentCostsTable: "RealEstateApartmentCostsTable",

  // 時間管理関連
  TimeBlockChart: "TimeBlockChart",

  // その他のコンポーネント
  ImageGallery: "ImageGallery",
  TableOfContents: "TableOfContents",
  RelatedPosts: "RelatedPosts",
} as const;

export type ComponentName = keyof typeof availableComponents;

type ComponentMap = Record<string, unknown>;
type ComponentMetadata = {
  category?: string;
  tags?: string[];
};

// MDXコンテンツから使用されているコンポーネントを解析
export function analyzeMDXComponents(content: string): ComponentName[] {
  const usedComponents: ComponentName[] = [];

  // 各コンポーネントが使用されているかチェック
  Object.keys(availableComponents).forEach(
    (componentName) => {
      // コンポーネントの使用パターンをチェック
      const patterns = [
        `<${componentName}`, // <ComponentName
        `<${componentName} `, // <ComponentName
        `<${componentName}\n`, // <ComponentName改行
        `<${componentName}\t`, // <ComponentNameタブ
        `<${componentName}/>`, // <ComponentName/>
        `<${componentName} />`, // <ComponentName />
      ];

      const isUsed = patterns.some((pattern) => content.includes(pattern));

      if (isUsed) {
        usedComponents.push(componentName as ComponentName);
      }
    }
  );

  return usedComponents;
}

// 使用されているコンポーネントに基づいてコンポーネントオブジェクトを生成
export function generateComponentObject(
  usedComponents: ComponentName[],
  allComponents: ComponentMap
) {
  const componentObject: ComponentMap = {};

  usedComponents.forEach((componentName) => {
    if (allComponents[componentName]) {
      componentObject[componentName] = allComponents[componentName];
    }
  });

  return componentObject;
}

// 記事のカテゴリやタグに基づいて追加で必要なコンポーネントを特定
export function getAdditionalRequiredComponents(post: ComponentMetadata): ComponentName[] {
  const additionalComponents: ComponentName[] = [];

  // カテゴリ別の必須コンポーネント
  if (post.category === "イケオジ") {
    // イケオジカテゴリで必要なコンポーネント
  }

  if (post.category === "仕事デキ") {
    // 仕事デキカテゴリで必要なコンポーネント
  }

  // タグ別の必須コンポーネント
  if (post.tags && Array.isArray(post.tags)) {
    if (post.tags.includes("資産運用")) {
      additionalComponents.push("PortfolioChart", "PieChart");
    }
  }

  return additionalComponents;
}

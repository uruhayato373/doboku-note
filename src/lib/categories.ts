import categoriesData from '@/config/categories.json';

export type CategoryDef = {
  slug: string;
  label: string;
  subtitle: string;
  // SEO description（50〜160 文字）。未指定時は subtitle にフォールバック。
  // UI の <p> は subtitle、HTML <meta name="description"> は description を使う。
  description?: string;
  variant: 'civil' | 'pe' | 'reference';
  order: number;
  // false のカテゴリはナビ・一覧から非表示（カテゴリページ自体は生きている）
  visible?: boolean;
};

const categories = categoriesData as CategoryDef[];

export function getAllCategories(): CategoryDef[] {
  return [...categories].sort((a, b) => a.order - b.order);
}

export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return categories.find(c => c.slug === slug);
}

export function getCategoryLabel(slug: string): string {
  return getCategoryBySlug(slug)?.label ?? slug;
}

import categoriesData from '@/config/categories.json';

export type CategoryDef = {
  slug: string;
  label: string;
  subtitle: string;
  // SEO description（50〜160 文字）。未指定時は subtitle にフォールバック。
  // UI の <p> は subtitle、HTML <meta name="description"> は description を使う。
  description?: string;
  // civil / pe = 資格カテゴリ（トップの資格カードに出る）
  // reference = 公的資料の要点抜粋、general = 資格に紐づかない実務コンテンツ。
  // どちらも資格カードの対象外（check-home-exam-coverage が除外する）
  variant: 'civil' | 'pe' | 'reference' | 'general';
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

/**
 * Public hub path for a content category.
 *
 * Exam preparation, field practice, and official standards are separate user
 * intents, so the public URL must not expose the legacy catch-all /category
 * namespace. Keep this resolver as the single source used by navigation,
 * breadcrumbs, structured data, and redirects.
 */
export function getCategoryHubPath(slug: string): string {
  if (slug === 'civil-practice') return '/practice';
  if (slug === 'reference-materials') return '/standards';
  return `/exam/${slug}`;
}

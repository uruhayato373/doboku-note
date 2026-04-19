import categoriesData from '@/config/categories.json';
import tagsData from '@/config/tags.json';

export type CategoryDef = {
  slug: string;
  label: string;
  subtitle: string;
  variant: 'civil' | 'pe' | 'reference';
  order: number;
};

export type TagDef = {
  name: string;
  slug: string;
};

const categories = categoriesData as CategoryDef[];
const tags = tagsData as TagDef[];

export function getAllCategories(): CategoryDef[] {
  return [...categories].sort((a, b) => a.order - b.order);
}

export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return categories.find(c => c.slug === slug);
}

export function getCategoryLabel(slug: string): string {
  return getCategoryBySlug(slug)?.label ?? slug;
}

export function getAllTags(): TagDef[] {
  return tags;
}

export function getTagBySlug(slug: string): TagDef | undefined {
  return tags.find(t => t.slug === slug);
}

export function getTagByName(name: string): TagDef | undefined {
  return tags.find(t => t.name === name);
}

export function getTagLabel(slugOrName: string): string {
  // slug で検索
  const bySlug = getTagBySlug(slugOrName);
  if (bySlug) return bySlug.name;

  // name で検索（日本語名が直接渡された場合）
  const byName = getTagByName(slugOrName);
  if (byName) return byName.name;

  // フォールバック: ハイフンをスペースに
  return slugOrName.replace(/-/g, ' ');
}

export function getTagSlug(name: string): string {
  return getTagByName(name)?.slug ?? name;
}

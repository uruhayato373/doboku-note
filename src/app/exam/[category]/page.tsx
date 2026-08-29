import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import CategoryPage from '@/components/category/CategoryPage';
import { buildPageMetadata } from '@/lib/metadata';
import { getAllCategories, getCategoryBySlug } from '@/lib/categories';

type Params = { category: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getAllCategories()
    .filter((category) => category.variant === 'civil' || category.variant === 'pe')
    .map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category } = await params;
  const definition = getCategoryBySlug(category);
  if (!definition || (definition.variant !== 'civil' && definition.variant !== 'pe')) {
    return { title: '資格が見つかりません', robots: { index: false, follow: false } };
  }
  return buildPageMetadata({
    title: definition.label,
    description: definition.description ?? definition.subtitle,
    path: `/exam/${category}`,
  });
}

export default async function ExamCategoryPage({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  const definition = getCategoryBySlug(category);
  if (!definition || (definition.variant !== 'civil' && definition.variant !== 'pe')) notFound();
  return CategoryPage({ params: Promise.resolve({ slug: category }) });
}

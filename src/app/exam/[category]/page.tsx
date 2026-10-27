import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import CategoryPage from '@/components/category/CategoryPage';
import { buildPageMetadata } from '@/lib/metadata';
import { getCategoryBySlug, getExamCategories } from '@/lib/categories';
import { examHubPath } from '@/lib/route-paths';

type Params = { category: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getExamCategories().map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category } = await params;
  const definition = getCategoryBySlug(category);
  if (!definition || definition.area !== 'exam') {
    return { title: '資格が見つかりません', robots: { index: false, follow: false } };
  }
  return buildPageMetadata({
    title: definition.seoTitle ?? definition.label,
    description: definition.description ?? definition.subtitle,
    path: examHubPath(category),
  });
}

export default async function ExamCategoryPage({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  const definition = getCategoryBySlug(category);
  if (!definition || definition.area !== 'exam') notFound();
  return CategoryPage({ params: Promise.resolve({ slug: category }) });
}

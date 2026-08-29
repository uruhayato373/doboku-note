import type { Metadata } from 'next';
import CategoryPage from '@/components/category/CategoryPage';
import { buildPageMetadata } from '@/lib/metadata';
import { getCategoryBySlug } from '@/lib/categories';

const category = getCategoryBySlug('civil-practice')!;

export const metadata: Metadata = buildPageMetadata({
  title: category.label,
  description: category.description ?? category.subtitle,
  path: '/practice',
});

export default function PracticePage() {
  return CategoryPage({ params: Promise.resolve({ slug: 'civil-practice' }) });
}

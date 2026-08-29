import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  buildDocMetadata,
  renderDocPage,
} from '@/components/docs/DocPage';
import {
  findLegacySlugForPublicRoute,
  getAllPublicDocRoutes,
  isKnownPublicGroup,
} from '@/lib/content-routes';

type Params = { category: string; group: string; slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getAllPublicDocRoutes()
    .filter((route) => route.area === 'exam' && route.group)
    .map((route) => ({
      category: route.category,
      group: route.group!,
      slug: route.localSlug,
    }));
}

function resolve(params: Params): string | null {
  if (!isKnownPublicGroup(params.group)) return null;
  return findLegacySlugForPublicRoute('exam', params.category, params.group, params.slug);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolved = resolve(await params);
  return resolved
    ? buildDocMetadata(resolved)
    : { title: 'ページが見つかりません', robots: { index: false, follow: false } };
}

export default async function ExamDocPage({ params }: { params: Promise<Params> }) {
  const resolved = resolve(await params);
  if (!resolved) notFound();
  return renderDocPage(resolved);
}

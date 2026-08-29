import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { buildDocMetadata, renderDocPage } from '@/components/docs/DocPage';
import { findLegacySlugForPublicRoute, getAllPublicDocRoutes } from '@/lib/content-routes';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getAllPublicDocRoutes()
    .filter((route) => route.area === 'standards' && route.group === 'guides')
    .map((route) => ({ slug: route.localSlug }));
}

function resolve(slug: string): string | null {
  return findLegacySlugForPublicRoute('standards', 'reference-materials', 'guides', slug);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolved = resolve((await params).slug);
  return resolved
    ? buildDocMetadata(resolved)
    : { title: 'ページが見つかりません', robots: { index: false, follow: false } };
}

export default async function StandardsGuidePage({ params }: { params: Promise<Params> }) {
  const resolved = resolve((await params).slug);
  if (!resolved) notFound();
  return renderDocPage(resolved);
}

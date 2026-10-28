import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { buildDocMetadata, renderDocPage } from '@/components/docs/DocPage';
import { findLegacySlugForPublicRoute, getAllPublicDocRoutes } from '@/lib/content-routes';
import { NOT_FOUND_TITLE } from '@/lib/metadata';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getAllPublicDocRoutes()
    .filter((route) => route.area === 'laws')
    .map((route) => ({ slug: route.localSlug }));
}

function resolve(slug: string): string | null {
  return findLegacySlugForPublicRoute('laws', 'laws', null, slug);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolved = resolve((await params).slug);
  return resolved
    ? buildDocMetadata(resolved)
    : { title: NOT_FOUND_TITLE, robots: { index: false, follow: false } };
}

export default async function LawDocPage({ params }: { params: Promise<Params> }) {
  const resolved = resolve((await params).slug);
  if (!resolved) notFound();
  return renderDocPage(resolved);
}

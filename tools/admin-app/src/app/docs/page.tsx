import { DocRootView } from '@/components/DocRootView';
import { rootById } from '@/lib/document-roots';

export const dynamic = 'force-dynamic';

export default async function DocsPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const p = await searchParams;
  return <DocRootView descriptor={rootById('docs')!} query={p.q ?? ''} category={p.category ?? ''} />;
}

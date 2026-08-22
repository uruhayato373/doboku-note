import { DocDetailView } from '@/components/DocDetailView';
import { rootById } from '@/lib/document-roots';

export const dynamic = 'force-dynamic';

export default async function PlanDetailPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return <DocDetailView descriptor={rootById('plans')!} path={path} />;
}

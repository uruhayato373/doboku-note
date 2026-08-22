import { DocRootView } from '@/components/DocRootView';
import { rootById } from '@/lib/document-roots';

export const dynamic = 'force-dynamic';

/** 実行中の実装契約。**read-only** で、完了操作や削除ボタンは置かない（削除は実装側の責務）。 */
export default async function PlansPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const p = await searchParams;
  return <DocRootView descriptor={rootById('plans')!} query={p.q ?? ''} category={p.category ?? ''} />;
}

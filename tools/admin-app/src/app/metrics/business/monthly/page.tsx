import { PageHead } from '@/components/ui';
import { Stack } from '@/components/layout';
import { ReviewBody, ReviewUnavailable, loadReview } from '../review-parts';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ run?: string; tab?: string }> }) {
  const { run, tab } = await searchParams;
  const d = loadReview('monthly', run);
  if (!d) return <ReviewUnavailable title="月次レビュー" />;
  return (
    <Stack gap="lg">
      <PageHead title="月次レビュー" />
      <ReviewBody d={d} cadenceId="monthly" tab={tab} base="/metrics/business/monthly" />
    </Stack>
  );
}

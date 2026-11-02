import { PageHead } from '@/components/ui';
import { Stack } from '@/components/layout';
import { ReviewBody, ReviewUnavailable, loadReview } from '../review-parts';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ run?: string; tab?: string }> }) {
  const { run, tab } = await searchParams;
  const d = loadReview('weekly', run);
  if (!d) return <ReviewUnavailable title="週次レビュー" />;
  return (
    <Stack gap="lg">
      <PageHead title="週次レビュー" />
      <ReviewBody d={d} cadenceId="weekly" tab={tab} base="/metrics/business/weekly" />
    </Stack>
  );
}

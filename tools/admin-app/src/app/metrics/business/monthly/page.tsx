import { PageHead } from '@/components/ui';
import { Section, Stack } from '@/components/layout';
import { Checklist, Current, Outcome, ReviewUnavailable, RunPicker, loadReview } from '../review-parts';

export const dynamic = 'force-dynamic';

/** 戦略 ＞ レビュー ＞ 月次。回を選ぶと、その回の手順・実施・判断が出る（判定は scripts/lib/review-wiring.mjs）。 */
export default async function Page({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const { run } = await searchParams;
  const d = loadReview('monthly', run);
  if (!d) return <ReviewUnavailable title="月次レビュー" />;
  return (
    <Stack gap="lg">
      <PageHead title="月次レビュー" />
      <RunPicker base="/metrics/business/monthly" options={d.options} selected={d.selected.key} />
      <Section title="実施状況">
        <Current sel={d.selected} />
      </Section>
      {d.procedure && <Checklist procedure={d.procedure} />}
      {d.cadence && <Outcome c={d.cadence} review={d.selected.review} gate={d.selected.current ? d.gate : null} />}
    </Stack>
  );
}

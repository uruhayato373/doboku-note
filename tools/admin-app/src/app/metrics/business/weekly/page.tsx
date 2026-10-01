import { PageHead } from '@/components/ui';
import { Stack } from '@/components/layout';
import { Checklist, Current, DueLine, History, Outcome, ReviewUnavailable, loadReview } from '../review-parts';

export const dynamic = 'force-dynamic';

/** 戦略 ＞ レビュー ＞ 週次。前の月曜〜日曜を振り返る（手順の正本は review-wiring.json の weekly）。 */
export default function WeeklyReviewPage() {
  const d = loadReview('weekly');
  if (!d) return <ReviewUnavailable title="週次レビュー" />;
  return (
    <Stack gap="lg">
      <div className="flex flex-col gap-2">
        <PageHead title="週次レビュー" />
        <DueLine c={d.cadence} />
      </div>
      {d.runs.length > 0 && <Current run={d.runs[0]} due={d.cadence?.due} />}
      {d.procedure && <Checklist procedure={d.procedure} />}
      <History runs={d.runs} />
      {d.cadence && <Outcome c={d.cadence} gate={d.gate} />}
    </Stack>
  );
}

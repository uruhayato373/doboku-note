import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { Stack } from '@/components/layout';
import { Checklist, Current, DueLine, History, Outcome, ReviewUnavailable, loadReview } from '../review-parts';

export const dynamic = 'force-dynamic';

/**
 * 戦略 ＞ レビュー ＞ 月次。レビューで何をやるか（手順）と、実施できたか（証拠・判定・履歴）を管理する。
 * 前月の振り返りに向けた準備（データの確定・人の入力）は 計画 ＞ 月間（/todo?f=monthly）の「今月やること」。
 */
export default function MonthlyReviewPage() {
  const d = loadReview('monthly');
  if (!d) return <ReviewUnavailable title="月次レビュー" />;
  return (
    <Stack gap="lg">
      <div className="flex flex-col gap-2">
        <PageHead title="月次レビュー" />
        <DueLine c={d.cadence} />
        <Link className="text-xs" href="/todo?f=monthly">準備（今月やること）→ 計画 ＞ 月間</Link>
      </div>
      {d.runs.length > 0 && <Current run={d.runs[0]} due={d.cadence?.due} />}
      {d.procedure && <Checklist procedure={d.procedure} />}
      <History runs={d.runs} />
      {d.cadence && <Outcome c={d.cadence} gate={d.gate} />}
    </Stack>
  );
}

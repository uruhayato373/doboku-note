import Link from 'next/link';
import MetricsOverview from '@/components/MetricsOverview';
import { PageHead } from '@/components/ui';

export const dynamic = 'force-dynamic';

/** トップから開く詳細: 集客の推移とデータの更新状況。 */
export default function TrafficPage() {
  return (
    <>
      <PageHead title="集客の推移" />
      <p className="small"><Link href="/">← KPI へ戻る</Link></p>
      <MetricsOverview />
    </>
  );
}

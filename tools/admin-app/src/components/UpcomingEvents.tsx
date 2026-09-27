import Link from 'next/link';
import { upcomingEvents, DOMAINS, type ScheduleDomain } from '@/lib/schedule';

/**
 * 領域ページの「次の予定」。スケジュール（schedule-events.mjs）と同じデータから、その領域の
 * 今日以降の予定を数件だけ出す。予定を別に持たない（詳しくは /schedule?dom= へ）。
 */
export default async function UpcomingEvents({ domain, limit = 5 }: { domain: ScheduleDomain; limit?: number }) {
  const events = await upcomingEvents(domain, limit);
  const label = DOMAINS.find((d) => d.id === domain)?.label ?? domain;
  return (
    <div className="small" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <strong>次の予定（{label}）</strong>
        <Link href={`/schedule?dom=${domain}`}>スケジュールで見る</Link>
      </div>
      {events.length === 0 ? (
        <div className="muted">今日以降の予定はありません</div>
      ) : (
        events.map((e) => (
          <div key={e.id} className={e.status === 'overdue' ? 'project-warning-text' : undefined}>
            <span className="mono">{e.date.slice(5).replace('-', '/')}</span>{' '}
            <span className={`ch-dot ${e.channel}`} /> {e.label}
          </div>
        ))
      )}
    </div>
  );
}

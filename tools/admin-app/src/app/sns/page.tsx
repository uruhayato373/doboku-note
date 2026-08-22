import { PageHead } from '@/components/ui';
import { snsBoard } from '@/lib/sns-board';

export const dynamic = 'force-dynamic';

/** done/total を 20 分割の棒に。 */
function bar(done: number, total: number): string {
  const n = total > 0 ? Math.round((done / total) * 20) : 0;
  return '█'.repeat(n) + '░'.repeat(20 - n);
}

const SCHED_KEYS: [string, string][] = [
  ['ig_carousel_date', 'IG carousel'],
  ['ig_reels_date', 'IG reels'],
  ['yt_post_date', 'YouTube'],
];

export default async function SnsBoardPage() {
  const { ig, x, schedule } = await snsBoard();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming: { date: string; label: string; slug: string }[] = [];
  for (const s of schedule) {
    for (const [k, label] of SCHED_KEYS) {
      const v = s[k] as string | undefined;
      if (v && v >= today) upcoming.push({ date: v, label, slug: s.slug });
    }
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHead
        title="投稿状況"
        sub="読み取り専用 · content/sns/{schedule.json, instagram/**/posted.json, x/draft/**/status.json}"
      />

      <div className="card">
        <h2>
          Instagram 進捗
          <span className="sub">いずれか投稿済み {ig.totalDone} / {ig.total}</span>
        </h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>資格</th>
                <th className="num">DONE / 合計</th>
                <th>進捗</th>
                <th>C / R / S</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ig.byExam).map(([exam, s]) => (
                <tr key={exam}>
                  <td className="mono">{exam}</td>
                  <td className="num">
                    {s.done} / {s.total}
                  </td>
                  <td className="mono muted">{bar(s.done, s.total)}</td>
                  <td className="num">
                    {s.carousel} / {s.reels} / {s.stories}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>
          X ドラフト
          <span className="sub">
            合計 tweet {x.totals.tweets ?? 0} · 投稿 {x.totals.posted ?? 0} / 予約 {x.totals.scheduled ?? 0} / 下書 {x.totals.draft ?? 0}
          </span>
        </h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>ドラフト</th>
                <th>投稿 / 予約 / 下書</th>
                <th className="num">tweet数</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {x.drafts.map((d) => (
                <tr key={d.name}>
                  <td className="mono">{d.name}</td>
                  <td>
                    {d.counts.posted} / {d.counts.scheduled} / {d.counts.draft}
                  </td>
                  <td className="num">{d.total}</td>
                  <td className="muted">{d.updatedAt ? d.updatedAt.slice(0, 10) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>
          直近の予定
          <span className="sub">schedule.json · 今日以降 {upcoming.length} 件（先頭 40）</span>
        </h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>日付</th>
                <th>チャネル</th>
                <th>slug</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.slice(0, 40).map((u, i) => (
                <tr key={u.slug + u.label + i}>
                  <td>{u.date}</td>
                  <td>{u.label}</td>
                  <td className="mono">{u.slug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

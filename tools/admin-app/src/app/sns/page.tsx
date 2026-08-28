import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { snsBoard } from '@/lib/sns-board';
import { videoSnsJoin } from '@/lib/video-sns-join';
import { derivativeLabel } from '@/lib/video-outcomes';

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
  const join = videoSnsJoin();

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

      <div className="card" id="instagram">
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

      <div className="card" id="x">
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

      {/* 動画パック（DN-0110）× SNS。レガシー Shorts 台帳と混ぜないため節を分ける。 */}
      <div className="card" id="video">
        <h2>
          動画パック 派生物
          <span className="sub">
            video-content-status.json · 企画 {join.packTotal} 件中 制作が動いたもの {join.packDerivatives.length} 件
          </span>
        </h2>
        {join.packDerivatives.length === 0 ? (
          <p className="muted">
            まだ公開・予約された派生物はない（企画と台本のみ）。企画一覧は{' '}
            <Link href="/content/video">動画パック</Link>、成果は <Link href="/metrics/video">動画成果</Link>。
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>packId</th>
                  <th>派生物</th>
                  <th>状態</th>
                  <th>videoId</th>
                </tr>
              </thead>
              <tbody>
                {join.packDerivatives.flatMap((p) =>
                  p.derivatives.map((d) => (
                    <tr key={`${p.packId}-${d.key}`}>
                      <td className="mono">
                        <Link href={`/content/content~sns/video-packs/${p.exam}/${p.slug}`}>{p.packId}</Link>
                      </td>
                      <td className="small">{derivativeLabel(d.key)}</td>
                      <td className="mono small">{d.status}</td>
                      <td className="mono small">
                        {d.videoId ?? <span className="muted">—</span>}
                        {d.key.startsWith('shorts') && d.videoId && !d.relatedVideoId && (
                          <span className="badge bad" style={{ marginLeft: 4 }}>
                            関連動画なし
                          </span>
                        )}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted" style={{ marginBottom: 0 }}>
          Shorts 台帳（<code>.claude/state/youtube-schedule.json</code>）は IG 過去問パック由来の
          <strong>レガシー{join.legacyShorts.ok ? ` ${join.legacyShorts.total} 本` : ''}</strong>
          で、動画パックとは別系統（台帳側に packId は
          {join.legacyShorts.packLinked === 0 ? '無い' : ` ${join.legacyShorts.packLinked} 件`}）。
          {join.legacyShorts.ok
            ? ` 内訳: 公開 ${join.legacyShorts.byStage.published ?? 0} / 予約 ${join.legacyShorts.byStage.scheduled ?? 0} / 停止 ${join.legacyShorts.byStage.retired ?? 0}。`
            : ` 台帳を読めていない: ${join.legacyShorts.reason}。`}
        </p>
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

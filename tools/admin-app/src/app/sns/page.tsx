import Link from 'next/link';
import UpcomingEvents from '@/components/UpcomingEvents';
import { numCol, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { snsBoard } from '@/lib/sns-board';
import { videoSnsJoin } from '@/lib/video-sns-join';
import { derivativeLabel } from '@/lib/video-outcomes';
import { todayJst } from '../../../../../scripts/lib/jst-date.mjs';

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

  const today = todayJst();
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
      <PageHead title="投稿状況" />
      {/* SNS はサイドバーの枝にせずこのページの節にする（domains.json navRules）。素材の作業場はここから開く */}
      <nav className="filterbar" style={{ marginBottom: 12 }}>
        <a className="chip" href="#instagram">Instagram</a>
        <a className="chip" href="#x">X</a>
        <a className="chip" href="#video">YouTube・動画</a>
        <span className="small muted" style={{ marginLeft: 'auto' }}>
          <Link href="/gallery/sns?ch=instagram">Instagram 画像・動画</Link>
          <Link href="/gallery/sns?ch=x" style={{ marginLeft: 12 }}>X 画像</Link>
          <Link href="/content/video" style={{ marginLeft: 12 }}>動画パック</Link>
        </span>
      </nav>
      <UpcomingEvents domain="sns" />

      <div id="instagram" className="mb-4">
      <PanelCard title="Instagram 進捗" description={`いずれか投稿済み ${ig.totalDone} / ${ig.total}`}>
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>資格</TableHead>
              <TableHead className={numCol}>DONE / 合計</TableHead>
              <TableHead>進捗</TableHead>
              <TableHead>C / R / S</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(ig.byExam).map(([exam, s]) => (
              <TableRow key={exam}>
                <TableCell className="font-mono">{exam}</TableCell>
                <TableCell className={numCol}>
                  {s.done} / {s.total}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">{bar(s.done, s.total)}</TableCell>
                <TableCell className={numCol}>
                  {s.carousel} / {s.reels} / {s.stories}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      </PanelCard>
      </div>

      <div id="x" className="mb-4">
      <PanelCard
        title="X ドラフト"
        description={`合計 tweet ${x.totals.tweets ?? 0} · 投稿 ${x.totals.posted ?? 0} / 予約投入済 ${x.totals.queued ?? 0} / 未投入計画 ${x.totals.scheduled ?? 0} / 下書 ${x.totals.draft ?? 0}`}
      >
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>ドラフト</TableHead>
              <TableHead>投稿 / 予約投入済 / 未投入計画 / 下書</TableHead>
              <TableHead className={numCol}>tweet数</TableHead>
              <TableHead>更新</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {x.drafts.map((d) => (
              <TableRow key={d.name}>
                <TableCell className="font-mono">{d.name}</TableCell>
                <TableCell>
                  {d.counts.posted} / {d.counts.queued} / {d.counts.scheduled} / {d.counts.draft}
                </TableCell>
                <TableCell className={numCol}>{d.total}</TableCell>
                <TableCell className="text-muted-foreground">{d.updatedAt ? d.updatedAt.slice(0, 10) : ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      </PanelCard>
      </div>

      {/* 動画パック（DN-0110）× SNS。レガシー Shorts 台帳と混ぜないため節を分ける。 */}
      <div id="video" className="mb-4">
      <PanelCard
        title="動画パック 派生物"
        description={`video-content-status.json · 企画 ${join.packTotal} 件中 制作が動いたもの ${join.packDerivatives.length} 件`}
      >
        {join.packDerivatives.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まだ公開・予約された派生物はない（企画と台本のみ）。企画一覧は{' '}
            <Link href="/content/video">動画パック</Link>、成果は <Link href="/metrics/video">動画成果</Link>。
          </p>
        ) : (
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>packId</TableHead>
                <TableHead>派生物</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>videoId</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {join.packDerivatives.flatMap((p) =>
                p.derivatives.map((d) => (
                  <TableRow key={`${p.packId}-${d.key}`}>
                    <TableCell className="font-mono">
                      <Link href={`/content/content~sns/video-packs/${p.exam}/${p.slug}`}>{p.packId}</Link>
                    </TableCell>
                    <TableCell className="text-xs">{derivativeLabel(d.key)}</TableCell>
                    <TableCell className="font-mono text-xs">{d.status}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {d.videoId ?? <span className="text-muted-foreground">—</span>}
                      {d.key.startsWith('shorts') && d.videoId && !d.relatedVideoId && (
                        <span className="ml-1">
                          <StatusBadge tone="bad">関連動画なし</StatusBadge>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </TableFrame>
        )}
        <p className="text-xs text-muted-foreground">
          Shorts 台帳（<code>.claude/state/youtube-schedule.json</code>）は IG 過去問パック由来の
          <strong>レガシー{join.legacyShorts.ok ? ` ${join.legacyShorts.total} 本` : ''}</strong>
          で、動画パックとは別系統（台帳側に packId は
          {join.legacyShorts.packLinked === 0 ? '無い' : ` ${join.legacyShorts.packLinked} 件`}）。
          {join.legacyShorts.ok
            ? ` 内訳: 公開 ${join.legacyShorts.byStage.published ?? 0} / 予約 ${join.legacyShorts.byStage.scheduled ?? 0} / 停止 ${join.legacyShorts.byStage.retired ?? 0}。`
            : ` 台帳を読めていない: ${join.legacyShorts.reason}。`}
        </p>
      </PanelCard>
      </div>

      <PanelCard title="直近の予定" description={`schedule.json · 今日以降 ${upcoming.length} 件（先頭 40）`}>
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>日付</TableHead>
              <TableHead>チャネル</TableHead>
              <TableHead>slug</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {upcoming.slice(0, 40).map((u, i) => (
              <TableRow key={u.slug + u.label + i}>
                <TableCell>{u.date}</TableCell>
                <TableCell>{u.label}</TableCell>
                <TableCell className="font-mono">{u.slug}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      </PanelCard>
    </>
  );
}

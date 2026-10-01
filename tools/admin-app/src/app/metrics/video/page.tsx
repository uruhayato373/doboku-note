import Link from 'next/link';
import { PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, numCol, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { videoOutcomes, derivativeLabel } from '@/lib/video-outcomes';
import { LABELS } from '@/lib/lifecycle';
import { examLabel, stageClass } from '@/lib/video-board';

export const dynamic = 'force-dynamic';

/**
 * /metrics/video — 動画パックの「公開状態 × 送客成果」（read-only）。
 *
 * 計測は CI 供給が正（fetch-metrics.yml の GA4 campaign スナップショット）。
 * **未取得と 0 件を区別**して表示し、未取得のときに全件 0 の緑を出さない。
 */
export default async function VideoOutcomesPage() {
  const { rows, metrics, otherCampaigns, verification } = videoOutcomes();
  const published = rows.filter((r) => r.anyPublished);
  const measurable = metrics.ok ? published.filter((r) => (r.sessions ?? 0) > 0).length : null;

  return (
    <>
      <PageHead
        title="動画成果"
        sub="動画パック × 公開状態 × GA4 送客（utm_campaign = packId で join・read-only）"
      />

      <nav className="project-crumbs" aria-label="パンくず">
        <Link href="/content/video">動画パック</Link>
        {' · '}
        <Link href="/sns">投稿状況</Link>
        {' · '}
        <Link href="/metrics/ga4">アクセス（GA4）</Link>
      </nav>

      <Stack>
      <PanelCard title="計測データ" description=".claude/state/metrics/ga4/ga4-campaign-*.json（CI 供給）">
        {metrics.ok ? (
          <div className="filterbar">
            <StatusBadge tone="good">取得済み</StatusBadge>
            <StatusBadge tone="neutral">
              期間 {metrics.startDate} 〜 {metrics.endDate}
            </StatusBadge>
            <StatusBadge tone={(metrics.ageDays ?? 0) > 9 ? 'warn' : 'neutral'}>
              鮮度 {metrics.ageDays ?? '?'} 日
            </StatusBadge>
            <StatusBadge tone="neutral">campaign {metrics.campaignRows} 件</StatusBadge>
          </div>
        ) : (
          <>
            <p><StatusBadge tone="bad">未取得</StatusBadge></p>
            <p className="text-muted-foreground">{metrics.reason}</p>
            <p className="text-xs text-muted-foreground">
              このため送客列は「0」ではなく「—」で表示している（未取得と流入ゼロを混同しない）。
            </p>
          </>
        )}
      </PanelCard>

      <PanelCard title="公開実体の照合" description="verify-video-publication（CI 週次）· .claude/state/video-publication-verify.json">
        {!verification.exists ? (
          <>
            <p><StatusBadge tone="neutral">未実行</StatusBadge></p>
            <p className="text-xs text-muted-foreground">
              まだ一度も実査していない。公開済みの派生物が出たら CI（🔎 Verify YouTube publish status）が
              毎週照合し、削除・非公開・概要欄の UTM 欠落・Short の関連動画未設定を検出する。
            </p>
          </>
        ) : (
          <>
            <div className="filterbar">
              <StatusBadge tone={verification.findings.length ? 'bad' : 'good'}>
                {verification.findings.length ? `ドリフト ${verification.findings.length} 件` : 'ドリフトなし'}
              </StatusBadge>
              <StatusBadge tone="neutral">照合 {verification.checked} 件</StatusBadge>
              <StatusBadge tone={(verification.ageDays ?? 0) > 14 ? 'warn' : 'neutral'}>
                {verification.ageDays === null ? '日時不明' : `${verification.ageDays} 日前`}
              </StatusBadge>
            </div>
            {verification.checked === 0 && (
              <p className="text-xs text-muted-foreground">
                照合対象 0 件（公開済みの派生物がまだ無い）。異常 0 件とは異なる。
              </p>
            )}
            {verification.findings.length > 0 && (
              <ul className="small">
                {verification.findings.map((f, i) => (
                  <li key={i}>
                    <span className="mono">{f.id}</span> [{f.code}] {f.message}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </PanelCard>

      <PanelCard title="サマリ" description="公開済み＝派生物のいずれかが published 以降">
        <div className="filterbar">
          <StatusBadge tone="neutral">企画 {rows.length}</StatusBadge>
          <StatusBadge tone={published.length ? 'good' : 'neutral'}>
            公開済み {published.length}
          </StatusBadge>
          <StatusBadge tone="neutral">
            送客あり {measurable === null ? '未取得' : measurable}
          </StatusBadge>
        </div>
        {published.length === 0 && (
          <p className="text-xs text-muted-foreground">
            まだ公開済みの派生物がない。成果の判断は公開後 6 週間で行う（docs/marketing/06_動画コンテンツ運用設計.md §8 Phase 5）。
          </p>
        )}
      </PanelCard>

      <PanelCard title="パック別" description="公開済み → 送客の多い順">
        <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>段階</TableHead>
                <TableHead>packId</TableHead>
                <TableHead>派生物の公開状態</TableHead>
                <TableHead className={numCol}>セッション</TableHead>
                <TableHead className={numCol}>ユーザー</TableHead>
                <TableHead>主CTA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.packId}>
                  <TableCell>
                    <StatusBadge tone={stageClass(r.stage) as Tone}>
                      {r.stage ? LABELS[r.stage] : '不明'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="font-mono">
                    <Link href={`/content/content~sns/video-packs/${r.exam}/${r.slug}`}>{r.packId}</Link>
                    <div className="text-xs text-muted-foreground">{examLabel(r.exam)}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.derivatives.length === 0 ? (
                      <span className="text-muted-foreground">未登録</span>
                    ) : (
                      r.derivatives.map((d) => (
                        <span key={d.key} className="mr-2">
                          {derivativeLabel(d.key)}:{' '}
                          <span className="font-mono">{d.status}</span>
                          {d.videoId && <span className="text-muted-foreground"> ({d.videoId})</span>}
                          {d.key.startsWith('shorts') &&
                            ['published', 'measured'].includes(d.status) &&
                            !d.relatedVideoId && (
                              <span className="ml-1">
                                <StatusBadge tone="bad">関連動画なし</StatusBadge>
                              </span>
                            )}
                        </span>
                      ))
                    )}
                  </TableCell>
                  <TableCell className={numCol}>
                    {r.sessions === null ? <span className="text-muted-foreground">—</span> : r.sessions || <span className="text-muted-foreground">0</span>}
                  </TableCell>
                  <TableCell className={numCol}>
                    {r.activeUsers === null ? <span className="text-muted-foreground">—</span> : r.activeUsers || <span className="text-muted-foreground">0</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.cta ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
        </TableFrame>
      </PanelCard>

      {metrics.ok && otherCampaigns.length > 0 && (
        <PanelCard title="パック外の campaign" description="既存 UTM（note・X 等）。動画パックとは無関係だが取り違え防止に併記">
          <TableFrame>
              <TableHeader>
                <TableRow>
                  <TableHead>campaign</TableHead>
                  <TableHead className={numCol}>セッション</TableHead>
                  <TableHead className={numCol}>ユーザー</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherCampaigns.map((c) => (
                  <TableRow key={c.campaign}>
                    <TableCell className="font-mono text-xs">{c.campaign}</TableCell>
                    <TableCell className={numCol}>{c.sessions}</TableCell>
                    <TableCell className={numCol}>{c.activeUsers}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </TableFrame>
        </PanelCard>
      )}
      </Stack>
    </>
  );
}

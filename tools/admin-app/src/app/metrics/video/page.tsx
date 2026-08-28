import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { videoOutcomes, derivativeLabel } from '@/lib/video-outcomes';
import { LABELS } from '@/lib/lifecycle';
import { EXAM_LABELS, stageClass } from '@/lib/video-board';

export const dynamic = 'force-dynamic';

/**
 * /metrics/video — 動画パックの「公開状態 × 送客成果」（read-only）。
 *
 * 計測は CI 供給が正（fetch-metrics.yml の GA4 campaign スナップショット）。
 * **未取得と 0 件を区別**して表示し、未取得のときに全件 0 の緑を出さない。
 */
export default async function VideoOutcomesPage() {
  const { rows, metrics, otherCampaigns } = videoOutcomes();
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

      <div className="card">
        <h2>
          計測データ
          <span className="sub">.claude/state/metrics/ga4/ga4-campaign-*.json（CI 供給）</span>
        </h2>
        {metrics.ok ? (
          <div className="filterbar">
            <span className="badge good">取得済み</span>
            <span className="badge neutral">
              期間 {metrics.startDate} 〜 {metrics.endDate}
            </span>
            <span className={'badge ' + ((metrics.ageDays ?? 0) > 9 ? 'warn' : 'neutral')}>
              鮮度 {metrics.ageDays ?? '?'} 日
            </span>
            <span className="badge neutral">campaign {metrics.campaignRows} 件</span>
          </div>
        ) : (
          <>
            <p className="badge bad">未取得</p>
            <p className="muted">{metrics.reason}</p>
            <p className="muted small">
              このため送客列は「0」ではなく「—」で表示している（未取得と流入ゼロを混同しない）。
            </p>
          </>
        )}
      </div>

      <div className="card">
        <h2>
          サマリ
          <span className="sub">公開済み＝派生物のいずれかが published 以降</span>
        </h2>
        <div className="filterbar">
          <span className="badge neutral">企画 {rows.length}</span>
          <span className={'badge ' + (published.length ? 'good' : 'neutral')}>
            公開済み {published.length}
          </span>
          <span className="badge neutral">
            送客あり {measurable === null ? '未取得' : measurable}
          </span>
        </div>
        {published.length === 0 && (
          <p className="muted small">
            まだ公開済みの派生物がない。成果の判断は公開後 6 週間で行う（docs/marketing/06_動画コンテンツ運用設計.md §8 Phase 5）。
          </p>
        )}
      </div>

      <div className="card">
        <h2>
          パック別
          <span className="sub">公開済み → 送客の多い順</span>
        </h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>段階</th>
                <th>packId</th>
                <th>派生物の公開状態</th>
                <th className="num">セッション</th>
                <th className="num">ユーザー</th>
                <th>主CTA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.packId}>
                  <td>
                    <span className={`badge ${stageClass(r.stage)}`}>
                      {r.stage ? LABELS[r.stage] : '不明'}
                    </span>
                  </td>
                  <td className="mono">
                    <Link href={`/content/content~sns/video-packs/${r.exam}/${r.slug}`}>{r.packId}</Link>
                    <div className="muted small">{EXAM_LABELS[r.exam] ?? r.exam}</div>
                  </td>
                  <td className="small">
                    {r.derivatives.length === 0 ? (
                      <span className="muted">未登録</span>
                    ) : (
                      r.derivatives.map((d) => (
                        <span key={d.key} style={{ marginRight: 8 }}>
                          {derivativeLabel(d.key)}:{' '}
                          <span className="mono">{d.status}</span>
                          {d.videoId && <span className="muted"> ({d.videoId})</span>}
                          {d.key.startsWith('shorts') &&
                            ['published', 'measured'].includes(d.status) &&
                            !d.relatedVideoId && (
                              <span className="badge bad" style={{ marginLeft: 4 }}>
                                関連動画なし
                              </span>
                            )}
                        </span>
                      ))
                    )}
                  </td>
                  <td className="num">
                    {r.sessions === null ? <span className="muted">—</span> : r.sessions || <span className="muted">0</span>}
                  </td>
                  <td className="num">
                    {r.activeUsers === null ? <span className="muted">—</span> : r.activeUsers || <span className="muted">0</span>}
                  </td>
                  <td className="mono small">{r.cta ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {metrics.ok && otherCampaigns.length > 0 && (
        <div className="card">
          <h2>
            パック外の campaign
            <span className="sub">既存 UTM（note・X 等）。動画パックとは無関係だが取り違え防止に併記</span>
          </h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>campaign</th>
                  <th className="num">セッション</th>
                  <th className="num">ユーザー</th>
                </tr>
              </thead>
              <tbody>
                {otherCampaigns.map((c) => (
                  <tr key={c.campaign}>
                    <td className="mono small">{c.campaign}</td>
                    <td className="num">{c.sessions}</td>
                    <td className="num">{c.activeUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

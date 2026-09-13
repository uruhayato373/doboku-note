import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { report } from '../../../../../../scripts/lib/seo-rank-watch.mjs';

export const dynamic = 'force-dynamic';

const labels: Record<string, string> = {
  active: '改善候補', 'pending-deploy': '本番反映待ち', observing: '観察中', achieved: '1位達成・監視', paused: '再検討待ち',
};
const rank = (n: number | null | undefined) => n == null ? '—' : n.toFixed(2);
const percent = (n: number | null | undefined) => n == null ? '—' : `${(n * 100).toFixed(1)}%`;

export default function SeoWatchPage() {
  let data;
  try { data = report(findRepoRoot()); } catch {
    return <><PageHead title="検索順位の改善" sub="SEO Rank Watch" /><div className="card"><p className="badge bad">監視データを読み取れません</p><p>設定・実験台帳・GSC履歴を確認してください。</p></div></>;
  }
  return <>
    <PageHead title="検索順位の改善" sub="検索ニーズに応える改善を1件ずつ行い、本番反映後の実測で確認する" />
    <nav className="project-crumbs"><Link href="/metrics/gsc">GSC全体</Link>{' · '}<Link href="/todo">バックログ</Link></nav>
    <div className="card">
      <h2>次の改善</h2>
      <p>{data.selected ? `候補: ${data.selected.keyword}（平均 ${rank(data.selected.current?.rank)} 位）` : '今すぐ実施できる改善はありません。'}</p>
      {!data.capacity && <p className="badge warn">同時実行上限に達しています。既存実験のレビューを先に行います。</p>}
      {!data.capacity && <ul>{data.activeExperiments.map((e: { id: string; title: string; nextReviewDate: string | null }) => <li key={e.id}>{e.id}: {e.title}（レビュー {e.nextReviewDate ?? '未設定'}）</li>)}</ul>}
      {data.due.length > 0 && <p className="badge warn">レビュー期限到来: {data.due.join('、')}</p>}
      <p className="muted small">順位は日本・登録デバイス範囲のGSC平均値です。前期差は非重複の7日比較で、プラスが上昇。欠測はインデックス未登録を意味しません。</p>
    </div>
    <div className="card">
      <h2>監視キーワード</h2>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>キーワード / 期間</th><th>状態</th><th className="num">平均順位</th><th className="num">前期差</th><th className="num">表示</th><th className="num">クリック / CTR</th><th>次回レビュー</th></tr></thead>
        <tbody>{data.rows.map((w: any) => <tr key={w.id}>
          <td><a href={`https://doboku-note.com${w.targetPath}`} target="_blank" rel="noreferrer">{w.keyword}</a><div className="muted small">{w.period ? `${w.period.startDate}〜${w.period.endDate}` : '未計測'} · {w.country ?? '全地域'} / {w.device ?? '全デバイス'}</div></td>
          <td><span className={`badge ${w.status === 'achieved' ? 'good' : w.status === 'observing' ? 'neutral' : 'warn'}`}>{labels[w.status]}</span>{!w.fresh && <div className="small">要取得</div>}</td>
          <td className="num">{rank(w.current?.rank)}</td><td className="num">{w.delta == null ? '—' : `${w.delta > 0 ? '+' : ''}${w.delta.toFixed(2)}`}</td>
          <td className="num">{w.current?.impressions ?? '—'}</td><td className="num">{w.current?.clicks ?? '—'} / {percent(w.current?.ctr)}</td><td>{w.nextReviewDate ?? '—'}</td>
        </tr>)}</tbody>
      </table></div>
    </div>
    {data.rows.map((w: any) => <div className="card" key={w.id}>
      <h2>{w.keyword}<span className="sub">{labels[w.status]}</span></h2>
      <div className="filterbar"><span className="badge neutral">平均 {rank(w.current?.rank)} 位</span><span className="badge neutral">{w.current?.impressions ?? "—"} 表示</span>{w.nextReviewDate && <span className="badge neutral">レビュー {w.nextReviewDate}</span>}</div>
      {w.pauseReason && <p className="badge warn">{w.pauseReason}</p>}
      {w.actions.length === 0 ? <p className="muted">改善はまだ記録されていません。上位ページと比較し、不足を確認してから着手します。</p> : w.actions.map((a: any, i: number) => <div key={i}>
        <h3>{a.date} · {a.method}</h3><p><strong>検索ニーズ:</strong> {a.needs}</p><p><strong>不足:</strong> {a.gap}</p><p><strong>実施:</strong> {a.done}</p>
        <p className="small">比較したページ: {a.serp.map((s: any, n: number) => <span key={s.url}>{n > 0 ? ' · ' : ''}<a href={s.url} target="_blank" rel="noreferrer">上位参考 {n + 1}</a></span>)}</p>
      </div>)}
      {w.lastReview && <p className="small">最終判定: {w.lastReview.date} / {w.lastReview.outcome} / {w.lastReview.days}日比較。施策の因果効果は断定しません。</p>}
    </div>)}
    <div className="card"><h2>運用</h2><p>計測と履歴の保存は週次CI、検索意図の分析と1件の改善は weekly-improve が担当します。観察中のページは再編集できません。表示回数が足りなければ14日・28日へ延長します。</p><p className="small mono">npm run seo-rank-watch -- report<br />npm run seo-rank-watch -- review --no-fetch<br />npm run check-seo-rank-watch</p></div>
  </>;
}

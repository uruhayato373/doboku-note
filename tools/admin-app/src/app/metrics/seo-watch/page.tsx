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
const stateLabel = (w: any) => w.mode === 'monitor' && w.status === 'active' ? '監視のみ' : labels[w.status];

export default function SeoWatchPage() {
  let data;
  try { data = report(findRepoRoot()); } catch {
    return <><PageHead title="検索順位の改善" sub="SEO Rank Watch" /><div className="card"><p className="badge bad">監視データを読み取れません</p><p>設定・実験台帳・GSC履歴を確認してください。</p></div></>;
  }
  return <>
    <PageHead title="検索順位の改善" sub="資格受験者の課題を優先し、1件の改善と本番反映後の実測を積み重ねる" />
    <nav className="project-crumbs"><Link href="/metrics/gsc">GSC全体</Link>{' · '}<Link href="/todo">バックログ</Link></nav>
    <div className="card">
      <h2>資格検索の方針</h2>
      <p>{data.strategy.objective}</p>
      <p><strong>選定順:</strong> {data.selectionOrder}</p>
      <p className="small">一般用語・広い資格名・ツールは監視し、記事改善の枠には入れません。資格名の有無だけでなく、誰の学習をどう助けるかで判断します。</p>
      <p className={`badge ${data.policyReviewDue ? 'warn' : 'neutral'}`}>方針の次回見直し: {data.policyNextReviewDate}{data.policyReviewDue ? '（期限到来）' : ''}</p>
    </div>
    <div className="card">
      <h2>資格ごとの候補</h2>
      {data.qualifications.map((q: any) => <div key={q.id}><h3>{q.label}</h3><p>{q.candidate ?? '条件を満たす記事候補はありません。'}</p><p className="muted small">監視 {q.watches}語 · 新鮮な計測 {q.measured}語 · 直近28日の改善 {q.recentActions}件</p></div>)}
    </div>
    <div className="card">
      <h2>次の改善</h2>
      <p>{data.selected ? `候補: ${data.selected.keyword}（平均 ${rank(data.selected.current?.rank)} 位）` : '今すぐ実施できる改善はありません。'}</p>
      {data.candidate && <p><strong>{data.selected ? '選定理由' : data.policyReviewDue ? '方針確認後の第一候補' : '枠が空いた場合の第一候補'}:</strong> {data.candidate.keyword} — {data.candidate.reason}<br />{data.candidate.rationale}</p>}
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
          <td><a href={`https://doboku-note.com${w.targetPath}`} target="_blank" rel="noreferrer">{w.keyword}</a><div className="small">{w.qualificationLabel} · {w.intentLabel}</div><div className="muted small">{w.period ? `${w.period.startDate}〜${w.period.endDate}` : '未計測'} · {w.country ?? '全地域'} / {w.device ?? '全デバイス'}</div></td>
          <td><span className={`badge ${w.status === 'achieved' ? 'good' : w.mode === 'monitor' || w.status === 'observing' ? 'neutral' : 'warn'}`}>{stateLabel(w)}</span>{!w.fresh && <div className="small">要取得</div>}</td>
          <td className="num">{rank(w.current?.rank)}</td><td className="num">{w.delta == null ? '—' : `${w.delta > 0 ? '+' : ''}${w.delta.toFixed(2)}`}</td>
          <td className="num">{w.current?.impressions ?? '—'}</td><td className="num">{w.current?.clicks ?? '—'} / {percent(w.current?.ctr)}</td><td>{w.nextReviewDate ?? '—'}</td>
        </tr>)}</tbody>
      </table></div>
    </div>
    <div className="card">
      <h2>実行・方針レビューの記録</h2>
      <p className="small muted">改善しなかった回も理由を残します。順位の履歴と改善履歴は別々に保ち、設定が変わっても当時の選定理由は書き換えません。</p>
      {data.lastRuns.length === 0 ? <p>実行記録はまだありません。</p> : data.lastRuns.map((r: any) => <details key={r.file}><summary>{r.date} · {r.type === 'policy-review' ? '方針レビュー' : '実行記録'} · {r.result === 'failed' ? '取得・実行失敗' : r.result === 'policy-review-due' ? '方針の確認待ち' : r.result === 'capacity-limit' ? '実験上限で待機' : r.result === 'ready' ? '改善候補あり' : '対象なし'}</summary><p>{r.note || '計測と候補の判定を保存しました。'}</p><p className="small">第一候補: {r.rows.find((w: any) => w.id === r.candidateId)?.keyword ?? 'なし'} · 方針 v{r.strategy.version}</p><ul>{r.rows.map((w: any) => <li key={w.id}>{w.keyword}: {w.reason}</li>)}</ul></details>)}
    </div>
    {data.rows.map((w: any) => <div className="card" key={w.id} data-watch-id={w.id}>
      <h2>{w.keyword}<span className="sub">{stateLabel(w)}</span></h2>
      <div className="filterbar"><span className="badge neutral">平均 {rank(w.current?.rank)} 位</span><span className="badge neutral">{w.current?.impressions ?? "—"} 表示</span>{w.nextReviewDate && <span className="badge neutral">レビュー {w.nextReviewDate}</span>}</div>
      <p><strong>読者:</strong> {w.audience}<br /><strong>知りたいこと:</strong> {w.need}</p>
      <p><strong>登録理由:</strong> {w.rationale}</p><p><strong>次の学習行動:</strong> <a href={`https://doboku-note.com${w.nextStep.path}`} target="_blank" rel="noreferrer">{w.nextStep.label}</a></p>
      <p className="small">判定: {w.reason} · 試験時期: {w.season.label}{w.season.active ? `（${w.season.daysUntil}日後）` : ''} · 登録根拠: {w.evidence.kind === 'gsc' ? 'GSCに実測あり' : '受験課題の仮説・需要未確認'}</p>
      {w.pauseReason && <p className="badge warn">{w.pauseReason}</p>}
      {w.actions.length === 0 ? <p className="muted">{w.mode === 'monitor' ? '計測のみ継続します。' : '改善はまだ記録されていません。上位ページと比較し、不足を確認してから着手します。'}</p> : w.actions.map((a: any, i: number) => <div key={i}>
        <h3>{a.date} · {a.method}</h3><p><strong>検索ニーズ:</strong> {a.needs}</p><p><strong>不足:</strong> {a.gap}</p><p><strong>実施:</strong> {a.done}</p>
        {a.selection && <p className="small">改善時の方針 v{a.selection.strategyVersion}: {a.selection.rationale}</p>}
        <p className="small">比較したページ: {a.serp.map((s: any, n: number) => <span key={s.url}>{n > 0 ? ' · ' : ''}<a href={s.url} target="_blank" rel="noreferrer">上位参考 {n + 1}</a></span>)}</p>
      </div>)}
      {w.lastReview && <p className="small">最終判定: {w.lastReview.date} / {w.lastReview.outcome} / {w.lastReview.days}日比較。施策の因果効果は断定しません。</p>}
    </div>)}
    <div className="card"><h2>運用</h2><p>週次CIが計測を保存し、日次のSEO Rank Watchが資格別候補・観察期限を確認します。観察中は再編集せず、表示回数不足なら14日・28日へ延長します。方針レビューでは資格別の流入・学習導線と改善履歴を確認し、監視語の入替による数値増加を効果と混同しません。</p><p className="small mono">npm run seo-rank-watch -- report<br />npm run seo-rank-watch -- review --no-fetch<br />npm run seo-rank-watch -- log-run --commit<br />npm run check-seo-rank-watch</p></div>
  </>;
}

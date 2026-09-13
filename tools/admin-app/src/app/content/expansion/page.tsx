import Link from 'next/link';
import styles from './page.module.css';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { expansionReport, DECISION_LABELS } from '../../../../../../scripts/lib/content-expansion.mjs';

export const dynamic = 'force-dynamic';
const evidenceLabels: Record<string, string> = { 'body-reviewed': '本文照合', 'prior-review': '過去の照合記録', 'topic-map': '概念名の対応のみ', 'source-unavailable': '原典不足' };
const label = (key: string) => (DECISION_LABELS as Record<string, string>)[key] ?? key;
export default async function ContentExpansionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const search = await searchParams;
  let report: ReturnType<typeof expansionReport>;
  try { report = expansionReport(findRepoRoot()); }
  catch { return <><PageHead title="教材からの展開" /><p className="card">対応表を読み取れません。未確認です。</p></>; }
  const filtered = report.sources.filter((s: any) => !search.source || search.source === s.sourceId);
  const selected = filtered.flatMap((source: any) => source.units.filter((u: any) => !search.state || (search.state === 'pending' ? u.pending : search.state === 'blocked' ? u.sourceWaiting : search.state === 'stale' ? u.stale : true)).map((unit: any) => ({ source, unit })));
  const pageCount = Math.max(1, Math.ceil(selected.length / 100));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(search.page ?? '1', 10) || 1));
  const visible = selected.slice((page - 1) * 100, page * 100);
  const pageHref = (next: number) => {
    const query = new URLSearchParams({ page: String(next) });
    if (search.source) query.set('source', search.source);
    if (search.state) query.set('state', search.state);
    return `/content/expansion?${query}`;
  };
  const s = report.summary;
  return <div className={styles.view}>
    <PageHead title="教材からの展開" sub={`確認日 ${report.reviewedAt} · 記事・図解・SNSの対応と残作業`} />
    <div className="card"><p>{report.scopeNote}</p><p>教材 {s.reviewedSources}/{s.expectedSources} 件・論点 {s.units} 件。要作業・未確認 {s.pending} 件、原典待ち {s.blocked} 件、変更後の再確認 {s.stale} 件。</p><p className="small">「内容対応あり」は教材の全文検証や公開を意味しません。概念名の対応のみの項目は未確認に含めます。原典不足で一部対応の項目は原典待ちに含めます。図や投稿の数を学習効果・販売成果とみなしません。</p><nav className="filterbar"><Link href="/metrics/business">事業方針とKPI</Link><Link href="/content/lifecycle">公開状況</Link><Link href="/todo">実装タスク</Link></nav></div>
    {report.issues.length > 0 && <div className="card"><h2>台帳の確認が必要です</h2><ul>{report.issues.map((x: string) => <li key={x}>{x}</li>)}</ul></div>}
    <form className="business-form"><label>教材 <select name="source" defaultValue={search.source ?? ''}><option value="">すべて</option>{report.sources.map((x: any) => <option key={x.sourceId} value={x.sourceId}>{x.title}</option>)}</select></label><label>対象 <select name="state" defaultValue={search.state ?? ''}><option value="">すべて</option><option value="pending">要作業・未確認</option><option value="blocked">原典待ち</option><option value="stale">変更後の再確認</option></select></label><button>表示</button></form>
    <nav className="filterbar" aria-label="論点一覧のページ"><span>{selected.length} 件中 {visible.length ? (page - 1) * 100 + 1 : 0}〜{Math.min(page * 100, selected.length)} 件</span>{page > 1 && <Link href={pageHref(page - 1)}>前の100件</Link>}{page < pageCount && <Link href={pageHref(page + 1)}>次の100件</Link>}</nav>
    {filtered.map((source: any) => { const units = visible.filter((x: any) => x.source.sourceId === source.sourceId).map((x: any) => x.unit); if (!units.length) return null; return <section className="card" key={source.sourceId}><h2>{source.title}</h2><p className="small">{source.scopeNote}</p>{units.map((u: any) => <details key={u.id}><summary>{u.need} <span className={`badge ${u.pending || u.stale ? 'warn' : u.sourceWaiting ? 'bad' : 'neutral'}`}>{label(u.content)}{u.stale ? '・再確認' : ''}</span></summary><p>{u.reason}</p><p>図解：{label(u.visual.decision)} — {u.visual.reason}</p><p>SNS：{label(u.derivative.decision)} — {u.derivative.reason}</p><ul>{u.artifacts.map((a: any) => <li key={a.path}><span className="mono small">{a.path}</span>{a.state !== 'current' && <strong>（{a.state === 'missing' ? '実体なし' : '確認後に変更'}）</strong>}</li>)}</ul>{u.backlogIds?.length > 0 && <p>{u.backlogIds.map((id: string) => <Link key={id} href={`/todo?f=backlog&id=${encodeURIComponent(id)}`}>{id} </Link>)}</p>}<p className="small">確認の深さ：{evidenceLabels[u.evidenceLevel]} · 根拠：{u.locators.join(' / ')}</p></details>)}</section>; })}
  </div>;
}

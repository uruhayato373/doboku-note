import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { Badge } from '@/components/primitives';
import { findRepoRoot } from '@/lib/repo-root';
import { expansionReport, sourceSummary, linkedProductsByUnit, DECISION_LABELS } from '../../../../../scripts/lib/content-expansion.mjs';

export const dynamic = 'force-dynamic';

type Unit = {
  id: string;
  need: string;
  content: string;
  visual: { decision: string };
  derivative: { decision: string };
  artifacts: { path: string; state: string }[];
  productArtifacts: { path: string }[];
  backlogIds?: string[];
  pending: boolean;
  sourceWaiting: boolean;
  stale: boolean;
};
type Source = { sourceId: string; title: string; units: Unit[] };
type Summary = ReturnType<typeof sourceSummary>;

const label = (key: string) => (DECISION_LABELS as Record<string, string>)[key] ?? key;
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');

/**
 * /materials — 教材（人が見る画面）。一覧は教材ごとの展開状況（本文・図解・SNS・商品）、
 * `?id=<教材id>` はその教材の論点ごとの展開先と、展開予定（バックログのカード）を出す。
 * 商品の列は、台帳に記録した商品原稿と、論点の記事へリンクしている note / Kindle（linkedProductsByUnit・派生）を合わせたもの。
 *
 * 台帳の正本は .claude/state/content-expansion.json、判定と集計は scripts/lib/content-expansion.mjs
 * （expansionReport・sourceSummary）が唯一の実装。確認待ち（未確認・原典待ち・変更後の再確認）の
 * 一覧は /content/expansion。教材の本文は出さない（論点と展開状況だけ）。
 */
export default async function MaterialsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  let report: { sources: Source[]; issues: string[] };
  let linked: Map<string, string[]>;
  try {
    report = expansionReport(findRepoRoot()) as unknown as { sources: Source[]; issues: string[] };
    linked = (await linkedProductsByUnit(findRepoRoot(), report as never)) as Map<string, string[]>;
  } catch {
    return (
      <>
        <PageHead title="教材" />
        <p className="card">教材の対応表を読み取れません。</p>
      </>
    );
  }
  const source = id ? report.sources.find((s) => s.sourceId === id) : undefined;
  // 商品＝台帳に記録した商品原稿、または論点の記事へリンクしている note / Kindle（関連商品・派生情報）
  const products = (u: Unit) => [...new Set([...u.productArtifacts.map((a) => a.path), ...(linked.get(u.id) ?? [])])];
  return source ? <Detail source={source} products={products} /> : <List sources={report.sources} issues={report.issues} products={products} />;
}

function List({ sources, issues, products }: { sources: Source[]; issues: string[]; products: (u: Unit) => string[] }) {
  return (
    <>
      <PageHead title="教材" />
      {issues.length > 0 && (
        <div className="card warn-border">
          <h2>台帳の確認が必要 {issues.length} 件</h2>
          <p className="small muted">
            <Link href="/content/expansion">確認待ち</Link>で詳細を見る。
          </p>
        </div>
      )}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>教材</th>
              <th className="num">論点</th>
              <th className="num">本文</th>
              <th className="num">図解</th>
              <th className="num">SNS</th>
              <th className="num">商品</th>
              <th className="num">展開予定</th>
              <th className="num">要確認</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => {
              const m = sourceSummary(s) as Summary;
              const attention = m.pending + m.blocked + m.stale;
              return (
                <tr key={s.sourceId}>
                  <td>
                    <Link href={`/materials?id=${encodeURIComponent(s.sourceId)}`}>{s.title}</Link>
                  </td>
                  <td className="num">{m.units}</td>
                  <td className="num">{pct(m.content, m.units)}</td>
                  <td className="num">
                    {m.visual}
                    {m.visualNeeded > 0 && <span className="project-warning-text"> +要{m.visualNeeded}</span>}
                  </td>
                  <td className="num">
                    {m.sns}
                    {m.snsNeeded > 0 && <span className="project-warning-text"> +要{m.snsNeeded}</span>}
                  </td>
                  <td className="num">{(() => { const n = s.units.filter((u) => products(u).length > 0).length; return n ? pct(n, m.units) : <span className="muted">—</span>; })()}</td>
                  <td className="num">{m.planned || <span className="muted">—</span>}</td>
                  <td className="num">{attention ? <span className="project-warning-text">{attention}</span> : <span className="muted">0</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Detail({ source, products }: { source: Source; products: (u: Unit) => string[] }) {
  const m = sourceSummary(source) as Summary;
  const siteCount = (u: Unit) => u.artifacts.filter((a) => a.path.startsWith('content/site/')).length;
  const snsCount = (u: Unit) => u.artifacts.filter((a) => a.path.startsWith('content/sns/')).length;
  return (
    <>
      <PageHead title={`教材：${source.title}`} />
      <div className="small" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <Link href="/materials">← 教材一覧へ</Link>
        <span className="muted">
          論点 {m.units} · 本文 {pct(m.content, m.units)} · 図解 {m.visual} · SNS {m.sns} · 商品 {pct(source.units.filter((u) => products(u).length > 0).length, m.units)}
        </span>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>論点</th>
              <th>本文</th>
              <th>図解</th>
              <th>SNS</th>
              <th className="num">記事</th>
              <th className="num">SNS原稿</th>
              <th>関連商品</th>
              <th>展開予定</th>
            </tr>
          </thead>
          <tbody>
            {source.units.map((u) => (
              <tr key={u.id}>
                <td style={{ whiteSpace: 'normal', maxWidth: 420 }}>{u.need}</td>
                <td>
                  <State text={label(u.content)} warn={u.pending || u.sourceWaiting || u.stale} />
                </td>
                <td><State text={label(u.visual.decision)} warn={['needed', 'unreviewed'].includes(u.visual.decision)} /></td>
                <td><State text={label(u.derivative.decision)} warn={['needed', 'unreviewed'].includes(u.derivative.decision)} /></td>
                <td className="num">{siteCount(u) || <span className="muted">—</span>}</td>
                <td className="num">{snsCount(u) || <span className="muted">—</span>}</td>
                <td className="small" style={{ whiteSpace: 'normal', maxWidth: 260 }}>
                  {products(u).length ? (
                    <>
                      {products(u).slice(0, 2).map((p) => <div key={p}>{p.split('/').pop()}</div>)}
                      {products(u).length > 2 && <div className="muted">ほか {products(u).length - 2} 件</div>}
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  {(u.backlogIds ?? []).map((b) => (
                    <Link key={b} href={`/todo?f=backlog&id=${encodeURIComponent(b)}`} style={{ marginRight: 6 }}>
                      {b}
                    </Link>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function State({ text, warn }: { text: string; warn: boolean }) {
  return warn ? <Badge variant="warning">{text}</Badge> : <span className="small">{text}</span>;
}

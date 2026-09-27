import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { loadKpiView } from '@/lib/kpi-tree';

export const dynamic = 'force-dynamic';

/**
 * トップ = KPI。一目で分かる最小限だけを上に出す: 受取額と目標 → どこから売れたか（チャネル別・資格別の販売額）
 * → 入口（サイト・検索クラスター）。KPI ツリーの全行と集客の推移は別ページ（下部のカードから開く）（docs/strategy/15_KPIツリー.md）。
 */
const yen = (v: number | null) => (v == null ? '—' : `¥${v.toLocaleString('ja-JP')}`);
const fmt = (v: number | null, unit: string) =>
  v == null ? '—' : unit === '円' ? yen(v) : `${v.toLocaleString('ja-JP')}${unit === '%' ? '%' : ''}`;

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 横棒。最大値に対する割合で長さを決める。値が無いものは「—」。 */
function Bars({ rows }: { rows: { label: string; value: number | null }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '9em 1fr 6em', alignItems: 'center', gap: 8 }}>
          <span className="small">{r.label}</span>
          <div style={{ height: 10, background: 'var(--line, #333)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ width: `${((r.value ?? 0) / max) * 100}%`, height: '100%', background: 'var(--accent, #6aa0ff)' }} />
          </div>
          <span className="small num" style={{ textAlign: 'right' }}>{yen(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ margin: 0, padding: 12 }}>
      <div className="small muted">{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div className="small muted">{sub}</div>}
    </div>
  );
}

/** 詳細ページへの入口。カード全体がリンク。 */
function LinkCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="card" style={{ margin: 0, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
      <span>
        <strong>{title}</strong>
        <span className="small muted" style={{ display: 'block' }}>{desc}</span>
      </span>
      <span style={{ fontSize: 20, opacity: 0.6 }}>→</span>
    </Link>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const v = loadKpiView(month);
  const rate = v.receipts != null && v.goal ? v.receipts / v.goal.value : null;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const next = shiftMonth(v.month, 1);

  return (
    <>
      <PageHead title="KPI" />
      <nav className="filterbar" style={{ marginBottom: 12 }}>
        <Link className="chip" href={`/?month=${shiftMonth(v.month, -1)}`}>← 前の月</Link>
        <span className="chip active">{v.month}</span>
        {next < thisMonth && <Link className="chip" href={`/?month=${next}`}>次の月 →</Link>}
      </nav>

      <div className="card">
        <div className="small muted">月の受取額（手数料控除後）</div>
        <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2 }}>
          {yen(v.receipts)}
          {v.goal && <span className="small muted" style={{ fontWeight: 400 }}> / 目標 {yen(v.goal.value)}</span>}
        </div>
        {rate != null ? (
          <>
            <div style={{ height: 12, background: 'var(--line, #333)', borderRadius: 6, overflow: 'hidden', maxWidth: 560, marginTop: 6 }}>
              <div style={{ width: `${Math.min(rate, 1) * 100}%`, height: '100%', background: rate >= 1 ? 'var(--good)' : 'var(--warn, #d9a200)' }} />
            </div>
            <div className="small">達成率 {Math.round(rate * 100)}% ・ あと {yen(Math.max(0, (v.goal?.value ?? 0) - (v.receipts ?? 0)))}</div>
          </>
        ) : (
          <div className="small muted">この月の受取額は未記録</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        <div className="card" style={{ margin: 0 }}>
          <h2>チャネル別の販売額</h2>
          <Bars rows={v.channels} />
        </div>
        <div className="card" style={{ margin: 0 }}>
          <h2>資格別の販売額</h2>
          <Bars rows={v.qualifications} />
        </div>
      </div>

      <h2 style={{ margin: '20px 0 8px' }}>入口（サイト）</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Tile label="インデックス率" value={fmt(v.site.indexRatio, '%')} />
        <Tile label="Google クリック" value={fmt(v.site.gscClicks, '')} sub="この月" />
        {v.search.clusters.map((c) => (
          <Tile
            key={c.label}
            label={`1桁の検索語・${c.label}`}
            value={String(c.top10)}
            sub={c.prevTop10 == null ? undefined : `前 ${c.prevTop10}`}
          />
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 6 }}>
        検索語は Google の直近 28 日（{v.search.period ?? '未取得'}）・<Link href="/metrics/search-strategy">検索の詳細</Link>
      </p>

      <h2 style={{ margin: '24px 0 8px' }}>詳しく見る</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        <LinkCard href={`/metrics/kpi?month=${v.month}`} title="KPI ツリー" desc="全指標を資格別の表で" />
        <LinkCard href="/metrics/traffic" title="集客の推移" desc="PV・流入のグラフとデータの更新状況" />
        <LinkCard href="/metrics/search-strategy" title="検索キーワード" desc="クラスター別の順位と改善候補" />
      </div>
    </>
  );
}

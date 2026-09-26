import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { loadAgents, type AgentEntry } from '@/lib/registry';
import { domainList } from '@/lib/domains';

export const dynamic = 'force-dynamic';

/** tools に Edit/Write/All tools/* を含むかで 制作（Generator）/ 検査（Evaluator）を推定。 */
function role(a: AgentEntry): '制作' | '検査' {
  const t = a.tools ?? '';
  return /\b(Edit|Write|NotebookEdit|All tools)\b|\*/.test(t) || !a.tools ? '制作' : '検査';
}

/** /agents — エージェント一覧。事業の領域（正本 domains.json）で絞り込む。 */
export default async function AgentsPage({ searchParams }: { searchParams: Promise<{ dom?: string }> }) {
  const { dom } = await searchParams;
  const { items, errors } = loadAgents();
  const domains = domainList();
  const label = (id: string | null) => domains.find((d) => d.id === id)?.label ?? '未設定';
  const rank = (id: string | null) => {
    const i = domains.findIndex((d) => d.id === id);
    return i < 0 ? 99 : i;
  };
  const filtered = items
    .filter((a) => !dom || a.domain === dom)
    .sort((a, b) => rank(a.domain) - rank(b.domain) || a.name.localeCompare(b.name));

  return (
    <>
      <PageHead title="エージェント" sub={`${items.length} 件`} />

      {errors.length > 0 ? (
        <div className="card warn-border">
          <h2>読み取れない定義 {errors.length} 件</h2>
          <ul className="small muted">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="filterbar">
        <Link href="/agents" className={'chip' + (!dom ? ' active' : '')}>
          すべて
        </Link>
        {domains.map((d) => {
          const n = items.filter((a) => a.domain === d.id).length;
          return n ? (
            <Link key={d.id} href={`/agents?dom=${d.id}`} className={'chip' + (dom === d.id ? ' active' : '')}>
              {d.label} {n}
            </Link>
          ) : null;
        })}
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>名前</th>
              <th>領域</th>
              <th>役割</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.name}>
                <td className="mono">{a.name}</td>
                <td className="small">{label(a.domain)}</td>
                <td className="small">{role(a)}</td>
                <td className="wrap small">
                  <span className="desc-clamp">{a.description}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

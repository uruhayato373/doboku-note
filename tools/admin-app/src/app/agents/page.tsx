import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { loadAgents, type AgentEntry } from '@/lib/registry';

export const dynamic = 'force-dynamic';

/** tools に Edit/Write/All tools/* を含むかで Generator / Evaluator を推定。 */
function role(a: AgentEntry): 'Generator' | 'Evaluator' {
  const t = a.tools ?? '';
  return /\b(Edit|Write|NotebookEdit|All tools)\b|\*/.test(t) ? 'Generator' : 'Evaluator';
}

const FILTERS = [
  { key: 'all', label: 'すべて' },
  { key: 'generator', label: 'Generator' },
  { key: 'evaluator', label: 'Evaluator' },
];

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const sp = await searchParams;
  const active = FILTERS.some((f) => f.key === sp.role) ? sp.role! : 'all';
  const { items, errors } = loadAgents();

  const filtered = items.filter((a) => {
    if (active === 'all') return true;
    return role(a).toLowerCase() === active;
  });
  const genCount = items.filter((a) => role(a) === 'Generator').length;

  return (
    <>
      <PageHead
        title="エージェント"
        sub={`${items.length} 件（Generator ${genCount} / Evaluator ${items.length - genCount}）· .claude/agents/`}
      />

      {errors.length > 0 ? (
        <div className="card warn-border">
          <h2>パース警告 {errors.length}件</h2>
          <ul className="small muted">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="filterbar">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/agents' : `/agents?role=${f.key}`}
            className={'chip' + (active === f.key ? ' active' : '')}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>名前</th>
                <th>役割</th>
                <th>モデル</th>
                <th>説明</th>
                <th>tools</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const r = role(a);
                return (
                  <tr key={a.name}>
                    <td className="mono">{a.name}</td>
                    <td>
                      <span className={'badge ' + (r === 'Generator' ? 'accent' : 'neutral')}>{r}</span>
                    </td>
                    <td>
                      <span className="badge neutral">{a.model ?? '—'}</span>
                    </td>
                    <td className="wrap small">
                      <span className="desc-clamp">{a.description}</span>
                    </td>
                    <td className="wrap small muted" style={{ maxWidth: 220 }}>
                      {a.tools ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

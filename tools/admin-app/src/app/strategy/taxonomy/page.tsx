import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { domainList, domainOverview } from '@/lib/domains';
import { findRepoRoot } from '@/lib/repo-root';
import { loadDomains } from '../../../../../../scripts/lib/domains.mjs';

export const dynamic = 'force-dynamic';

/**
 * /strategy/taxonomy — 事業の分類（役割 → 領域 → 画面の種類）。正本 .claude/config/domains.json を
 * そのまま表示する（写しを持たない）。考え方は docs/strategy/14_領域モデル.md。
 */
export default function TaxonomyPage() {
  const domains = domainList();
  const cfg = loadDomains(findRepoRoot()) as { navKinds?: Record<string, string>; navRules?: string[] };
  const kinds = cfg.navKinds ?? {};
  const roles = [...new Set(domains.map((d) => d.role))];

  return (
    <>
      <PageHead title="事業の分類" />
      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <table className="data">
          <thead>
            <tr>
              <th>役割</th>
              <th>領域</th>
              <th>管理するもの</th>
              <th className="num">タスク</th>
              <th className="num">スキル・エージェント</th>
              <th className="num">文書</th>
            </tr>
          </thead>
          <tbody>
            {roles.flatMap((role) =>
              domains
                .filter((d) => d.role === role)
                .map((d, i, arr) => {
                  const o = domainOverview(d.id);
                  return (
                    <tr key={d.id}>
                      {i === 0 && (
                        <td rowSpan={arr.length} style={{ verticalAlign: 'top' }}>
                          <strong>{role}</strong>
                        </td>
                      )}
                      <td>
                        <Link href={`/domains/${d.id}`}>{d.label}</Link>
                      </td>
                      <td className="small" style={{ whiteSpace: 'normal' }}>{d.manages}</td>
                      <td className="num">{o?.cards.length ?? '—'}</td>
                      <td className="num">{o ? o.skills.length + o.agents.length : '—'}</td>
                      <td className="num">{o?.documents.length ?? '—'}</td>
                    </tr>
                  );
                }),
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>各領域の画面（種類別）</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>領域</th>
                {Object.entries(kinds).map(([k, v]) => (
                  <th key={k} title={v}>{v.split('（')[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id}>
                  <td>{d.label}</td>
                  {Object.keys(kinds).map((k) => (
                    <td key={k} className="small" style={{ whiteSpace: 'normal' }}>
                      {d.nav
                        .filter((v) => v.kind === k)
                        .map((v) => (
                          <div key={v.href}>
                            <Link href={v.href}>{v.label}</Link>
                          </div>
                        ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {cfg.navRules?.length ? (
        <div className="card">
          <h2>分け方の規則</h2>
          <ul className="small">
            {cfg.navRules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

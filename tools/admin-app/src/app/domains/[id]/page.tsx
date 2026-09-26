import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHead } from '@/components/ui';
import UpcomingEvents from '@/components/UpcomingEvents';
import { domainOverview } from '@/lib/domains';
import type { ScheduleDomain } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

const TIER: Record<string, string> = { high: '高', mid: '中', low: '低', hold: '判断待ち' };

/** 文書パス → 管理画面の閲覧 URL（docs は /docs、作業マニュアルは /knowledge）。 */
function docHref(path: string): string {
  const noExt = path.replace(/\.md$/, '');
  return noExt.startsWith('docs/') ? `/${noExt}` : `/knowledge/${noExt.replace(/^\.claude\/knowledge\//, '')}`;
}

/**
 * /domains/<id> — 領域の概要。次の予定・やりかけのタスク・使うスキルとエージェント・関連文書を1画面に。
 * 領域の正本は .claude/config/domains.json（サイドバーのグループ名がここへのリンク）。
 */
export default async function DomainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = domainOverview(id);
  if (!o) notFound();
  const { domain, cards, skills, agents, documents } = o;

  return (
    <>
      <PageHead title={domain.label} sub={domain.manages} />
      <UpcomingEvents domain={domain.id as ScheduleDomain} />

      <div className="card">
        <h2>
          タスク <span className="sub">{cards.length} 件</span>
        </h2>
        <div className="table-wrap">
          <table className="data">
            <tbody>
              {cards.map((c) => (
                <tr key={c.id}>
                  <td className="mono small">
                    <Link href={`/todo?f=backlog&id=${encodeURIComponent(c.id)}`}>{c.id}</Link>
                  </td>
                  <td style={{ whiteSpace: 'normal' }}>{c.title}</td>
                  <td className="small">{TIER[c.tier] ?? c.tier}</td>
                  <td className="small">{c.wip ? '進行中' : c.due ? `期日 ${c.due.slice(5).replace('-', '/')}` : ''}</td>
                </tr>
              ))}
              {cards.length === 0 && (
                <tr>
                  <td className="muted">なし</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>
            スキル・エージェント <span className="sub">{skills.length + agents.length} 件</span>
          </h2>
          <div className="table-wrap">
            <table className="data">
              <tbody>
                {[...skills.map((s) => ({ ...s, kind: 'スキル' })), ...agents.map((a) => ({ ...a, kind: 'エージェント' }))].map((x) => (
                  <tr key={x.kind + x.name}>
                    <td className="mono small">{x.name}</td>
                    <td className="small muted">{x.kind}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2>
            文書 <span className="sub">{documents.length} 件</span>
          </h2>
          <div className="table-wrap">
            <table className="data">
              <tbody>
                {documents.map((d) => (
                  <tr key={d}>
                    <td className="small">
                      <Link href={docHref(d)}>{d.split('/').pop()!.replace(/\.md$/, '')}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

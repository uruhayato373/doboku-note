import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { affiliateSurfaces } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

type Link = { path: string; mat: string; program: string | null; status: string | null; title: string | null };
type Surface = { id: string; label: string; scanned: number; links: Link[] };

/** /affiliate/placements — アフィリエイトリンクがどこに何本あるか（サイト・note・SNS）。 */
export default function AffiliatePlacementsPage() {
  const surfaces = affiliateSurfaces(findRepoRoot()) as Surface[];
  const note = surfaces.find((s) => s.id === 'note');
  return (
    <>
      <PageHead title="掲載先" />
      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <table className="data">
          <thead>
            <tr>
              <th>掲載先</th>
              <th className="num">リンクのある原稿</th>
              <th>案件</th>
              <th>成果の計測</th>
            </tr>
          </thead>
          <tbody>
            {surfaces.map((s) => (
              <tr key={s.id}>
                <td>{s.label}</td>
                <td className="num">{s.links.length ? new Set(s.links.map((l) => l.path)).size : <span className="muted">0</span>}</td>
                <td>{[...new Set(s.links.map((l) => l.program ?? '未登録'))].join('・') || <span className="muted">—</span>}</td>
                <td className="small">
                  {s.id === 'site' ? 'クリック＝GA4（配置別）／成果＝A8 サイト別（doboku-note）' : s.id === 'note' ? 'クリック＝A8／成果＝A8 サイト別（doboku-note（note）・2026-09-26〜）' : '将来（X・Threads）'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && note.links.length > 0 && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>note 記事</th>
                <th>案件</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {note.links.map((l) => (
                <tr key={l.path + l.mat}>
                  <td>{l.title ?? l.path.split('/').slice(-2, -1)[0]}</td>
                  <td>{l.program ?? <span className="project-warning-text">未登録</span>}</td>
                  <td>{l.status === 'published' ? '公開' : l.status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

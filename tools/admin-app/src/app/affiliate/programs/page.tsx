import { PageHead } from '@/components/ui';
import { affiliateCatalog } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = { approved: '提携中', applying: '申請中', none: '未申請', unavailable: '取扱なし', unknown: '未確認', rejected: '否認' };
const ASP: Record<string, string> = { a8: 'A8', moshimo: 'もしも', afb: 'afb' };
const yen = (v: number | null) => (v == null ? '' : ` ¥${v.toLocaleString('en-US')}`);

/** /affiliate/programs — 案件ごとの配置状況・ASP ごとの提携状態と報酬・リンクの期限。 */
export default function AffiliateProgramsPage() {
  const rows = affiliateCatalog().sort((a, b) => Number(b.placement === 'active') - Number(a.placement === 'active'));
  return (
    <>
      <PageHead title="提携・案件" />
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>案件</th>
              <th>配置</th>
              <th>ASP（提携・報酬）</th>
              <th>リンク期限</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.label}</td>
                <td>{r.placement === 'active' ? <strong>掲載中</strong> : <span className="muted">なし</span>}</td>
                <td className="small">
                  {r.asps
                    .filter((a) => a.status !== 'unknown')
                    .map((a) => `${ASP[a.asp] ?? a.asp} ${STATUS[a.status] ?? a.status}${a.status === 'approved' ? yen(a.rewardYen) : ''}`)
                    .join(' ／ ') || <span className="muted">未確認</span>}
                </td>
                <td>{r.expiresAt ? r.expiresAt.slice(5).replace('-', '/') : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

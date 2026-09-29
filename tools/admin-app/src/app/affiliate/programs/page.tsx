import { EmptyRow, numCol, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
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
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>案件</TableHead>
            <TableHead>配置</TableHead>
            <TableHead>ASP（提携・報酬）</TableHead>
            <TableHead>リンク期限</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.label}</TableCell>
              <TableCell>{r.placement === 'active' ? <strong>掲載中</strong> : <span className="text-muted-foreground">なし</span>}</TableCell>
              <TableCell className="text-xs whitespace-normal">
                {r.asps
                  .filter((a) => a.status !== 'unknown')
                  .map((a) => `${ASP[a.asp] ?? a.asp} ${STATUS[a.status] ?? a.status}${a.status === 'approved' ? yen(a.rewardYen) : ''}`)
                  .join(' ／ ') || <span className="text-muted-foreground">未確認</span>}
              </TableCell>
              <TableCell>{r.expiresAt ? r.expiresAt.slice(5).replace('-', '/') : <span className="text-muted-foreground">—</span>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
    </>
  );
}

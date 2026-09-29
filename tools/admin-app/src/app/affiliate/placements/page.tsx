import { numCol, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
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
      <div className="mb-4">
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>掲載先</TableHead>
              <TableHead className={numCol}>リンクのある原稿</TableHead>
              <TableHead>案件</TableHead>
              <TableHead>成果の計測</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surfaces.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.label}</TableCell>
                <TableCell className={numCol}>{s.links.length ? new Set(s.links.map((l) => l.path)).size : <span className="text-muted-foreground">0</span>}</TableCell>
                <TableCell>{[...new Set(s.links.map((l) => l.program ?? '未登録'))].join('・') || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-xs">
                  {s.id === 'site' ? 'クリック＝GA4（配置別）／成果＝A8 サイト別（doboku-note）' : s.id === 'note' ? 'クリック＝A8／成果＝A8 サイト別（doboku-note（note）・2026-09-26〜）' : '将来（X・Threads）'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      </div>
      {note && note.links.length > 0 && (
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>note 記事</TableHead>
              <TableHead>案件</TableHead>
              <TableHead>状態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {note.links.map((l) => (
              <TableRow key={l.path + l.mat}>
                <TableCell>{l.title ?? l.path.split('/').slice(-2, -1)[0]}</TableCell>
                <TableCell>{l.program ?? <span className="project-warning-text">未登録</span>}</TableCell>
                <TableCell>{l.status === 'published' ? '公開' : l.status ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      )}
    </>
  );
}

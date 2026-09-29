import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PanelCard, TableBody, TableCell, TableFrame, TableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import UpcomingEvents from '@/components/UpcomingEvents';
import { domainOverview } from '@/lib/domains';
import type { ScheduleDomain } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

const TIER: Record<string, string> = { high: '高', mid: '中', low: '低', hold: '判断待ち' };

/** 文書パス → 管理画面の閲覧 URL（docs は /docs、作業マニュアルは /knowledge）。 */
function docHref(path: string): string {
  const noExt = path.replace(/\.md$/, '');
  const [base, rest] = noExt.startsWith('docs/') ? ['/docs', noExt.slice('docs/'.length)] : ['/knowledge', noExt.replace(/^\.claude\/knowledge\//, '')];
  // パスはファイル名由来なので区切りごとに符号化する（href に生の値を入れない）
  return `${base}/${rest.split('/').map(encodeURIComponent).join('/')}`;
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

      <PanelCard title={<>タスク <span className="sub">{cards.length} 件</span></>}>
        <TableFrame>
          <TableBody>
            {cards.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/todo?f=backlog&id=${encodeURIComponent(c.id)}`}>{c.id}</Link>
                </TableCell>
                <TableCell className="whitespace-normal">{c.title}</TableCell>
                <TableCell className="text-xs">{TIER[c.tier] ?? c.tier}</TableCell>
                <TableCell className="text-xs">{c.wip ? '進行中' : c.due ? `期日 ${c.due.slice(5).replace('-', '/')}` : ''}</TableCell>
              </TableRow>
            ))}
            {cards.length === 0 && (
              <TableRow>
                <TableCell className="text-muted-foreground">なし</TableCell>
              </TableRow>
            )}
          </TableBody>
        </TableFrame>
      </PanelCard>

      <div className="grid cols-2 mt-4">
        <PanelCard title={<>スキル・エージェント <span className="sub">{skills.length + agents.length} 件</span></>}>
          <TableFrame>
            <TableBody>
              {[...skills.map((s) => ({ ...s, kind: 'スキル' })), ...agents.map((a) => ({ ...a, kind: 'エージェント' }))].map((x) => (
                <TableRow key={x.kind + x.name}>
                  <TableCell className="font-mono text-xs">{x.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{x.kind}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        </PanelCard>
        <PanelCard
          title={<>文書 <span className="sub">{documents.length} 件</span></>}
          action={<Link href="/docs" className="text-xs font-normal">すべての文書を探す →</Link>}
        >
          <TableFrame>
            <TableBody>
              {documents.map((d) => (
                <TableRow key={d}>
                  <TableCell className="text-xs">
                    <Link href={docHref(d)}>{d.split('/').pop()!.replace(/\.md$/, '')}</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        </PanelCard>
      </div>
    </>
  );
}

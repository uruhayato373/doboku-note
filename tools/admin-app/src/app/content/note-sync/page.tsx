import { PageHead } from '@/components/ui';
import { Grid, Stack } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { noteSyncPlan, noteSyncRuns, type SyncItem, type SyncPart } from '@/lib/note-sync';

export const dynamic = 'force-dynamic';

const PART_LABEL: Record<SyncPart, string> = { body: '本文', cover: 'カバー', tags: 'タグ', title: '題名' };
const TABS = [
  { id: 'blocked', label: '止まっている' },
  { id: 'ready', label: '反映待ち' },
  { id: 'runs', label: '週次の結果' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const noteUrl = (noteId: string) => `https://note.com/dobokunote/n/${noteId}`;
const dt = (iso: string) => iso.slice(5, 16).replace('T', ' ').replace('-', '/');

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="gap-1 py-3">
      <CardContent className="flex flex-col gap-1 px-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}

function Title({ item }: { item: SyncItem }) {
  return (
    <a href={noteUrl(item.noteId)} target="_blank" rel="noreferrer" className="hover:underline">
      {item.title}
    </a>
  );
}

function Parts({ item }: { item: SyncItem }) {
  return (
    <span className="flex flex-wrap gap-1">
      {item.parts.map((p) => (
        <Badge key={p} variant="secondary">{PART_LABEL[p]}</Badge>
      ))}
      {item.needsPdfPull && <Badge variant="outline">PDF 取り寄せ</Badge>}
    </span>
  );
}

export default async function NoteSyncPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const plan = noteSyncPlan();
  const runs = noteSyncRuns();
  const blocked = plan.items.filter((i) => i.status === 'blocked');
  const ready = plan.items.filter((i) => i.status === 'ready');
  const tab: TabId = (TABS.find((t) => t.id === tabParam)?.id) ?? (blocked.length ? 'blocked' : 'ready');
  const count: Record<TabId, number> = { blocked: blocked.length, ready: ready.length, runs: runs.length };
  const last = runs[0];

  return (
    <Stack>
      <PageHead title="note 反映" />
      {!plan.ok ? (
        <Card>
          <CardContent>
            <Badge variant="destructive">取得失敗</Badge> {plan.error}
          </CardContent>
        </Card>
      ) : (
        <>
          <Grid min="sm">
            <Stat label="止まっている" value={plan.counts.blocked} />
            <Stat label="反映待ち" value={plan.counts.ready} />
            <Stat label="反映済み" value={plan.counts.synced} />
            <Stat label="前回の週次" value={last ? `${dt(last.finishedAt)}・${last.articles.updated.length} 件` : 'なし'} />
          </Grid>

          <TabsList aria-label="反映の状態">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} href={`/content/note-sync?tab=${t.id}`} active={t.id === tab}>
                {t.label}
                <Badge variant={t.id === 'blocked' && count.blocked ? 'warning' : 'secondary'}>{count[t.id]}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {tab === 'blocked' && (
            <Card className="py-2">
              <CardContent className="px-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>記事</TableHead>
                      <TableHead>理由</TableHead>
                      <TableHead>直し方</TableHead>
                      <TableHead>未反映</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blocked.map((i) => (
                      <TableRow key={i.path}>
                        <TableCell className="max-w-80 whitespace-normal"><Title item={i} /></TableCell>
                        <TableCell className="whitespace-normal">
                          {plan.blockers[i.blocker ?? '']?.label ?? i.blocker}
                          {i.abort && <span className="block text-xs text-muted-foreground">{dt(i.abort.at)} {i.abort.reason}</span>}
                        </TableCell>
                        <TableCell className="max-w-96 whitespace-normal text-xs">{plan.blockers[i.blocker ?? '']?.action}</TableCell>
                        <TableCell><Parts item={i} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {tab === 'ready' && (
            <>
              <Grid min="sm">
                <Stat label="本文" value={plan.counts.parts.body} />
                <Stat label="カバー" value={plan.counts.parts.cover} />
                <Stat label="タグ" value={plan.counts.parts.tags} />
                <Stat label="題名" value={plan.counts.parts.title ?? 0} />
                <Stat label="PDF 取り寄せ" value={plan.counts.pdfPull} />
              </Grid>
              <Card className="py-2">
                <CardContent className="px-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>記事</TableHead>
                        <TableHead>資格</TableHead>
                        <TableHead>未反映</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ready.map((i) => (
                        <TableRow key={i.path}>
                          <TableCell className="max-w-96 whitespace-normal"><Title item={i} /></TableCell>
                          <TableCell className="text-xs">{i.exam}</TableCell>
                          <TableCell><Parts item={i} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'runs' && (
            <Card className="py-2">
              <CardContent className="px-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>終了</TableHead>
                      <TableHead>記事 更新</TableHead>
                      <TableHead>記事 失敗</TableHead>
                      <TableHead>マガジン 更新</TableHead>
                      <TableHead>失敗・問題</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((r) => (
                      <TableRow key={r.startedAt}>
                        <TableCell>{dt(r.finishedAt)}</TableCell>
                        <TableCell>{r.articles.updated.length}/{r.articles.attempted}</TableCell>
                        <TableCell>{r.articles.failed.length}</TableCell>
                        <TableCell>{r.magazines.updated.length}/{r.magazines.attempted}</TableCell>
                        <TableCell className="max-w-96 whitespace-normal text-xs">
                          {[...r.articles.failed.map((f) => `${f.path.split('/').slice(-2, -1)[0]}: ${f.reason}`), ...r.magazines.failed.map((f) => `${f.key}: ${f.reason}`), ...r.problems].slice(0, 8).join(' / ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}

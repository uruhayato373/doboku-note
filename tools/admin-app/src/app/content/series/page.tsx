import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Link from 'next/link';
import { PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { loadSeriesConfig, seriesContext, seriesView, validateSeries, loadBasis, validateBasis, basisView, imageProgress, chapterPages, loadOutlines, outlineIssues, PLAN_LABELS, STATE_LABELS, STAGE_LABELS, OUTLINE_LABELS } from '../../../../../../scripts/lib/content-series.mjs';
import { siteSlugOf } from '../../../../../../scripts/lib/content-expansion.mjs';
import { publicPathFromSlug } from '../../../../../../scripts/lib/url-normalization.mjs';
import { parseBacklog } from '../../../../../../scripts/lib/backlog-lib.mjs';
import { TODO_ROOT } from '../../../../../../scripts/lib/repository-paths.mjs';
import { datasetPath } from '../../../../../../scripts/lib/datasets.mjs';
import { SITE_ORIGIN } from '../../../../../../scripts/lib/site-identity.mjs';

export const dynamic = 'force-dynamic';

type Article = { path: string; exists: boolean; published: boolean };
type Visual = { kind: 'figure' | 'photo'; subject: string; figKey?: string; crop?: { book: string; id: string }; skip?: string };
type Progress = {
  pages: { pages: number; pending: number; notNeeded: number; done: number; crops: number };
  crops: { book: string; id: string; page: string; caption: string | null; path: string; linked: boolean }[];
  unlinkedCrops: number;
  visuals: (Visual & { stage: keyof typeof STAGE_LABELS })[];
  stages: Record<string, number>;
};
type OutlineSummary = { status: keyof typeof OUTLINE_LABELS; points: number; withPrimary: number; urlRefs: number; bookRefs: number; path: string | null; approvedAt?: string | null };
type OutlineRef = { kind: 'id' | 'url' | 'book' | 'invalid'; id?: string; detail?: string; value?: string; book?: string; unit?: string; note?: string };
type Outline = { path: string; front: Record<string, string>; sections: Record<string, string[]>; points: { text: string; refs: OutlineRef[] }[] };
type Item = {
  id: string; title: string; plan: keyof typeof PLAN_LABELS; state: keyof typeof STATE_LABELS; outline: OutlineSummary | null;
  sources?: string[]; links?: string[]; wave?: number; note?: string; reason?: string; articles: Article[]; visuals?: Visual[];
};
type Summary = { items: number; newTotal: number; published: number; draft: number; planned: number; strengthen: number; existing: number; excluded: number; missing: number };
type Series = {
  id: string; title: string; audience: string; area: string; policy: string; gate?: string;
  sections: { title: string; items: Item[] }[]; summary: Summary;
};
type Card = { id: string; title: string };

const STAGE_TONE: Record<string, Tone> = {
  embedded: 'good', created: 'info', unreviewed: 'warn', failed: 'bad', cropped: 'info', planned: 'neutral', 'crop-missing': 'bad', skipped: 'neutral',
};
const STATE_TONE: Record<string, Tone> = {
  published: 'good', existing: 'good', draft: 'warn', strengthen: 'info', planned: 'neutral', excluded: 'neutral', missing: 'bad',
};

/** バックログのカードのうち、本文か題にシリーズの id を書いたもの（台帳からはカード番号を指さない）。 */
function cardsBySeries(seriesIds: string[]): Map<string, Card[]> {
  const out = new Map<string, Card[]>(seriesIds.map((id) => [id, []]));
  const file = join(TODO_ROOT, 'backlog.md');
  if (!existsSync(file)) return out;
  const cards = parseBacklog(readFileSync(file, 'utf8')) as { id: string | null; title: string; body: string }[];
  for (const c of cards) {
    if (!c.id) continue;
    for (const id of seriesIds) if (`${c.title}\n${c.body}`.includes(id)) out.get(id)!.push({ id: c.id, title: c.title });
  }
  return out;
}

function articleLink(a: Article) {
  const slug = siteSlugOf(a.path) as string | null;
  const url = slug ? (publicPathFromSlug(slug) as string | null) : null;
  const label = slug ?? a.path;
  if (!a.exists) return <span className="text-muted-foreground">{label}（未作成）</span>;
  return url && a.published ? <a href={`${SITE_ORIGIN}${url}`} target="_blank" rel="noreferrer">{label}</a> : <span>{label}（非公開）</span>;
}

/**
 * /content/series — サイト記事のシリーズ企画（read-only）。
 * 正本は config/content-series.json（目次・計画・根拠）。状態は台帳に書かず、記事ファイルの有無と published から
 * scripts/lib/content-series.mjs が出す。判断の記録は各シリーズの policy、実行はバックログのカード。
 */
export default async function SeriesPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item: focus } = await searchParams;
  const root = findRepoRoot();
  const config = loadSeriesConfig(root);
  const ctx = seriesContext(root);
  const basis = loadBasis(root);
  const outlineSet = loadOutlines(root, config) as { outlines: Map<string, Outline>; stray: string[] };
  const issues = [...(validateSeries(config, ctx) as string[]), ...(validateBasis(basis, config, ctx) as string[]), ...(outlineIssues(outlineSet, ctx) as string[])];
  const view = seriesView(config, ctx.stateOf, outlineSet.outlines, ctx) as unknown as Series[];
  const bv = basisView(basis) as { byItem: Map<string, Record<string, number>>; byBook: Record<string, { units: number; series: number; article: number; excluded: number }> };
  const progress = imageProgress(view, basis, ctx) as Map<string, Progress>;
  const bookDir = new Map((ctx.referenceSources as { id: string; bookBundle?: { directory: string } }[]).map((r) => [r.id, r.bookBundle?.directory ?? null]));
  const pagesByItem = chapterPages(basis, ctx) as Map<string, { pages: { book: string; page: string; cropStatus: string | null }[] }>;
  const chapterPagesOf = (key: string) => pagesByItem.get(key)?.pages ?? [];
  const pageList = (key: string) => {
    const [sid, iid] = key.split('/');
    return { item: view.find((x) => x.id === sid)?.sections.flatMap((sec) => sec.items).find((x) => x.id === iid) ?? null };
  };
  const shortTitle = new Map((ctx.referenceSources as { id: string; shortTitle?: string; title: string }[]).map((r) => [r.id, r.shortTitle ?? r.title]));
  const cards = cardsBySeries(view.map((s) => s.id));

  return (
    <>
      <PageHead title="シリーズ企画" />
      <Stack>
        <p className="text-sm text-muted-foreground">
          試験・教科書とは別の軸で書く記事のシリーズ。目次・計画・根拠は <code>{datasetPath('config.content-series')}</code>、
          状態（公開・下書き・未着手）は記事の実体から出す。カードの本文にシリーズの id を書くと、ここに関連カードとして出る。
          「教材」は書籍の項目のうちその章に割り当てた数（<code>{datasetPath('config.content-series-basis')}</code>）。
          「画像」は、章に使う本の頁（切り出し待ち・図なし・済み）→ その頁から切り出した図（どの計画にも結びついていない＝未対応）→ 図・写真の計画の段階（切り出し済み → 作成 → 監査 → 記事に配置）。
          「骨子」は章ごとの骨子（<code>content/sources/series/&lt;シリーズ&gt;/&lt;項目&gt;.md</code>）の状態（骨子なし・骨子あり・確認済み）と、論点のうち一次資料（法令・要領・白書の id か URL）の根拠がある数。
          どれも書籍の台帳・画像の実体・AI 画像の台帳・記事の本文から出す。Codex に渡す一覧は <code>npm run check-content-series -- --crop-jobs</code>（切り出し）と <code>-- --visual-jobs</code>（作成から配置まで）。
        </p>

        {focus && outlineSet.outlines.get(focus) && (
          <ItemOutline itemKey={focus} title={pageList(focus).item?.title ?? focus} o={outlineSet.outlines.get(focus)!} />
        )}

        {focus && progress.get(focus) && (
          <ItemImages itemKey={focus} title={pageList(focus).item?.title ?? focus} p={progress.get(focus)!} bookDir={bookDir} shortTitle={shortTitle} pages={chapterPagesOf(focus)} />
        )}

        <PanelCard title="書籍の全項目の割り当て">
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>書籍</TableHead>
                <TableHead>項目</TableHead>
                <TableHead>シリーズの章</TableHead>
                <TableHead>ほかの記事</TableHead>
                <TableHead>使わない（理由つき）</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(bv.byBook).map(([id, t]) => (
                <TableRow key={id}>
                  <TableCell><Link href={`/materials?id=${encodeURIComponent(id)}`}>{shortTitle.get(id) ?? id}</Link></TableCell>
                  <TableCell className="tabular-nums">{t.units}</TableCell>
                  <TableCell className="tabular-nums">{t.series}</TableCell>
                  <TableCell className="tabular-nums">{t.article}</TableCell>
                  <TableCell className="tabular-nums">{t.excluded}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        </PanelCard>

        {issues.length > 0 && (
          <PanelCard title={`台帳の問題 ${issues.length} 件`}>
            <ul className="text-sm">
              {issues.map((i) => <li key={i} className="project-warning-text">{i}</li>)}
            </ul>
          </PanelCard>
        )}

        {view.map((s) => {
          const m = s.summary;
          const related = cards.get(s.id) ?? [];
          return (
            <PanelCard key={s.id} title={`${s.title}（新規 ${m.newTotal} のうち公開 ${m.published}・下書き ${m.draft}／補強待ち ${m.strengthen}／既存 ${m.existing}）`}>
              <div className="small mb-2 text-muted-foreground">
                <div>読者: {s.audience} · 置き場: /{s.area}/ · id <code>{s.id}</code> · 判断の記録 <code>{s.policy}</code></div>
                {s.gate && <div className="project-warning-text">着手の条件: {s.gate}</div>}
                <div>
                  関連カード:{' '}
                  {related.length === 0 ? 'なし' : related.map((c) => (
                    <Link key={c.id} href={`/todo?f=backlog&id=${encodeURIComponent(c.id)}`} className="mr-1.5" title={c.title}>{c.id}</Link>
                  ))}
                </div>
              </div>
              <TableFrame>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>項目</TableHead>
                    <TableHead>計画</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>骨子</TableHead>
                    <TableHead>記事</TableHead>
                    <TableHead>教材</TableHead>
                    <TableHead>画像</TableHead>
                    <TableHead>根拠</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.sections.flatMap((sec) => [
                    <TableRow key={`${s.id}:${sec.title}`}>
                      <TableHead colSpan={9} scope="rowgroup">{sec.title}</TableHead>
                    </TableRow>,
                    ...sec.items.map((it) => (
                      <TableRow key={`${s.id}:${it.id}`} className="align-top">
                        <TableCell className="whitespace-nowrap">{it.id}{it.wave ? <span className="text-xs text-muted-foreground"> 第{it.wave}波</span> : null}</TableCell>
                        <TableCell>
                          <div>{it.title}</div>
                          {(it.note || it.reason) && <div className="text-xs text-muted-foreground">{it.reason ?? it.note}</div>}
                          {(it.links ?? []).length > 0 && (
                            <div className="text-xs text-muted-foreground">詳しくは: {(it.links ?? []).map((l) => siteSlugOf(l) ?? l).join('・')}</div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{PLAN_LABELS[it.plan]}</TableCell>
                        <TableCell className="whitespace-nowrap"><StatusBadge tone={STATE_TONE[it.state]}>{STATE_LABELS[it.state]}</StatusBadge></TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <OutlineCell o={it.outline} href={`/content/series?item=${encodeURIComponent(`${s.id}/${it.id}`)}`} />
                        </TableCell>
                        <TableCell className="text-xs">
                          {it.articles.length === 0 ? <span className="text-muted-foreground">—</span> : it.articles.map((a) => <div key={a.path}>{articleLink(a)}</div>)}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {Object.entries(bv.byItem.get(`${s.id}/${it.id}`) ?? {}).map(([b, n]) => <div key={b}>{shortTitle.get(b) ?? b} {n}</div>)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <ImageCell p={progress.get(`${s.id}/${it.id}`)} href={`/content/series?item=${encodeURIComponent(`${s.id}/${it.id}`)}`} />
                        </TableCell>
                        <TableCell className="text-xs font-mono">{(it.sources ?? []).join(' ') || '—'}</TableCell>
                      </TableRow>
                    )),
                  ])}
                </TableBody>
              </TableFrame>
            </PanelCard>
          );
        })}
      </Stack>
    </>
  );
}

/** 章の行の「画像」: 頁・切り出し図・計画の段階を 3 行で（詳しくは ?item=）。 */
function ImageCell({ p, href }: { p?: Progress; href: string }) {
  if (!p || (p.pages.pages === 0 && p.visuals.length === 0)) return <span className="text-muted-foreground">—</span>;
  const stages = Object.entries(p.stages).filter(([, n]) => n > 0);
  return (
    <div className="whitespace-nowrap">
      <div>頁 {p.pages.pages}（待ち {p.pages.pending}・図なし {p.pages.notNeeded}・済み {p.pages.done}）</div>
      <div>切り出し図 {p.crops.length}{p.unlinkedCrops > 0 && <span className="project-warning-text">（未対応 {p.unlinkedCrops}）</span>}</div>
      <div className="flex flex-wrap gap-1">
        {stages.map(([st, n]) => <StatusBadge key={st} tone={STAGE_TONE[st]}>{STAGE_LABELS[st as keyof typeof STAGE_LABELS]} {n}</StatusBadge>)}
      </div>
      <Link href={href}>詳しく</Link>
    </div>
  );
}

/** 1 章の画像の詳しい状態: 図・写真の計画（段階・元の切り出し図・置き場）と、章の頁の切り出し図・切り出し待ちの頁。 */
function ItemImages({ itemKey, title, p, bookDir, shortTitle, pages }: {
  itemKey: string; title: string; p: Progress; bookDir: Map<string, string | null>; shortTitle: Map<string, string>;
  pages: { book: string; page: string; cropStatus: string | null }[];
}) {
  const mediaUrl = (book: string, rel: string) => {
    const dir = bookDir.get(book);
    return dir ? `/media/book/${encodeURIComponent(dir)}/${rel.split('/').map(encodeURIComponent).join('/')}` : null;
  };
  const pending = pages.filter((x) => x.cropStatus !== 'complete' && x.cropStatus !== 'not-needed');
  return (
    <PanelCard title={`画像の進み具合：${itemKey} ${title}`}>
      <div className="small mb-2">
        頁 {p.pages.pages}（切り出し待ち {p.pages.pending}・図なし {p.pages.notNeeded}・済み {p.pages.done}） · 切り出し図 {p.crops.length}（未対応 {p.unlinkedCrops}） · 計画 {p.visuals.length}
        {' '}<Link href="/content/series">← 一覧へ</Link>
      </div>
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>図・写真の計画</TableHead>
            <TableHead>段階</TableHead>
            <TableHead>元の切り出し図</TableHead>
            <TableHead>置き場</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {p.visuals.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-muted-foreground">計画はまだ無い（台帳の visuals に書く）</TableCell></TableRow>
          ) : p.visuals.map((v) => {
            const crop = v.crop ? p.crops.find((c) => c.book === v.crop!.book && c.id === v.crop!.id) : null;
            const src = crop ? mediaUrl(crop.book, crop.path) : null;
            return (
              <TableRow key={v.subject} className="align-top">
                <TableCell className="text-xs">{v.kind === 'photo' ? '写真' : '図'}：{v.subject}{v.skip && <div className="text-muted-foreground">使わない理由: {v.skip}</div>}</TableCell>
                <TableCell className="whitespace-nowrap"><StatusBadge tone={STAGE_TONE[v.stage]}>{STAGE_LABELS[v.stage]}</StatusBadge></TableCell>
                <TableCell className="text-xs">{src ? <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={crop?.caption ?? v.crop?.id ?? ''} className="max-h-24" /></a> : (v.crop ? `${v.crop.book}/${v.crop.id}` : '—')}</TableCell>
                <TableCell className="text-xs font-mono">{v.figKey ?? '—'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </TableFrame>
      <div className="small mt-3 mb-1">この章の頁から切り出した図（{p.crops.length}）</div>
      {p.crops.length === 0 ? <div className="text-xs text-muted-foreground">まだ無い（npm run check-content-series -- --crop-jobs の頁を切り出して登録する）</div> : (
        <div className="flex flex-wrap gap-2">
          {p.crops.map((c) => {
            const src = mediaUrl(c.book, c.path);
            return (
              <figure key={`${c.book}/${c.id}`} className="text-xs w-40">
                {src && <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={c.caption ?? c.id} className="max-h-28" /></a>}
                <figcaption className={c.linked ? 'text-muted-foreground' : 'project-warning-text'}>{shortTitle.get(c.book) ?? c.book} {c.page} {c.id}{c.linked ? '' : '（未対応）'}</figcaption>
              </figure>
            );
          })}
        </div>
      )}
      <div className="small mt-3 mb-1">切り出し待ちの頁（{pending.length}）</div>
      <div className="text-xs flex flex-wrap gap-x-2">
        {pending.map((x) => {
          const href = mediaUrl(x.book, `pages/${x.page}.jpg`);
          return href ? <a key={`${x.book}/${x.page}`} href={href} target="_blank" rel="noreferrer">{shortTitle.get(x.book) ?? x.book} {x.page}</a> : <span key={`${x.book}/${x.page}`}>{x.book} {x.page}</span>;
        })}
      </div>
    </PanelCard>
  );
}

const OUTLINE_TONE: Record<string, Tone> = { approved: 'good', draft: 'warn', none: 'neutral' };

/** 章の行の「骨子」: 状態と、一次資料のある論点の数（詳しくは ?item=）。 */
function OutlineCell({ o, href }: { o: OutlineSummary | null; href: string }) {
  if (!o || o.status === 'none') return <span className="text-muted-foreground">{OUTLINE_LABELS.none}</span>;
  return (
    <Link href={href}>
      <StatusBadge tone={OUTLINE_TONE[o.status]}>{OUTLINE_LABELS[o.status]}</StatusBadge>
      <div className="tabular-nums">論点 {o.points}・一次資料 {o.withPrimary}</div>
      {o.urlRefs > 0 && <div className="tabular-nums text-muted-foreground">URL だけ {o.urlRefs}</div>}
    </Link>
  );
}

/** ?item= の骨子: 論点と根拠（URL はリンク・台帳の id と本の項目はそのまま）。 */
function ItemOutline({ itemKey, title, o }: { itemKey: string; title: string; o: Outline }) {
  const status = o.front.status === 'approved' ? 'approved' : 'draft';
  const refText = (r: OutlineRef) => {
    if (r.kind === 'url') return <a href={r.value} target="_blank" rel="noreferrer">{r.value}</a>;
    if (r.kind === 'book') return <code>{r.book}/{r.unit}</code>;
    if (r.kind === 'id') return <code>{r.id}{r.detail}</code>;
    return <span className="project-warning-text">{r.value}</span>;
  };
  const other = Object.entries(o.sections).filter(([h]) => h !== '論点');
  return (
    <PanelCard title={`骨子 ${itemKey} ${title}`}>
      <div className="small mb-2 text-muted-foreground">
        <StatusBadge tone={OUTLINE_TONE[status]}>{OUTLINE_LABELS[status]}</StatusBadge>{' '}
        {o.front.approvedAt ? `確認日 ${o.front.approvedAt} · ` : ''}<code>{o.path}</code>
      </div>
      <ol className="text-sm">
        {o.points.map((p, i) => (
          <li key={i} className="mb-1">
            <div>{p.text}</div>
            <ul className="text-xs text-muted-foreground">
              {p.refs.map((r, j) => <li key={j}>{r.kind === 'book' ? '本: ' : '根拠: '}{refText(r)} {r.note}</li>)}
              {p.refs.length === 0 && <li className="project-warning-text">根拠が無い</li>}
            </ul>
          </li>
        ))}
      </ol>
      {other.map(([h, lines]) => (
        <div key={h} className="mt-2 text-sm">
          <div className="font-medium">{h}</div>
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{lines.join('\n').trim()}</pre>
        </div>
      ))}
    </PanelCard>
  );
}


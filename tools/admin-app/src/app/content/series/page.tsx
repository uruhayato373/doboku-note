import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Link from 'next/link';
import { PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { loadSeriesConfig, seriesContext, seriesView, validateSeries, PLAN_LABELS, STATE_LABELS } from '../../../../../../scripts/lib/content-series.mjs';
import { siteSlugOf } from '../../../../../../scripts/lib/content-expansion.mjs';
import { publicPathFromSlug } from '../../../../../../scripts/lib/url-normalization.mjs';
import { parseBacklog } from '../../../../../../scripts/lib/backlog-lib.mjs';
import { TODO_ROOT } from '../../../../../../scripts/lib/repository-paths.mjs';
import { datasetPath } from '../../../../../../scripts/lib/datasets.mjs';
import { SITE_ORIGIN } from '../../../../../../scripts/lib/site-identity.mjs';

export const dynamic = 'force-dynamic';

type Article = { path: string; exists: boolean; published: boolean };
type Item = {
  id: string; title: string; plan: keyof typeof PLAN_LABELS; state: keyof typeof STATE_LABELS;
  sources?: string[]; links?: string[]; wave?: number; note?: string; reason?: string; articles: Article[];
};
type Summary = { items: number; newTotal: number; published: number; draft: number; planned: number; strengthen: number; existing: number; excluded: number; missing: number };
type Series = {
  id: string; title: string; audience: string; area: string; policy: string; gate?: string;
  sections: { title: string; items: Item[] }[]; summary: Summary;
};
type Card = { id: string; title: string };

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
export default async function SeriesPage() {
  const root = findRepoRoot();
  const config = loadSeriesConfig(root);
  const ctx = seriesContext(root);
  const issues = validateSeries(config, ctx) as string[];
  const view = seriesView(config, ctx.stateOf) as unknown as Series[];
  const cards = cardsBySeries(view.map((s) => s.id));

  return (
    <>
      <PageHead title="シリーズ企画" />
      <Stack>
        <p className="text-sm text-muted-foreground">
          試験・教科書とは別の軸で書く記事のシリーズ。目次・計画・根拠は <code>{datasetPath('config.content-series')}</code>、
          状態（公開・下書き・未着手）は記事の実体から出す。カードの本文にシリーズの id を書くと、ここに関連カードとして出る。
        </p>

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
                    <TableHead>記事</TableHead>
                    <TableHead>根拠</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.sections.flatMap((sec) => [
                    <TableRow key={`${s.id}:${sec.title}`}>
                      <TableHead colSpan={6} scope="rowgroup">{sec.title}</TableHead>
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
                        <TableCell className="text-xs">
                          {it.articles.length === 0 ? <span className="text-muted-foreground">—</span> : it.articles.map((a) => <div key={a.path}>{articleLink(a)}</div>)}
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

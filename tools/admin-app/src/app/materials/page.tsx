import Link from 'next/link';
import { numCol, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { expansionReport, sourceSummary, linkedProductsByUnit, siteWiring, DECISION_LABELS } from '../../../../../scripts/lib/content-expansion.mjs';
import categories from '../../../../../src/config/categories.json';
import { SITE_ORIGIN } from '../../../../../scripts/lib/site-identity.mjs';

export const dynamic = 'force-dynamic';

type Unit = {
  id: string;
  need: string;
  content: string;
  artifacts: { path: string; state: string }[];
  productArtifacts: { path: string }[];
  backlogIds?: string[];
  reason: string;
  evidenceLevel: string;
  locators: string[];
  visual: { decision: string; reason?: string };
  derivative: { decision: string; reason?: string };
  pending: boolean;
  sourceWaiting: boolean;
  stale: boolean;
};
type Source = { sourceId: string; title: string; scopeNote?: string; units: Unit[] };
type Summary = ReturnType<typeof sourceSummary>;
type SitePage = { slug: string; title: string; category: string; group: string | null; published: boolean; url: string | null; units: number; impressions: number; clicks: number };
type Wiring = { bySource: Map<string, SitePage[]>; byPage: Map<string, { sourceId: string; units: number }[]>; gsc: { file: string | null; period: string | null } };

const categoryLabel = (slug: string) => (categories as { slug: string; label: string }[]).find((c) => c.slug === slug)?.label ?? slug;
const groupLabels: Record<string, string> = { keyword: 'キーワード', guide: 'ガイド', textbook: 'テキスト', 'past-exam': '過去問', primary: '一次過去問', secondary: '二次過去問', pillar: 'ピラー' };
const fmt = (n: number) => n.toLocaleString('ja-JP');

const label = (key: string) => (DECISION_LABELS as Record<string, string>)[key] ?? key;
const evidenceLabels: Record<string, string> = { 'body-reviewed': '本文照合', 'prior-review': '過去の照合記録', 'topic-map': '概念名の対応のみ', 'source-unavailable': '原典不足' };
const needsAttention = (u: Unit) => u.pending || u.sourceWaiting || u.stale;
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');

/**
 * /materials — 教材（人が見る画面）。一覧は教材ごとの展開状況（本文・図解・SNS・商品）、
 * `?id=<教材id>` はその教材の論点ごとの展開先と、展開予定（バックログのカード）を出す。論点の行を開くと
 * 判定の理由・根拠の箇所・成果物が確認後に変わったかを出す。`&only=attention` は要確認（未確認・原典待ち・
 * 変更後の再確認）の論点だけに絞る。
 * 商品の列は、台帳に記録した商品原稿と、論点の記事へリンクしている note / Kindle（linkedProductsByUnit・派生）を合わせたもの。
 *
 * 台帳の正本は .claude/state/content-expansion.json、判定と集計は scripts/lib/content-expansion.mjs
 * （expansionReport・sourceSummary）が唯一の実装。旧 /content/expansion（確認待ち）はここへ転送する。
 * `&view=site` は教材の「サイトの配線先」＝論点の記事を資格 ＞ 区分ごとに、公開 URL・公開状態・GSC の表示/クリック・
 * 根拠の論点数・同じページを使う他の教材（逆引き）と並べる（siteWiring・派生情報で台帳には書かない）。
 * 教材の本文は出さない（論点と展開状況だけ）。
 */
export default async function MaterialsPage({ searchParams }: { searchParams: Promise<{ id?: string; only?: string; view?: string }> }) {
  const { id, only, view } = await searchParams;
  let report: { sources: Source[]; issues: string[] };
  let linked: Map<string, string[]>;
  let wiring: Wiring;
  try {
    report = expansionReport(findRepoRoot()) as unknown as { sources: Source[]; issues: string[] };
    linked = (await linkedProductsByUnit(findRepoRoot(), report as never)) as Map<string, string[]>;
    wiring = (await siteWiring(findRepoRoot(), report as never)) as unknown as Wiring;
  } catch {
    return (
      <>
        <PageHead title="教材" />
        <p className="text-sm text-muted-foreground">教材の対応表を読み取れません。</p>
      </>
    );
  }
  const source = id ? report.sources.find((s) => s.sourceId === id) : undefined;
  // 商品＝台帳に記録した商品原稿、または論点の記事へリンクしている note / Kindle（関連商品・派生情報）
  const products = (u: Unit) => [...new Set([...u.productArtifacts.map((a) => a.path), ...(linked.get(u.id) ?? [])])];
  if (source && view === 'site') return <SiteView source={source} wiring={wiring} sources={report.sources} />;
  return source ? <Detail source={source} products={products} onlyAttention={only === 'attention'} sitePages={wiring.bySource.get(source.sourceId)?.length ?? 0} /> : <List sources={report.sources} issues={report.issues} products={products} wiring={wiring} />;
}

function List({ sources, issues, products, wiring }: { sources: Source[]; issues: string[]; products: (u: Unit) => string[]; wiring: Wiring }) {
  return (
    <>
      <PageHead title="教材" />
      {issues.length > 0 && (
        <PanelCard title={`台帳の確認が必要 ${issues.length} 件`}>
          <ul className="text-xs">
            {issues.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </PanelCard>
      )}
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>教材</TableHead>
            <TableHead className={numCol}>論点</TableHead>
            <TableHead className={numCol}>本文</TableHead>
            <TableHead className={numCol}>図解</TableHead>
            <TableHead className={numCol}>SNS</TableHead>
            <TableHead className={numCol}>商品</TableHead>
            <TableHead className={numCol}>配線先</TableHead>
            <TableHead className={numCol}>検索で表示</TableHead>
            <TableHead className={numCol}>展開予定</TableHead>
            <TableHead className={numCol}>要確認</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((s) => {
            const m = sourceSummary(s) as Summary;
            const attention = m.pending + m.blocked + m.stale;
            return (
              <TableRow key={s.sourceId}>
                <TableCell>
                  <Link href={`/materials?id=${encodeURIComponent(s.sourceId)}`}>{s.title}</Link>
                </TableCell>
                <TableCell className={numCol}>{m.units}</TableCell>
                <TableCell className={numCol}>{pct(m.content, m.units)}</TableCell>
                <TableCell className={numCol}>
                  {m.visual}
                  {m.visualNeeded > 0 && <span className="project-warning-text"> +要{m.visualNeeded}</span>}
                </TableCell>
                <TableCell className={numCol}>
                  {m.sns}
                  {m.snsNeeded > 0 && <span className="project-warning-text"> +要{m.snsNeeded}</span>}
                </TableCell>
                <TableCell className={numCol}>{(() => { const n = s.units.filter((u) => products(u).length > 0).length; return n ? pct(n, m.units) : <span className="text-muted-foreground">—</span>; })()}</TableCell>
                {(() => {
                  const pages = wiring.bySource.get(s.sourceId) ?? [];
                  const shown = pages.filter((p) => p.impressions > 0).length;
                  const href = `/materials?id=${encodeURIComponent(s.sourceId)}&view=site`;
                  return (
                    <>
                      <TableCell className={numCol}>{pages.length ? <Link href={href}>{pages.length}</Link> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className={numCol}>{pages.length ? pct(shown, pages.length) : <span className="text-muted-foreground">—</span>}</TableCell>
                    </>
                  );
                })()}
                <TableCell className={numCol}>{m.planned || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className={numCol}>{attention ? (
                    <Link className="project-warning-text" href={`/materials?id=${encodeURIComponent(s.sourceId)}&only=attention`}>{attention}</Link>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </TableFrame>
    </>
  );
}

function Detail({ source, products, onlyAttention, sitePages }: { source: Source; products: (u: Unit) => string[]; onlyAttention: boolean; sitePages: number }) {
  const m = sourceSummary(source) as Summary;
  const units = onlyAttention ? source.units.filter(needsAttention) : source.units;
  const base = `/materials?id=${encodeURIComponent(source.sourceId)}`;
  const siteCount = (u: Unit) => u.artifacts.filter((a) => a.path.startsWith('content/site/')).length;
  const snsCount = (u: Unit) => u.artifacts.filter((a) => a.path.startsWith('content/sns/')).length;
  return (
    <>
      <PageHead title={`教材：${source.title}`} />
      <div className="small" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <Link href="/materials">← 教材一覧へ</Link>
        <span className="muted">
          論点 {m.units} · 本文 {pct(m.content, m.units)} · 図解 {m.visual} · SNS {m.sns} · 商品 {pct(source.units.filter((u) => products(u).length > 0).length, m.units)}
        </span>
      </div>
      <nav className="filterbar small" style={{ marginBottom: 8 }}>
        {onlyAttention ? <Link href={base}>すべての論点（{source.units.length}）</Link> : <strong>すべての論点（{source.units.length}）</strong>}
        {onlyAttention ? <strong>要確認のみ（{units.length}）</strong> : <Link href={`${base}&only=attention`}>要確認のみ（{source.units.filter(needsAttention).length}）</Link>}
        <Link href={`${base}&view=site`}>サイトの配線先（{sitePages}）</Link>
      </nav>
      {source.scopeNote && <p className="small muted">{source.scopeNote}</p>}
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>論点</TableHead>
            <TableHead>本文</TableHead>
            <TableHead>図解</TableHead>
            <TableHead>SNS</TableHead>
            <TableHead className={numCol}>記事</TableHead>
            <TableHead className={numCol}>SNS原稿</TableHead>
            <TableHead>関連商品</TableHead>
            <TableHead>展開予定</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="whitespace-normal max-w-[420px]">
                <details>
                  <summary>{u.need}</summary>
                  <div className="text-xs" style={{ marginTop: 4 }}>
                    <p>{u.reason}</p>
                    <p>図解：{u.visual.reason}</p>
                    <p>SNS：{u.derivative.reason}</p>
                    {u.artifacts.map((a) => (
                      <div key={a.path} className="font-mono">
                        {a.path}
                        {a.state !== 'current' && <strong className="project-warning-text">（{a.state === 'missing' ? '実体なし' : '確認後に変更'}）</strong>}
                      </div>
                    ))}
                    <p className="text-muted-foreground">確認の深さ：{evidenceLabels[u.evidenceLevel] ?? u.evidenceLevel} · 根拠：{u.locators.join(' / ')}</p>
                  </div>
                </details>
              </TableCell>
              <TableCell>
                <State text={label(u.content) + (u.stale ? '・再確認' : '')} warn={needsAttention(u)} />
              </TableCell>
              <TableCell><State text={label(u.visual.decision)} warn={['needed', 'unreviewed'].includes(u.visual.decision)} /></TableCell>
              <TableCell><State text={label(u.derivative.decision)} warn={['needed', 'unreviewed'].includes(u.derivative.decision)} /></TableCell>
              <TableCell className={numCol}>{siteCount(u) || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className={numCol}>{snsCount(u) || <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-xs whitespace-normal max-w-[260px]">
                {products(u).length ? (
                  <>
                    {products(u).slice(0, 2).map((p) => <div key={p}>{p.split('/').pop()}</div>)}
                    {products(u).length > 2 && <div className="text-muted-foreground">ほか {products(u).length - 2} 件</div>}
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {(u.backlogIds ?? []).map((b) => (
                  <Link key={b} href={`/todo?f=backlog&id=${encodeURIComponent(b)}`} style={{ marginRight: 6 }}>
                    {b}
                  </Link>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
    </>
  );
}

function State({ text, warn }: { text: string; warn: boolean }) {
  return warn ? <StatusBadge tone="warn">{text}</StatusBadge> : <span className="small">{text}</span>;
}

function SiteView({ source, wiring, sources }: { source: Source; wiring: Wiring; sources: Source[] }) {
  const pages = wiring.bySource.get(source.sourceId) ?? [];
  const base = `/materials?id=${encodeURIComponent(source.sourceId)}`;
  const titleOf = (id: string) => sources.find((s) => s.sourceId === id)?.title ?? id;
  const sections = new Map<string, SitePage[]>();
  for (const p of pages) {
    const key = `${categoryLabel(p.category)} ＞ ${p.group ? groupLabels[p.group] ?? p.group : '区分なし'}`;
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key)!.push(p);
  }
  const shown = pages.filter((p) => p.impressions > 0).length;
  return (
    <>
      <PageHead title={`教材：${source.title}`} />
      <div className="small" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <Link href="/materials">← 教材一覧へ</Link>
        <span className="muted">
          配線先 {pages.length} ページ · 検索で表示あり {shown} · 表示 {fmt(pages.reduce((a, p) => a + p.impressions, 0))} · クリック {fmt(pages.reduce((a, p) => a + p.clicks, 0))}
          {wiring.gsc.period && `（${wiring.gsc.period}）`}
        </span>
      </div>
      <nav className="filterbar small" style={{ marginBottom: 8 }}>
        <Link href={base}>すべての論点（{source.units.length}）</Link>
        <Link href={`${base}&only=attention`}>要確認のみ（{source.units.filter(needsAttention).length}）</Link>
        <strong>サイトの配線先（{pages.length}）</strong>
      </nav>
      {!wiring.gsc.file && <p className="project-warning-text text-xs">GSC のページ集計が無いため、表示・クリックは未取得です（0 ではありません）。</p>}
      {pages.length === 0 && <p className="text-sm text-muted-foreground">この教材の論点はサイト記事へ配線されていません。</p>}
      {[...sections].map(([key, list]) => (
        <div key={key} className="mb-4">
          <PanelCard title={<>{key} <span className="text-xs font-normal text-muted-foreground">{list.length} ページ</span></>}>
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>ページ</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className={numCol}>論点</TableHead>
                <TableHead className={numCol}>表示</TableHead>
                <TableHead className={numCol}>クリック</TableHead>
                <TableHead>ほかの教材</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => {
                const others = (wiring.byPage.get(p.slug) ?? []).filter((o) => o.sourceId !== source.sourceId);
                return (
                  <TableRow key={p.slug}>
                    <TableCell className="whitespace-normal max-w-[420px]">
                      {p.url ? <a href={`${SITE_ORIGIN}${p.url}`} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                    </TableCell>
                    <TableCell>{p.published ? <span className="text-xs">公開</span> : <StatusBadge tone="warn">非公開</StatusBadge>}</TableCell>
                    <TableCell className={numCol}>{p.units}</TableCell>
                    <TableCell className={numCol}>{p.impressions ? fmt(p.impressions) : <span className="text-muted-foreground">0</span>}</TableCell>
                    <TableCell className={numCol}>{p.clicks ? fmt(p.clicks) : <span className="text-muted-foreground">0</span>}</TableCell>
                    <TableCell className="text-xs whitespace-normal max-w-[240px]">
                      {others.length ? others.map((o) => (
                        <div key={o.sourceId}>
                          <Link href={`/materials?id=${encodeURIComponent(o.sourceId)}&view=site`}>{titleOf(o.sourceId)}</Link>
                        </div>
                      )) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableFrame>
          </PanelCard>
        </div>
      ))}
    </>
  );
}

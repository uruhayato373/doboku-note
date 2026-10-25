import Link from 'next/link';
import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { expansionReport, sourceSummary, linkedProductsByUnit, siteWiring, DECISION_LABELS } from '../../../../../scripts/lib/content-expansion.mjs';
import categories from '../../../../../src/config/categories.json';
import { SITE_ORIGIN } from '../../../../../scripts/lib/site-identity.mjs';
import { loadReferenceSources } from '../../../../../scripts/lib/reference-sources.mjs';
import { bookCoverageSummary, summarizeExclusions, manifestRepoPath, ocrPendingIssue } from '../../../../../scripts/lib/reference-book-bundle.mjs';
import { parseBacklog } from '../../../../../scripts/lib/backlog-lib.mjs';
import { TODO_ROOT } from '../../../../../scripts/lib/repository-paths.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { num } from '@/lib/format';

type BookCoverage = { pdfPages: number; excludedPdfPages: number; plannedPages: number; imagedPages: number | null; ocr: { complete: number; notNeeded: number; unfinished: number } | null; manifestMatchesPlan: boolean | null; exclusions: { reason: string; pages: number; files: number[] }[]; ocrTracking: string | null; ocrUntracked: boolean };

/** 書籍の網羅（原本の頁・理由つきの除外・ページ画像・文字起こしと残りを追うカード）。正本は config/reference-sources.json と book-manifest.json。 */
function loadBookCoverage(root: string, sourceId: string): BookCoverage | null {
  try {
    const src = (loadReferenceSources() as { sources: { id: string; bookBundle?: unknown }[] }).sources.find((x) => x.id === sourceId && x.bookBundle);
    if (!src) return null;
    const file = join(root, manifestRepoPath(src as never));
    const manifest = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
    const c = bookCoverageSummary(src as never, manifest) as Omit<BookCoverage, 'exclusions' | 'ocrTracking' | 'ocrUntracked'> & { excluded: { order: number; start: number; end: number; reason: string }[] };
    const backlogFile = join(TODO_ROOT, 'backlog.md');
    const openIds = new Set((existsSync(backlogFile) ? parseBacklog(readFileSync(backlogFile, 'utf8')) : []).map((x: { id: string | null }) => x.id).filter(Boolean) as string[]);
    const track = ocrPendingIssue(src as never, manifest, openIds) as { tracking: string | null; error: string | null };
    return { ...c, exclusions: summarizeExclusions(c.excluded) as BookCoverage['exclusions'], ocrTracking: track.tracking, ocrUntracked: Boolean(track.error) };
  } catch {
    return null;
  }
}

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

const label = (key: string) => (DECISION_LABELS as Record<string, string>)[key] ?? key;
const evidenceLabels: Record<string, string> = { 'body-reviewed': '本文照合', 'prior-review': '過去の照合記録', 'topic-map': '概念名の対応のみ', 'source-unavailable': '原典不足' };
const needsAttention = (u: Unit) => u.pending || u.sourceWaiting || u.stale;
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');
const ratio = (n: number, d: number) => (d ? (n / d) * 100 : null);
const Dash = () => <span className="text-muted-foreground">—</span>;

const SOURCE_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '教材', wrap: true },
  { key: 'units', label: '論点', num: true },
  { key: 'content', label: '本文', num: true },
  { key: 'visual', label: '図解', num: true },
  { key: 'sns', label: 'SNS', num: true },
  { key: 'products', label: '商品', num: true },
  { key: 'pages', label: '配線先', num: true },
  { key: 'shown', label: '検索で表示', num: true },
  { key: 'planned', label: '展開予定', num: true },
  { key: 'attention', label: '要確認', num: true },
];
const UNIT_COLUMNS: DataTableColumn[] = [
  { key: 'need', label: '論点', wrap: true },
  { key: 'content', label: '本文' },
  { key: 'visual', label: '図解' },
  { key: 'derivative', label: 'SNS' },
  { key: 'articles', label: '記事', num: true },
  { key: 'snsFiles', label: 'SNS原稿', num: true },
  { key: 'products', label: '関連商品', wrap: true },
  { key: 'backlog', label: '展開予定' },
];
const PAGE_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: 'ページ', wrap: true },
  { key: 'state', label: '状態' },
  { key: 'units', label: '論点', num: true },
  { key: 'impressions', label: '表示', num: true },
  { key: 'clicks', label: 'クリック', num: true },
  { key: 'others', label: 'ほかの教材', wrap: true },
];

/** 本文の割合（対象外を除いた論点に対する内容対応ありの割合）と、100% に届かない理由の内訳。 */
function ContentCell({ m }: { m: Summary }) {
  const notes = [
    m.contentBlocked > 0 && <span key="b" className="project-warning-text">原典待ち {m.contentBlocked}</span>,
    m.contentPartial > 0 && <span key="p" className="project-warning-text">一部対応 {m.contentPartial}</span>,
    m.contentUnreviewed > 0 && <span key="u" className="project-warning-text">未確認 {m.contentUnreviewed}</span>,
    m.contentExcluded > 0 && <span key="e" className="text-muted-foreground">対象外 {m.contentExcluded}</span>,
  ].filter(Boolean);
  return (
    <>
      {pct(m.content, m.contentTarget)}
      {notes.length > 0 && <div className="flex flex-col items-end text-[11px] leading-tight">{notes}</div>}
    </>
  );
}

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
  return source ? <Detail source={source} products={products} onlyAttention={only === 'attention'} sitePages={wiring.bySource.get(source.sourceId)?.length ?? 0} book={loadBookCoverage(findRepoRoot(), source.sourceId)} /> : <List sources={report.sources} issues={report.issues} products={products} wiring={wiring} />;
}

function List({ sources, issues, products, wiring }: { sources: Source[]; issues: string[]; products: (u: Unit) => string[]; wiring: Wiring }) {
  const rows: DataTableRow[] = sources.map((s) => {
    const m = sourceSummary(s) as Summary;
    const attention = m.pending + m.blocked + m.stale;
    const productUnits = s.units.filter((u) => products(u).length > 0).length;
    const pages = wiring.bySource.get(s.sourceId) ?? [];
    const shown = pages.filter((p) => p.impressions > 0).length;
    const siteHref = `/materials?id=${encodeURIComponent(s.sourceId)}&view=site`;
    return {
      id: s.sourceId,
      values: {
        title: s.title,
        units: m.units,
        content: ratio(m.content, m.contentTarget),
        visual: m.visual,
        sns: m.sns,
        products: productUnits ? ratio(productUnits, m.units) : null,
        pages: pages.length || null,
        shown: pages.length ? ratio(shown, pages.length) : null,
        planned: m.planned || null,
        attention,
      },
      cells: {
        title: <Link href={`/materials?id=${encodeURIComponent(s.sourceId)}`}>{s.title}</Link>,
        content: <ContentCell m={m} />,
        visual: (
          <>
            {m.visual}
            {m.visualNeeded > 0 && <span className="project-warning-text"> +要{m.visualNeeded}</span>}
          </>
        ),
        sns: (
          <>
            {m.sns}
            {m.snsNeeded > 0 && <span className="project-warning-text"> +要{m.snsNeeded}</span>}
          </>
        ),
        products: productUnits ? pct(productUnits, m.units) : <Dash />,
        pages: pages.length ? <Link href={siteHref}>{pages.length}</Link> : <Dash />,
        shown: pages.length ? pct(shown, pages.length) : <Dash />,
        planned: m.planned || <Dash />,
        attention: attention ? (
          <Link className="project-warning-text" href={`/materials?id=${encodeURIComponent(s.sourceId)}&only=attention`}>{attention}</Link>
        ) : (
          <span className="text-muted-foreground">0</span>
        ),
      },
    };
  });
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
      <DataTable columns={SOURCE_COLUMNS} rows={rows} pageSize={100} filter="教材で絞り込む" />
      <p className="small muted mt-2">
        本文＝内容対応ありの論点 ÷（論点 − 対象外）。対象外は意図して展開しない論点（旧年度の手続き・見出しだけの構造・対象外の部門など）。
        原典待ちは原本のページが無く展開できない論点、一部対応は原本の一部しか照合できていない論点。行を開くと論点ごとの理由が見られる。
      </p>
    </>
  );
}

function Detail({ source, products, onlyAttention, sitePages, book }: { source: Source; products: (u: Unit) => string[]; onlyAttention: boolean; sitePages: number; book: BookCoverage | null }) {
  const m = sourceSummary(source) as Summary;
  const units = onlyAttention ? source.units.filter(needsAttention) : source.units;
  const base = `/materials?id=${encodeURIComponent(source.sourceId)}`;
  const siteCount = (u: Unit) => u.artifacts.filter((a) => a.path.startsWith('content/site/')).length;
  const snsCount = (u: Unit) => u.artifacts.filter((a) => a.path.startsWith('content/sns/')).length;
  const unitRows: DataTableRow[] = units.map((u) => {
    const prods = products(u);
    const contentText = label(u.content) + (u.stale ? '・再確認' : '');
    const warnDecision = (d: string) => ['needed', 'unreviewed'].includes(d);
    return {
      id: u.id,
      values: {
        need: u.need,
        content: contentText,
        visual: label(u.visual.decision),
        derivative: label(u.derivative.decision),
        articles: siteCount(u) || null,
        snsFiles: snsCount(u) || null,
        products: prods.map((p) => p.split('/').pop()!).join(' ') || null,
        backlog: (u.backlogIds ?? []).join(' ') || null,
      },
      cells: {
        need: (
          <div className="max-w-[420px]">
            <details>
              <summary>{u.need}</summary>
              <div className="text-xs mt-1">
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
          </div>
        ),
        content: <State text={contentText} warn={needsAttention(u)} />,
        visual: <State text={label(u.visual.decision)} warn={warnDecision(u.visual.decision)} />,
        derivative: <State text={label(u.derivative.decision)} warn={warnDecision(u.derivative.decision)} />,
        articles: siteCount(u) || <span className="text-muted-foreground">—</span>,
        snsFiles: snsCount(u) || <span className="text-muted-foreground">—</span>,
        products: (
          <div className="text-xs max-w-[260px]">
            {prods.length ? (
              <>
                {prods.slice(0, 2).map((p) => <div key={p}>{p.split('/').pop()}</div>)}
                {prods.length > 2 && <div className="text-muted-foreground">ほか {prods.length - 2} 件</div>}
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        ),
        backlog: (
          <>
            {(u.backlogIds ?? []).map((b) => (
              <Link key={b} href={`/todo?f=backlog&id=${encodeURIComponent(b)}`} className="mr-1.5">
                {b}
              </Link>
            ))}
          </>
        ),
      },
    };
  });
  return (
    <>
      <PageHead title={`教材：${source.title}`} />
      <div className="small mb-2 flex justify-between">
        <Link href="/materials">← 教材一覧へ</Link>
        <span className="muted">
          論点 {m.units} · 本文 {pct(m.content, m.contentTarget)}
          {m.contentExcluded > 0 && `（対象外 ${m.contentExcluded} を除く）`}
          {m.contentBlocked > 0 && ` · 原典待ち ${m.contentBlocked}`}
          {m.contentPartial > 0 && ` · 一部対応 ${m.contentPartial}`} · 図解 {m.visual} · SNS {m.sns} · 商品 {pct(source.units.filter((u) => products(u).length > 0).length, m.units)}
        </span>
      </div>
      <nav className="filterbar small mb-2!">
        {onlyAttention ? <Link href={base}>すべての論点（{source.units.length}）</Link> : <strong>すべての論点（{source.units.length}）</strong>}
        {onlyAttention ? <strong>要確認のみ（{units.length}）</strong> : <Link href={`${base}&only=attention`}>要確認のみ（{source.units.filter(needsAttention).length}）</Link>}
        <Link href={`${base}&view=site`}>サイトの配線先（{sitePages}）</Link>
      </nav>
      {book && <BookCoverageLine book={book} />}
      {source.scopeNote && <p className="small muted">{source.scopeNote}</p>}
      <DataTable columns={UNIT_COLUMNS} rows={unitRows} filter="論点で絞り込む" />
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
      <div className="small mb-2 flex justify-between">
        <Link href="/materials">← 教材一覧へ</Link>
        <span className="muted">
          配線先 {pages.length} ページ · 検索で表示あり {shown} · 表示 {num(pages.reduce((a, p) => a + p.impressions, 0))} · クリック {num(pages.reduce((a, p) => a + p.clicks, 0))}
          {wiring.gsc.period && `（${wiring.gsc.period}）`}
        </span>
      </div>
      <nav className="filterbar small mb-2!">
        <Link href={base}>すべての論点（{source.units.length}）</Link>
        <Link href={`${base}&only=attention`}>要確認のみ（{source.units.filter(needsAttention).length}）</Link>
        <strong>サイトの配線先（{pages.length}）</strong>
      </nav>
      {!wiring.gsc.file && <p className="project-warning-text text-xs">GSC のページ集計が無いため、表示・クリックは未取得です（0 ではありません）。</p>}
      {pages.length === 0 && <p className="text-sm text-muted-foreground">この教材の論点はサイト記事へ配線されていません。</p>}
      {[...sections].map(([key, list]) => (
        <div key={key} className="mb-4">
          <PanelCard title={<>{key} <span className="text-xs font-normal text-muted-foreground">{list.length} ページ</span></>}>
          <DataTable
            columns={PAGE_COLUMNS}
            rows={list.map((p) => {
              const others = (wiring.byPage.get(p.slug) ?? []).filter((o) => o.sourceId !== source.sourceId);
              return {
                id: p.slug,
                values: {
                  title: p.title,
                  state: p.published ? '公開' : '非公開',
                  units: p.units,
                  impressions: p.impressions,
                  clicks: p.clicks,
                  others: others.map((o) => titleOf(o.sourceId)).join('・') || null,
                },
                cells: {
                  title: (
                    <div className="max-w-[420px]">
                      {p.url ? <a href={`${SITE_ORIGIN}${p.url}`} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                    </div>
                  ),
                  state: p.published ? <span className="text-xs">公開</span> : <StatusBadge tone="warn">非公開</StatusBadge>,
                  impressions: p.impressions ? num(p.impressions) : <span className="text-muted-foreground">0</span>,
                  clicks: p.clicks ? num(p.clicks) : <span className="text-muted-foreground">0</span>,
                  others: (
                    <div className="text-xs max-w-[240px]">
                      {others.length ? others.map((o) => (
                        <div key={o.sourceId}>
                          <Link href={`/materials?id=${encodeURIComponent(o.sourceId)}&view=site`}>{titleOf(o.sourceId)}</Link>
                        </div>
                      )) : <span className="text-muted-foreground">—</span>}
                    </div>
                  ),
                },
              };
            })}
            pageSize={100}
            filter={list.length > 30 ? 'ページで絞り込む' : undefined}
          />
          </PanelCard>
        </div>
      ))}
    </>
  );
}

/** 原本が全部ページ画像・文字起こしになっているか。除外は理由つき、文字起こしの残りは追うカードか理由つき。 */
function BookCoverageLine({ book }: { book: BookCoverage }) {
  const ocrDone = book.ocr ? book.ocr.complete + book.ocr.notNeeded : 0;
  const ocrTotal = book.imagedPages ?? 0;
  const ok = book.manifestMatchesPlan && book.ocr && ocrDone === ocrTotal;
  return (
    <div className="small mb-2">
      <span className={ok ? 'text-muted-foreground' : 'project-warning-text'}>
        原本 {book.pdfPages} 頁 · 除外 {book.excludedPdfPages} 頁 · ページ画像 {book.imagedPages ?? '—'}
        {book.manifestMatchesPlan === false && `（計画 ${book.plannedPages} と不一致）`} · 文字起こし {ocrDone}/{ocrTotal}
        {ocrDone < ocrTotal && (book.ocrUntracked ? '（残りを誰も追っていない）' : `（残りは ${book.ocrTracking}）`)}
      </span>
      {book.exclusions.length > 0 && (
        <ul className="text-xs text-muted-foreground">
          {book.exclusions.map((e) => <li key={e.reason}>除外 {e.pages} 頁（分冊 {e.files.join(',')}）: {e.reason}</li>)}
        </ul>
      )}
    </div>
  );
}

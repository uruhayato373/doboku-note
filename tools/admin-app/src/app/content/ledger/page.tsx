import Link from 'next/link';
import {
  DataTable, Facet, FacetHead, FacetShell, StatusBadge,
  type DataTableColumn, type DataTableRow, type FacetItem,
} from '@/components/admin';
import { PageHead } from '@/components/ui';
import { channelById, type AdminChannelId } from '@/lib/channel-registry';
import { loadLedgerView, type LedgerRow } from '@/lib/ledger';
import { ctaDrift, drift, inState, jst, STATES, type Drift } from '@/lib/ledger-status';
import { datasetPath } from '../../../../../../scripts/lib/datasets.mjs';
import { DriftBadge } from './drift-badge';
import { yen } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * コンテンツ台帳（DN-0438）。1 行 = 1 制作物（note の記事・マガジン、ココナラの出品、Kindle の本）を、
 * テーマ × note 記事のカバー分類 × チャネル × 状態で絞る。サイドメニューの「資格・テーマ別」「チャネル別」の行き先。
 * note の記事・導線・ココナラの照合は索引（npm run content-ledger）だけを読む。状態の判定は lib/ledger-status.ts。
 */

type Query = { t?: string; c?: string; s?: string; cv?: string };
const NO_THEME = '__none';
const NO_COVER = '__none';

/** 販売列。note の有料記事・マガジンだけ数える。販売ログを読めないときは 0 件ではなく「?」 */
function SalesCell({ r, salesOk }: { r: LedgerRow; salesOk: boolean }) {
  if (r.channel !== 'note' || r.price === '無料') return <>—</>;
  if (!salesOk) return <StatusBadge tone="bad" title={`${datasetPath('note.sales')} を読めない`}>?</StatusBadge>;
  if (!r.sales) return <span className="text-muted-foreground">0</span>;
  return <span className="text-foreground" title={`最後に売れた日 ${r.sales.lastDate}`}>{r.sales.count} 件 {yen(r.sales.revenue)}</span>;
}

const DRIFT_LABEL: Record<Drift['state'], string> = { ok: '済', drift: 'ずれ', blocked: '止', unknown: '?', none: '—' };

function href(q: Query, patch: Partial<Query>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...q, ...patch })) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `/content/ledger?${s}` : '/content/ledger';
}

/** facet 1 つ分の項目（先頭に「すべて」）。 */
function facetItems(now: Query, param: keyof Query, active: string | null, total: number, items: { key: string; label: string; count: number }[]): FacetItem[] {
  return [
    { key: '__all', label: 'すべて', count: total, href: href(now, { [param]: undefined }), active: !active },
    ...items.map((i) => ({ ...i, href: href(now, { [param]: i.key }), active: active === i.key })),
  ];
}

export default async function LedgerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null;
  const theme = one(sp.t);
  const channel = one(sp.c);
  const state = one(sp.s);
  const cover = one(sp.cv);
  const now: Query = { t: theme ?? undefined, c: channel ?? undefined, s: state ?? undefined, cv: cover ?? undefined };

  const view = loadLedgerView();
  // 終了した商品（ココナラのアーカイブ済み）は既定で隠す。状態「終了」を選んだときだけ出す
  const everything = view.rows;
  const all = state === 'ended' ? everything : everything.filter((r) => !r.ended);
  const hiddenEnded = everything.filter((r) => r.ended && (!channel || r.channel === channel)).length;

  const matchTheme = (r: LedgerRow) => !theme || (theme === NO_THEME ? r.themes.length === 0 : r.themes.includes(theme));
  const matchChannel = (r: LedgerRow) => !channel || r.channel === channel;
  const matchState = (r: LedgerRow) => !state || inState(r, state);
  const matchCover = (r: LedgerRow) => !cover || (r.channel === 'note' && r.kind === '記事' && (cover === NO_COVER ? !r.coverCategory : r.coverCategory === cover));

  const rows = all.filter((r) => matchTheme(r) && matchChannel(r) && matchState(r) && matchCover(r));
  // 各 facet の件数は「自分以外の facet を適用した後」で数える（/content/note と同じ）
  const themeScope = all.filter((r) => matchChannel(r) && matchState(r) && matchCover(r));
  const channelScope = all.filter((r) => matchTheme(r) && matchState(r) && matchCover(r));
  const stateScope = all.filter((r) => matchTheme(r) && matchChannel(r) && matchCover(r));
  const coverScope = all.filter((r) => matchTheme(r) && matchChannel(r) && matchState(r) && r.channel === 'note' && r.kind === '記事');

  const themeCounts = new Map<string, number>();
  for (const r of themeScope) for (const t of r.themes.length ? r.themes : [NO_THEME]) themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
  const themeItems = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count, label: key === NO_THEME ? '未分類' : view.themeLabel(key) }));
  const channelItems = view.channels.map((c) => ({ key: c.id, label: c.label, count: channelScope.filter((r) => r.channel === c.id).length }));
  const stateItems = STATES.map((s) => ({
    ...s,
    count: s.key === 'ended'
      ? everything.filter((r) => r.ended && matchTheme(r) && matchChannel(r) && matchCover(r)).length
      : stateScope.filter((r) => inState(r, s.key)).length,
  }));
  const coverItems = view.coverCategories.map((category) => ({
    key: category.id,
    label: category.label,
    count: coverScope.filter((r) => r.coverCategory === category.id).length,
  }));
  const unclassifiedCoverCount = coverScope.filter((r) => !r.coverCategory).length;
  if (unclassifiedCoverCount) coverItems.push({ key: NO_COVER, label: '未分類', count: unclassifiedCoverCount });

  const channelLabel = new Map(view.channels.map((c) => [c.id, c.label]));
  const blockerLabel = (id: string | null) => (id ? view.blockers[id]?.label ?? id : undefined);
  const tools = channel ? channelById(channel as AdminChannelId)?.tabs ?? [] : [];
  const filtered = Boolean(theme || channel || state || cover);
  // チャネルで絞ったら列は同じ値だけになるので出さない。note だけは記事とマガジンが混ざるので種類を出す
  const kindCol = !channel ? 'チャネル' : channel === 'note' ? '種類' : null;
  const indexStale = view.index.generatedAt ? Date.now() - Date.parse(view.index.generatedAt) > 6 * 3_600_000 : false;
  const title = [theme ? (theme === NO_THEME ? '未分類' : view.themeLabel(theme)) : null, channel ? channelLabel.get(channel) : null, cover ? view.coverCategoryLabel(cover === NO_COVER ? null : cover) : null]
    .filter(Boolean).join(' × ');

  const columns: DataTableColumn[] = [
    { key: 'title', label: 'タイトル' },
    ...(kindCol ? [{ key: 'kind', label: kindCol }] : []),
    { key: 'themes', label: 'テーマ' },
    { key: 'cover', label: <span title="note 記事のカバー画像を用途別に管理する分類">カバー分類</span> },
    { key: 'price', label: '価格' },
    { key: 'sales', label: <span title={`note の販売履歴（${datasetPath('note.sales')}）の累計。マガジンは id、単品記事は題名で照合。マウスで最後に売れた日`}>販売</span> },
    { key: 'stage', label: '状態' },
    { key: 'body', label: <span title="公開ページが正本どおりか。note＝原稿の本文・タグ（同期の判定）／ココナラ＝タイトル・キャッチコピー・本文・販売状態（公開ページの照合）。済／ずれ（マウスで理由）／止＝反映できない／?＝照合していない">本文</span> },
    { key: 'image', label: <span title="note＝カバー画像が原稿どおりか／ココナラ＝承認済みの POP 画像が登録されているか">画像</span> },
    { key: 'cta', label: <span title="原稿の導線（ココナラ・パックなど）のリンク先が、note の公開記事に順番・位置どおり出ているか（公開 API で照合・マウスで内訳）。済／ずれ／?＝取得失敗">導線</span> },
  ];
  const tableRows: DataTableRow[] = rows.map((r) => {
    const themes = r.themes.length ? r.themes.map((t) => view.themeLabel(t)).join('・') : '未分類';
    const coverLabel = r.channel !== 'note' || r.kind !== '記事' ? '—' : r.coverCategory ? view.coverCategoryLabel(r.coverCategory) : '未分類';
    const body = drift(r, 'body', blockerLabel);
    const image = drift(r, 'cover', blockerLabel);
    const cta = ctaDrift(r);
    const paidNote = r.channel === 'note' && r.price !== '無料';
    return {
      id: r.key,
      values: {
        title: r.magazine ? `${r.title} ${r.magazine}` : r.title,
        kind: channel ? r.kind : `${channelLabel.get(r.channel) ?? r.channel}・${r.kind}`,
        themes,
        cover: coverLabel,
        price: r.price ?? null,
        sales: !paidNote || !view.salesOk ? null : (r.sales?.revenue ?? 0),
        stage: r.stageLabel,
        body: DRIFT_LABEL[body.state],
        image: DRIFT_LABEL[image.state],
        cta: DRIFT_LABEL[cta.state],
      },
      cells: {
        title: (
          <div className="max-w-[28rem] truncate" title={r.path ?? r.key}>
            {r.detailHref ? <Link href={r.detailHref}>{r.title}</Link>
              : r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a> : r.title}
            {r.magazine ? <div className="truncate text-xs text-muted-foreground" title="この記事を収録しているマガジン（原稿の noteMagazine）">収録: {r.magazine}</div> : null}
          </div>
        ),
        kind: <span className="text-muted-foreground">{channel ? r.kind : `${channelLabel.get(r.channel) ?? r.channel}・${r.kind}`}</span>,
        themes: (
          <div className="max-w-[12rem] truncate text-muted-foreground">
            {r.themes.length ? themes : <StatusBadge tone="bad" title="テーマのルールに当たらない">未分類</StatusBadge>}
          </div>
        ),
        cover: (
          <div className="max-w-[12rem] truncate text-muted-foreground">
            {r.channel !== 'note' || r.kind !== '記事' ? '—'
              : r.coverCategory ? coverLabel
                : <StatusBadge tone="bad" title="カバー分類のルールに当たらない">未分類</StatusBadge>}
          </div>
        ),
        price: (
          <span className="text-muted-foreground">
            {r.price ?? '—'}
            {r.live?.price.length ? <> <StatusBadge tone="warn" title={r.live.price.join(' / ')}>ずれ</StatusBadge></> : null}
          </span>
        ),
        sales: <SalesCell r={r} salesOk={view.salesOk} />,
        stage: <StatusBadge tone={r.published ? 'good' : 'neutral'}>{r.stageLabel}</StatusBadge>,
        body: <DriftBadge {...body} />,
        image: <DriftBadge {...image} />,
        cta: <DriftBadge {...cta} />,
      },
    };
  });

  const main = (
    <div className="flex flex-col gap-3">
      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span>{filtered ? <><strong className="text-foreground">{rows.length}</strong> / {all.length} 件</> : <>{all.length} 件</>}</span>
        {hiddenEnded > 0 && state !== 'ended' ? <span>（<Link href={href(now, { s: 'ended' })}>終了 {hiddenEnded} 件</Link>は隠している）</span> : null}
        {view.index.ok ? (
          <span title="note の記事の同期状態は索引を作った時点のもの。この画面を開いたとき、30 分より古いか新しいコミットが入っていれば裏で作り直す（終われば再読み込みで反映）。手で作るなら npm run content-ledger">
            · 索引 {jst(view.index.generatedAt)} {view.index.refreshing ? <StatusBadge tone="info">作り直し中・数分後に再読み込み</StatusBadge> : indexStale ? <StatusBadge tone="warn">古い</StatusBadge> : null}
          </span>
        ) : (
          <span>· <StatusBadge tone="bad" title={view.index.error ?? undefined}>索引なし</StatusBadge> note の記事は出していない（0 件ではない）。<code>npm run content-ledger</code> で作る</span>
        )}
        {view.unmatchedSales.length ? (
          <span title={`販売ログの単品記事のうち、売れた時点の題名で原稿を特定できなかったもの（販売列に入っていない）: ${view.unmatchedSales.map((u) => `${u.id} ${u.count} 件`).join(' / ')}`}>
            · <StatusBadge tone="warn">記事の販売 {view.unmatchedSales.reduce((a, u) => a + u.count, 0)} 件は原稿に当たらない</StatusBadge>
          </span>
        ) : null}
        {tools.map((t) => <Link key={t.href} href={t.href}>{t.label}</Link>)}
        {theme && view.lineupQualifications.has(theme.split(':')[0]) ? <Link href={`/content/lineup?q=${theme.split(':')[0]}`}>商品ラインナップ</Link> : null}
      </p>
      {view.sourceErrors.map((e) => (
        <p key={e.channel} className="m-0 text-sm text-muted-foreground">
          <StatusBadge tone="bad">{channelLabel.get(e.channel) ?? e.channel} を読めない</StatusBadge> {e.message}
        </p>
      ))}

      <DataTable
        columns={columns}
        rows={tableRows}
        filter="タイトル・テーマなどで絞り込む"
        emptyText="この条件に該当する制作物はありません。"
      />
    </div>
  );

  const rail = (
    <>
      <FacetHead clearHref={filtered ? '/content/ledger' : null} />
      <Facet title="テーマ" items={facetItems(now, 't', theme, themeScope.length, themeItems)} />
      <Facet title="カバー分類（note 記事）" items={facetItems(now, 'cv', cover, coverScope.length, coverItems)} />
      <Facet title="チャネル" items={facetItems(now, 'c', channel, channelScope.length, channelItems)} />
      <Facet title="状態" items={facetItems(now, 's', state, stateScope.length, stateItems)} />
    </>
  );

  return (
    <>
      <PageHead title={title ? `コンテンツ台帳：${title}` : 'コンテンツ台帳'} />
      <FacetShell main={main} rail={rail} />
    </>
  );
}

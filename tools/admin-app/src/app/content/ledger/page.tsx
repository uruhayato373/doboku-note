import Link from 'next/link';
import {
  EmptyRow, Facet, FacetHead, FacetShell, StatusBadge,
  TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow,
  type FacetItem,
} from '@/components/admin';
import { PageHead } from '@/components/ui';
import { channelById, type AdminChannelId } from '@/lib/channel-registry';
import { loadLedgerView, type LedgerRow } from '@/lib/ledger';
import { ctaDrift, drift, inState, jst, STATES } from '@/lib/ledger-status';
import { DriftBadge } from './drift-badge';

export const dynamic = 'force-dynamic';

/**
 * コンテンツ台帳（DN-0438）。1 行 = 1 制作物（note の記事・マガジン、ココナラの出品、Kindle の本）を、
 * テーマ（資格＋転職などの話題）× チャネル × 状態で絞る。サイドメニューの「資格・テーマ別」「チャネル別」の行き先。
 * note の記事・導線・ココナラの照合は索引（npm run content-ledger）だけを読む。状態の判定は lib/ledger-status.ts。
 */

type Query = { t?: string; c?: string; s?: string };
const NO_THEME = '__none';

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
  const now: Query = { t: theme ?? undefined, c: channel ?? undefined, s: state ?? undefined };

  const view = loadLedgerView();
  // 終了した商品（ココナラのアーカイブ済み）は既定で隠す。状態「終了」を選んだときだけ出す
  const everything = view.rows;
  const all = state === 'ended' ? everything : everything.filter((r) => !r.ended);
  const hiddenEnded = everything.filter((r) => r.ended && (!channel || r.channel === channel)).length;

  const matchTheme = (r: LedgerRow) => !theme || (theme === NO_THEME ? r.themes.length === 0 : r.themes.includes(theme));
  const matchChannel = (r: LedgerRow) => !channel || r.channel === channel;
  const matchState = (r: LedgerRow) => !state || inState(r, state);

  const rows = all.filter((r) => matchTheme(r) && matchChannel(r) && matchState(r));
  // 各 facet の件数は「自分以外の facet を適用した後」で数える（/content/note と同じ）
  const themeScope = all.filter((r) => matchChannel(r) && matchState(r));
  const channelScope = all.filter((r) => matchTheme(r) && matchState(r));
  const stateScope = all.filter((r) => matchTheme(r) && matchChannel(r));

  const themeCounts = new Map<string, number>();
  for (const r of themeScope) for (const t of r.themes.length ? r.themes : [NO_THEME]) themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
  const themeItems = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count, label: key === NO_THEME ? '未分類' : view.themeLabel(key) }));
  const channelItems = view.channels.map((c) => ({ key: c.id, label: c.label, count: channelScope.filter((r) => r.channel === c.id).length }));
  const stateItems = STATES.map((s) => ({
    ...s,
    count: s.key === 'ended'
      ? everything.filter((r) => r.ended && matchTheme(r) && matchChannel(r)).length
      : stateScope.filter((r) => inState(r, s.key)).length,
  }));

  const channelLabel = new Map(view.channels.map((c) => [c.id, c.label]));
  const blockerLabel = (id: string | null) => (id ? view.blockers[id]?.label ?? id : undefined);
  const tools = channel ? channelById(channel as AdminChannelId)?.tabs ?? [] : [];
  const filtered = Boolean(theme || channel || state);
  // チャネルで絞ったら列は同じ値だけになるので出さない。note だけは記事とマガジンが混ざるので種類を出す
  const kindCol = !channel ? 'チャネル' : channel === 'note' ? '種類' : null;
  const colCount = 7 + (kindCol ? 1 : 0);
  const indexStale = view.index.generatedAt ? Date.now() - Date.parse(view.index.generatedAt) > 6 * 3_600_000 : false;
  const title = [theme ? (theme === NO_THEME ? '未分類' : view.themeLabel(theme)) : null, channel ? channelLabel.get(channel) : null]
    .filter(Boolean).join(' × ');

  const main = (
    <div className="flex flex-col gap-3">
      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span>{filtered ? <><strong className="text-foreground">{rows.length}</strong> / {all.length} 件</> : <>{all.length} 件</>}</span>
        {hiddenEnded > 0 && state !== 'ended' ? <span>（<Link href={href(now, { s: 'ended' })}>終了 {hiddenEnded} 件</Link>は隠している）</span> : null}
        {view.index.ok ? (
          <span title="note の記事の同期状態は索引を作った時点のもの。最新にするには npm run content-ledger（npm run admin の起動時に 6 時間より古ければ裏で作り直す）">
            · 索引 {jst(view.index.generatedAt)} {indexStale ? <StatusBadge tone="warn">古い</StatusBadge> : null}
          </span>
        ) : (
          <span>· <StatusBadge tone="bad" title={view.index.error ?? undefined}>索引なし</StatusBadge> note の記事は出していない（0 件ではない）。<code>npm run content-ledger</code> で作る</span>
        )}
        {tools.map((t) => <Link key={t.href} href={t.href}>{t.label}</Link>)}
        {theme && view.lineupQualifications.has(theme) ? <Link href={`/content/lineup?q=${theme}`}>商品ラインナップ</Link> : null}
      </p>
      {view.sourceErrors.map((e) => (
        <p key={e.channel} className="m-0 text-sm text-muted-foreground">
          <StatusBadge tone="bad">{channelLabel.get(e.channel) ?? e.channel} を読めない</StatusBadge> {e.message}
        </p>
      ))}

      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>タイトル</TableHead>
            {kindCol ? <TableHead>{kindCol}</TableHead> : null}
            <TableHead className="hidden xl:table-cell">テーマ</TableHead>
            <TableHead>価格</TableHead>
            <TableHead>状態</TableHead>
            <TableHead title="公開ページが正本どおりか。note＝原稿の本文・タグ（同期の判定）／ココナラ＝タイトル・キャッチコピー・本文・販売状態（公開ページの照合）。済／ずれ（マウスで理由）／止＝反映できない／?＝照合していない">本文</TableHead>
            <TableHead title="note＝カバー画像が原稿どおりか／ココナラ＝承認済みの POP 画像が登録されているか">画像</TableHead>
            <TableHead title="原稿の導線（ココナラ・パックなど）のリンク先が、note の公開記事に順番・位置どおり出ているか（公開 API で照合・マウスで内訳）。済／ずれ／?＝取得失敗">導線</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? <EmptyRow colSpan={colCount}>この条件に該当する制作物はありません。</EmptyRow> : null}
          {rows.map((r) => (
            <TableRow key={r.key}>
              <TableCell className="max-w-[28rem] truncate" title={r.path ?? r.key}>
                {r.detailHref ? <Link href={r.detailHref}>{r.title}</Link>
                  : r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a> : r.title}
              </TableCell>
              {kindCol ? (
                <TableCell className="text-muted-foreground">{channel ? r.kind : `${channelLabel.get(r.channel) ?? r.channel}・${r.kind}`}</TableCell>
              ) : null}
              <TableCell className="hidden max-w-[12rem] truncate text-muted-foreground xl:table-cell">
                {r.themes.length ? r.themes.map((t) => view.themeLabel(t)).join('・') : <StatusBadge tone="bad" title="テーマのルールに当たらない">未分類</StatusBadge>}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {r.price ?? '—'}
                {r.live?.price.length ? <> <StatusBadge tone="warn" title={r.live.price.join(' / ')}>ずれ</StatusBadge></> : null}
              </TableCell>
              <TableCell><StatusBadge tone={r.published ? 'good' : 'neutral'}>{r.stageLabel}</StatusBadge></TableCell>
              <TableCell><DriftBadge {...drift(r, 'body', blockerLabel)} /></TableCell>
              <TableCell><DriftBadge {...drift(r, 'cover', blockerLabel)} /></TableCell>
              <TableCell><DriftBadge {...ctaDrift(r)} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
    </div>
  );

  const rail = (
    <>
      <FacetHead clearHref={filtered ? '/content/ledger' : null} />
      <Facet title="テーマ" items={facetItems(now, 't', theme, themeScope.length, themeItems)} />
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

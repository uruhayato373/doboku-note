import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { channelById, type AdminChannelId } from '@/lib/channel-registry';
import { loadLedgerView, type LedgerRow } from '@/lib/ledger';

export const dynamic = 'force-dynamic';

/**
 * コンテンツ台帳（DN-0438）。1 行 = 1 制作物（note の記事・マガジン、ココナラの出品、Kindle の本）を、
 * テーマ（資格＋転職などの話題）× チャネル × 状態で絞る。サイドメニューの「資格・テーマ別」「チャネル別」の行き先。
 *
 * note の記事は索引（npm run content-ledger が作る .claude/state/content-ledger.json）だけを読む。
 * 同期の状態（反映待ち・止まっている）は索引を作った時点の note-sync-plan と同じ判定。
 * 絞り込みは note の記事表（/content/note）と同じ右レール（todo-shell / .facet）で、リンク遷移だけで動く。
 */

type Query = { t?: string; c?: string; s?: string };

const NO_THEME = '__none';
const STATES: { key: string; label: string }[] = [
  { key: 'published', label: '公開' },
  { key: 'unpublished', label: '未公開' },
  { key: 'ready', label: '反映待ち' },
  { key: 'blocked', label: '止まっている' },
];
const PART_LABEL: Record<string, string> = { body: '本文', cover: 'カバー', tags: 'タグ' };
const CTA_LABEL: Record<string, string> = { 'coconala-custom': 'ココナラ', 'pack-top': 'パック' };

function href(q: Query, patch: Partial<Query>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...q, ...patch })) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `/content/ledger?${s}` : '/content/ledger';
}

function Facet({ title, param, now, active, total, items }: {
  title: string;
  param: keyof Query;
  now: Query;
  active: string | null;
  total: number;
  items: { key: string; label: string; count: number }[];
}) {
  return (
    <section className="facet">
      <h4>{title}</h4>
      <Link href={href(now, { [param]: undefined })} className={active ? '' : 'active'}>
        <span className="fl">すべて</span>
        <span className="n">{total}</span>
      </Link>
      {items.map((i) => (
        <Link key={i.key} href={href(now, { [param]: i.key })} className={active === i.key ? 'active' : ''}>
          <span className="fl">{i.label}</span>
          <span className="n">{i.count}</span>
        </Link>
      ))}
    </section>
  );
}

function SyncCell({ row, blockerLabel }: { row: LedgerRow; blockerLabel: (id: string | null) => string | undefined }) {
  if (!row.sync) return row.channel === 'note' && row.kind === '記事' && row.published ? <span className="badge good">済</span> : <span className="muted">—</span>;
  if (row.sync.status === 'blocked') return <span className="badge bad" title={blockerLabel(row.sync.blocker)}>止</span>;
  if (row.sync.status === 'ready') {
    return (
      <span>
        {row.sync.parts.map((p) => (
          <span key={p} className="badge warn">{PART_LABEL[p] ?? p}</span>
        ))}
      </span>
    );
  }
  return <span className="badge good">済</span>;
}

export default async function LedgerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null;
  const theme = one(sp.t);
  const channel = one(sp.c);
  const state = one(sp.s);
  const now: Query = { t: theme ?? undefined, c: channel ?? undefined, s: state ?? undefined };

  const view = loadLedgerView();
  const all = view.rows;

  const matchTheme = (r: LedgerRow) => !theme || (theme === NO_THEME ? r.themes.length === 0 : r.themes.includes(theme));
  const matchChannel = (r: LedgerRow) => !channel || r.channel === channel;
  const matchState = (r: LedgerRow) =>
    state === 'published' ? r.published
      : state === 'unpublished' ? !r.published
        : state === 'ready' ? r.sync?.status === 'ready'
          : state === 'blocked' ? r.sync?.status === 'blocked'
            : true;

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
    count: stateScope.filter((r) =>
      s.key === 'published' ? r.published : s.key === 'unpublished' ? !r.published : r.sync?.status === s.key).length,
  }));

  const channelLabel = new Map(view.channels.map((c) => [c.id, c.label]));
  const blockerLabel = (id: string | null) => (id ? view.blockers[id]?.label ?? id : undefined);
  const tools = channel ? channelById(channel as AdminChannelId)?.tabs ?? [] : [];
  const filtered = Boolean(theme || channel || state);
  const title = [theme ? (theme === NO_THEME ? '未分類' : view.themeLabel(theme)) : null, channel ? channelLabel.get(channel) : null]
    .filter(Boolean).join(' × ');

  return (
    <>
      <PageHead title={title ? `コンテンツ台帳：${title}` : 'コンテンツ台帳'} sub={`${all.length} 件（note の記事・マガジン、ココナラ、Kindle）`} />
      <div className="todo-shell">
        <div className="todo-main">
          <div className="card">
            <p className="muted">
              {view.index.ok ? (
                <>
                  note の記事の索引: {view.index.generatedAt?.slice(0, 16).replace('T', ' ')}（UTC）作成 · 反映待ち{' '}
                  <strong>{view.index.syncCounts?.ready ?? '?'}</strong> / 止まっている <strong>{view.index.syncCounts?.blocked ?? '?'}</strong> ·
                  最新にするには <code>npm run content-ledger</code>（npm run admin の起動時に 6 時間より古ければ裏で作り直す）
                </>
              ) : (
                <>
                  <span className="badge bad">索引なし</span> note の記事は表示していません（0 件ではありません）。
                  <code>npm run content-ledger</code> で作る。{view.index.error}
                </>
              )}
            </p>
            {view.sourceErrors.map((e) => (
              <p key={e.channel} className="muted">
                <span className="badge bad">{channelLabel.get(e.channel) ?? e.channel} を読めない</span> {e.message}
              </p>
            ))}
            {(tools.length > 0 || (theme && view.lineupQualifications.has(theme))) && (
              <p className="muted">
                {tools.length > 0 && (
                  <>
                    {channelLabel.get(channel!)} の作業:{' '}
                    {tools.map((t, i) => (
                      <span key={t.href}>
                        {i > 0 ? ' · ' : ''}
                        <Link href={t.href}>{t.label}</Link>
                      </span>
                    ))}
                  </>
                )}
                {tools.length > 0 && theme && view.lineupQualifications.has(theme) ? '　' : ''}
                {theme && view.lineupQualifications.has(theme) && (
                  <Link href={`/content/lineup?q=${theme}`}>この資格の商品ラインナップ（資格 × 試験区分のマス目）</Link>
                )}
              </p>
            )}
            <p className="muted">
              {filtered ? <><strong>{rows.length}</strong> 件を表示中（全 {all.length} 件）</> : <>全 {all.length} 件。右の絞り込みでテーマ・チャネル・状態を選べる。</>}
            </p>

            {rows.length === 0 ? (
              <p className="empty">この条件に該当する制作物はありません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data content-table">
                  <thead>
                    <tr>
                      <th className="title-col">タイトル</th>
                      <th className="publish-col">チャネル</th>
                      <th className="category-col optional-col">テーマ</th>
                      <th className="price-col">価格</th>
                      <th className="publish-col">状態</th>
                      <th className="publish-col">同期</th>
                      <th className="publish-col">導線</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key}>
                        <td className="title-cell" title={r.path ?? r.key}>
                          {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a> : r.title}
                        </td>
                        <td className="publish-col">
                          <span className="muted">{channelLabel.get(r.channel) ?? r.channel}・{r.kind}</span>
                        </td>
                        <td className="category-col optional-col">
                          {r.themes.length ? (
                            <span className="muted">{r.themes.map((t) => view.themeLabel(t)).join('・')}</span>
                          ) : (
                            <span className="badge bad" title="テーマのルールに当たらない">未分類</span>
                          )}
                        </td>
                        <td className="price-col"><span className="muted">{r.price ?? '—'}</span></td>
                        <td className="publish-col">
                          <span className={'badge ' + (r.published ? 'good' : 'neutral')}>{r.stageLabel}</span>
                        </td>
                        <td className="publish-col"><SyncCell row={r} blockerLabel={blockerLabel} /></td>
                        <td className="publish-col">
                          {r.ctas.filter((c) => CTA_LABEL[c]).map((c) => (
                            <span key={c} className="badge neutral">{CTA_LABEL[c]}</span>
                          ))}
                          {r.ctas.length === 0 ? <span className="muted">—</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="todo-rail">
          <div className="rail-head">
            <span>絞り込み</span>
            {filtered ? <Link href="/content/ledger">すべて解除</Link> : null}
          </div>
          <Facet title="テーマ" param="t" now={now} active={theme} total={themeScope.length} items={themeItems} />
          <Facet title="チャネル" param="c" now={now} active={channel} total={channelScope.length} items={channelItems} />
          <Facet title="状態" param="s" now={now} active={state} total={stateScope.length} items={stateItems} />
        </aside>
      </div>
    </>
  );
}

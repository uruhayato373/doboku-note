import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { Card, CardContent } from '@/components/ui/card';
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
  { key: 'ready', label: 'ずれあり' },
  { key: 'blocked', label: '止まっている' },
  { key: 'cta', label: '導線ずれ' },
];
const PART_LABEL: Record<string, string> = { body: '本文', cover: 'カバー', tags: 'タグ' };
// 未反映の理由（scripts/lib/note-sync-plan.mjs の classifySync・reasons）。本文の asset は「本文の画像・PDF だけ差し替えた」
const REASON_LABEL: Record<string, string> = {
  'body:drift': '本文を直した',
  'body:unrecorded': '本文の反映記録が無い',
  'body:asset': '本文の画像・PDF を差し替えた',
  'cover:unrecorded': 'カバーの反映記録が無い',
  'cover:design': 'カバーのデザインが変わった',
  'cover:input': 'カバーの元（題名など）が変わった',
  'cover:no-cover': 'note にカバーが無い',
  'cover:live-changed': 'note のカバーが記録と違う',
  'tags:drift': 'タグを直した',
};
const CTA_LABEL: Record<string, string> = { 'coconala-custom': 'ココナラ', 'pack-top': 'パック' };

function jst(iso: string | null): string {
  if (!iso) return '?';
  const d = new Date(Date.parse(iso) + 9 * 3_600_000).toISOString();
  return `${d.slice(5, 10).replace('-', '/')} ${d.slice(11, 16)}`;
}

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

type DriftState = 'ok' | 'drift' | 'blocked' | 'unknown' | 'none';
const DRIFT_BADGE: Record<Exclude<DriftState, 'none'>, { cls: string; label: string }> = {
  ok: { cls: 'good', label: '済' },
  drift: { cls: 'warn', label: 'ずれ' },
  blocked: { cls: 'bad', label: '止' },
  unknown: { cls: 'neutral', label: '?' },
};

/**
 * note の公開記事と原稿の「ずれ」を、本文・カバー・導線の 3 つに分けて出す（判定は note-sync-plan のまま）。
 *   本文 … 本文のテキスト・本文の画像や PDF・タグ　カバー … カバー画像　導線 … 導線を入れた本文が note に出ているか
 */
function drift(row: LedgerRow, part: 'body' | 'cover', blocker?: (id: string | null) => string | undefined): { state: DriftState; why?: string } {
  if (row.live) return productDrift(row.live, part);
  if (row.channel !== 'note' || row.kind !== '記事' || !row.published) return { state: 'none' };
  const sync = row.sync;
  if (!sync) return { state: 'ok' };
  const keys = part === 'body' ? ['body', 'tags'] : ['cover'];
  const hit = keys.filter((k) => sync.parts.includes(k));
  const stopped = sync.status === 'blocked' ? `止まっている理由: ${blocker?.(sync.blocker) ?? sync.blocker}` : null;
  // 止まっている記事は本文の欄に出す（部分の差が無くても、メタ情報のずれなどで記事ごと止まることがある）
  if (!hit.length) return stopped && part === 'body' ? { state: 'blocked', why: stopped } : { state: 'ok' };
  const why = hit.map((k) => REASON_LABEL[`${k}:${sync.reasons?.[k]}`] ?? PART_LABEL[k] ?? k).join('・');
  return stopped ? { state: 'blocked', why: `${why}（${stopped}）` } : { state: 'drift', why };
}

/** ココナラの出品中のサービス: 本文＝タイトル・キャッチコピー・本文と販売状態、画像＝承認済み POP 画像の登録 */
function productDrift(live: NonNullable<LedgerRow['live']>, part: 'body' | 'cover'): { state: DriftState; why?: string } {
  if (part === 'cover') return live.image ? { state: 'drift', why: live.image } : { state: 'ok', why: '承認済みの POP 画像が登録されている（公開ページの画像との一致は見ていない）' };
  if (!live.checkedAt) return { state: 'unknown', why: '公開照合をしていない（npm run content-ledger で作る）' };
  const issues = [...live.sale, ...live.text];
  return issues.length ? { state: 'drift', why: issues.join(' / ') } : { state: 'ok', why: `公開ページが正本と一致（照合 ${jst(live.checkedAt)}）` };
}

function hasDrift(r: LedgerRow): boolean {
  if (r.live) return Boolean(r.live.image || r.live.sale.length || r.live.text.length || r.live.price.length);
  return r.sync?.status === 'ready';
}

function DriftCell({ state, why }: { state: DriftState; why?: string }) {
  if (state === 'none') return <span className="muted">—</span>;
  const b = DRIFT_BADGE[state];
  return <span className={`badge ${b.cls}`} title={why}>{b.label}</span>;
}

const CTA_STATE_LABEL: Record<string, string> = { missing: '出ていない', order: '順番が違う', position: '最初の見出しの後ろにある' };
const CTA_DRIFT = new Set(['missing', 'order', 'position']);

/** 導線: 原稿の導線ブロックのリンク先が note の公開記事に出ているかを公開 API で照合した結果（索引を作った時点）。 */
function CtaCell({ row }: { row: LedgerRow }) {
  const live = row.ctaLive;
  if (!live) return <span className="muted">—</span>;
  if (live.state === 'unknown') return <span className="badge neutral" title={`公開 API を取得できなかった: ${live.error ?? ''}`}>?</span>;
  const ids = Object.entries(live.byId ?? {});
  const why = ids
    .map(([id, r]) => `${CTA_LABEL[id] ?? id}: ${r.state === 'ok' ? '出ている' : CTA_STATE_LABEL[r.state] ?? r.state}`)
    .join(' / ');
  const b = live.state === 'ok' ? DRIFT_BADGE.ok : DRIFT_BADGE.drift;
  return <span className={`badge ${b.cls}`} title={`${why}（照合 ${jst(live.checkedAt)}）`}>{b.label}</span>;
}

function inState(r: LedgerRow, key: string): boolean {
  if (key === 'published') return r.published;
  if (key === 'unpublished') return !r.published;
  if (key === 'cta') return CTA_DRIFT.has(r.ctaLive?.state ?? '');
  if (key === 'ready') return hasDrift(r);
  return r.sync?.status === key;
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
    count: stateScope.filter((r) => inState(r, s.key)).length,
  }));

  const channelLabel = new Map(view.channels.map((c) => [c.id, c.label]));
  const blockerLabel = (id: string | null) => (id ? view.blockers[id]?.label ?? id : undefined);
  const tools = channel ? channelById(channel as AdminChannelId)?.tabs ?? [] : [];
  const filtered = Boolean(theme || channel || state);
  // チャネルで絞ったら列は同じ値だけになるので出さない。note だけは記事とマガジンが混ざるので種類を出す
  const kindCol = !channel ? 'チャネル' : channel === 'note' ? '種類' : null;
  const indexStale = view.index.generatedAt ? Date.now() - Date.parse(view.index.generatedAt) > 6 * 3_600_000 : false;
  const title = [theme ? (theme === NO_THEME ? '未分類' : view.themeLabel(theme)) : null, channel ? channelLabel.get(channel) : null]
    .filter(Boolean).join(' × ');

  return (
    <>
      <PageHead title={title ? `コンテンツ台帳：${title}` : 'コンテンツ台帳'} />
      <div className="todo-shell">
        <div className="todo-main">
          <Card>
            <CardContent>
            <p className="muted">
              {filtered ? <><strong>{rows.length}</strong> / {all.length} 件</> : <>{all.length} 件</>}
              {view.index.ok ? (
                <span title="note の記事の同期状態は索引を作った時点のもの。最新にするには npm run content-ledger（npm run admin の起動時に 6 時間より古ければ裏で作り直す）">
                  {' '}· 索引 {jst(view.index.generatedAt)}
                  {indexStale ? <> <span className="badge warn">古い</span></> : null}
                </span>
              ) : (
                <> · <span className="badge bad" title={view.index.error ?? undefined}>索引なし</span> note の記事は出していない（0 件ではない）。<code>npm run content-ledger</code> で作る</>
              )}
              {tools.length > 0 && (
                <>
                  {'　'}
                  {tools.map((t, i) => (
                    <span key={t.href}>
                      {i > 0 ? ' · ' : ''}
                      <Link href={t.href}>{t.label}</Link>
                    </span>
                  ))}
                </>
              )}
              {theme && view.lineupQualifications.has(theme) ? <>{'　'}<Link href={`/content/lineup?q=${theme}`}>商品ラインナップ</Link></> : null}
            </p>
            {view.sourceErrors.map((e) => (
              <p key={e.channel} className="muted">
                <span className="badge bad">{channelLabel.get(e.channel) ?? e.channel} を読めない</span> {e.message}
              </p>
            ))}

            {rows.length === 0 ? (
              <p className="empty">この条件に該当する制作物はありません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data content-table">
                  <thead>
                    <tr>
                      <th className="title-col">タイトル</th>
                      {kindCol ? <th className="publish-col">{kindCol}</th> : null}
                      <th className="category-col optional-col">テーマ</th>
                      <th className="price-col">価格</th>
                      <th className="publish-col">状態</th>
                      <th className="publish-col" title="公開ページが正本どおりか。note＝原稿の本文・タグ（同期の判定）／ココナラ＝タイトル・キャッチコピー・本文・販売状態（公開ページの照合）。済／ずれ（マウスで理由）／止＝反映できない／?＝照合していない">本文</th>
                      <th className="publish-col" title="note＝カバー画像が原稿どおりか／ココナラ＝承認済みの POP 画像が登録されているか">画像</th>
                      <th className="publish-col" title="原稿の導線（ココナラ・パックなど）のリンク先が、note の公開記事に順番・位置どおり出ているか（公開 API で照合・マウスで内訳）。済／ずれ／?＝取得失敗">導線</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key}>
                        <td className="title-cell" title={r.path ?? r.key}>
                          {r.detailHref ? <Link href={r.detailHref}>{r.title}</Link>
                            : r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a> : r.title}
                        </td>
                        {kindCol ? (
                          <td className="publish-col">
                            <span className="muted">{channel ? r.kind : `${channelLabel.get(r.channel) ?? r.channel}・${r.kind}`}</span>
                          </td>
                        ) : null}
                        <td className="category-col optional-col">
                          {r.themes.length ? (
                            <span className="muted">{r.themes.map((t) => view.themeLabel(t)).join('・')}</span>
                          ) : (
                            <span className="badge bad" title="テーマのルールに当たらない">未分類</span>
                          )}
                        </td>
                        <td className="price-col">
                          <span className="muted">{r.price ?? '—'}</span>
                          {r.live?.price.length ? <> <span className="badge warn" title={r.live.price.join(' / ')}>ずれ</span></> : null}
                        </td>
                        <td className="publish-col">
                          <span className={'badge ' + (r.published ? 'good' : 'neutral')}>{r.stageLabel}</span>
                        </td>
                        <td className="publish-col"><DriftCell {...drift(r, 'body', blockerLabel)} /></td>
                        <td className="publish-col"><DriftCell {...drift(r, 'cover', blockerLabel)} /></td>
                        <td className="publish-col"><CtaCell row={r} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </CardContent>
          </Card>
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

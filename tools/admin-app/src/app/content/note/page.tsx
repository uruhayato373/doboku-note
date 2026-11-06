import Link from 'next/link';
import { DataTable, DetailList, DetailSheet, Facet, FacetHead, FacetShell, StatusBadge, type DataTableColumn, type DataTableRow, type FacetItem, FilterBar, FilterChip } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import FunnelPanel from './FunnelPanel';
import {
  magazineLabelIndex,
  noteArticles,
  noteRepoRelPath,
  type NoteArticle,
} from '@/lib/content';
import { noteSyncPlan, type SyncItem, type SyncPart } from '@/lib/note-sync';

export const dynamic = 'force-dynamic';

/**
 * note 記事一覧（読み取り専用）。
 *
 * 827 本を素で 1 表に流すと目で追えないため、右レールで資格・価格・状態・マガジンを絞り込む。
 * レール実装は components/admin の FacetShell / FacetHead / Facet（/content/ledger と同じ）。
 * JS 不要のリンク遷移だけで動く＝RSC ファーストの方針どおり。
 *
 * 表はタイトル 1 行（＝note で公開しているタイトル）だけを出し、所属マガジンはレールへ寄せる。
 * 2026-08-24 まではタイトルの下に `<br>` でシリーズ名を足していたため 787/827 行が 2 行になり、
 * 一覧の一望性が落ちていた。さらにその値は `noteSeries || noteMagazine` の畳み込みだったが、
 * **この 2 つは別の語彙**で、200 本で値が食い違っていた（例: `総監模範論文-河川コンサルペルソナ` と
 * `総監模範論文-河川コンサル`）。
 *
 *   - `noteMagazine` = 商品（マガジン）への所属ラベル。check-magazine-membership（quality-audit の
 *     ci ゲート）と check-note-price-consistency が**この単位で集計する**
 *   - `noteSeries`   = 編集上の系列マーカー。`noteSeries: 総合案内` は もくじ index の例外判定に使われ、
 *     .claude/scripts/check-note-magazine-cta.mjs → note-lint（pre-commit）が読む
 *
 * どちらも生きているが集計単位が違うので、畳み込むと画面の表示と検査の単位がズレる。
 * この表はマガジン（商品）を絞る面なので `noteMagazine` だけを使う。2 語彙の境界をどう引くかは
 * backlog DN-0125。
 */

type Query = { e?: string; t?: string; p?: string; s?: string; m?: string };

/**
 * 「マガジン未設定」を表す facet キー。ラベルは frontmatter の生値なので衝突しない接頭辞を使う。
 * どの商品にも属さない記事を洗い出すのが用途（827 本中 129 本ある）。
 */
const NO_MAGAZINE = '__none';

/**
 * テーマの絞り込み（DN-0437）。以前は content/note 直下のフォルダ名を「資格」として出していたため、
 * 資格のフォルダに置いた転職・キャリアの記事が資格の件数に混ざっていた。テーマは
 * scripts/lib/content-theme.mjs（config/content-themes.json）が決める。未分類は赤で出す。
 */
const NO_THEME = '__none';

/**
 * 状態の絞り込み。「反映待ち」「止まっている」は note の記事単位の同期計画（scripts/lib/note-sync-plan.mjs。
 * /content/note-sync・週次・launchd note-sync と同じ判定）が取れたときだけ意味を持つ（DN-0436）。
 */
const STATES: { key: string; label: string }[] = [
  { key: 'published', label: '公開済み' },
  { key: 'unpublished', label: '未公開' },
  { key: 'ready', label: '反映待ち' },
  { key: 'blocked', label: '止まっている' },
];

const PART_LABEL: Record<SyncPart, string> = { body: '本文', cover: 'カバー', tags: 'タグ', title: '題名' };

/** 導線マーカー（原稿の `<!-- cta:<id> -->`）のうち、表で見せるもの。それ以外は数だけ出す。 */
const CTA_LABEL: Record<string, string> = { 'coconala-custom': 'ココナラ', 'pack-top': 'パック' };

const PRICING: { key: string; label: string }[] = [
  { key: 'paid', label: '有料' },
  { key: 'free', label: '無料' },
  { key: 'membership', label: 'メンバーシップ' },
];

const CONTENT_TYPES: { key: string; label: string }[] = [
  { key: 'product', label: '商品' },
  { key: 'index', label: 'もくじ' },
  { key: 'learning', label: '学習記事' },
  { key: 'career', label: 'キャリア' },
  { key: 'editorial', label: '一般・雑談' },
];

const COLUMNS: DataTableColumn[] = [
  { key: 'title', label: 'タイトル' },
  { key: 'theme', label: 'テーマ' },
  { key: 'pricing', label: '価格' },
  { key: 'published', label: '公開' },
  { key: 'sync', label: '同期' },
];

function href(q: Query, patch: Partial<Query>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...q, ...patch })) if (value) params.set(key, value);
  const search = params.toString();
  return search ? '/content/note?' + search : '/content/note';
}

function countBy(items: NoteArticle[], pick: (item: NoteArticle) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = pick(item);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** facet 1 つ分の項目（先頭に「すべて」）。hint はマウスを載せたときの補足。 */
function facetItems(
  now: Query,
  param: keyof Query,
  active: string | null,
  total: number,
  items: { key: string; label: string; count: number; hint?: string }[],
): FacetItem[] {
  return [
    { key: '__all', label: 'すべて', count: total, href: href(now, { [param]: undefined }), active: !active },
    ...items.map((item) => ({
      key: item.key,
      label: item.hint ? <span title={item.hint}>{item.label}</span> : item.label,
      count: item.count,
      href: href(now, { [param]: item.key }),
      active: active === item.key,
    })),
  ];
}

export default async function ContentNotePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const viewTabs = (active: 'articles' | 'funnel') => (
    <FilterBar className="mb-3!">
      <FilterChip active={active === 'articles'} href="/content/note">記事</FilterChip>
      <FilterChip active={active === 'funnel'} href="/content/note?view=funnel">導線</FilterChip>
    </FilterBar>
  );
  if (sp.view === 'funnel') {
    return (
      <>
        <PageHead title="note 記事" />
        {viewTabs('funnel')}
        <FunnelPanel />
      </>
    );
  }
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null;
  const exam = one(sp.e);
  const contentType = one(sp.t);
  const pricing = one(sp.p);
  const state = one(sp.s);
  const magazine = one(sp.m);
  const now: Query = {
    e: exam ?? undefined,
    t: contentType ?? undefined,
    p: pricing ?? undefined,
    s: state ?? undefined,
    m: magazine ?? undefined,
  };

  const all = noteArticles();
  const plan = noteSyncPlan();
  const syncByPath = new Map<string, SyncItem>(plan.items.map((s) => [s.path, s]));
  const syncOf = (i: NoteArticle) => syncByPath.get(noteRepoRelPath(i.rel)) ?? null;
  const isReady = (i: NoteArticle) => plan.ok && syncOf(i)?.status === 'ready';
  const isBlocked = (i: NoteArticle) => plan.ok && syncOf(i)?.status === 'blocked';

  const matchState = (i: NoteArticle) =>
    state === 'published' ? i.published
      : state === 'unpublished' ? !i.published
        : state === 'ready' ? isReady(i)
          : state === 'blocked' ? isBlocked(i)
            : true;
  const matchExam = (i: NoteArticle) => !exam || (exam === NO_THEME ? !i.theme : i.theme === exam);
  const matchContentType = (i: NoteArticle) => !contentType || i.contentType === contentType;
  const matchPricing = (i: NoteArticle) => !pricing || i.pricing === pricing;
  const matchMagazine = (i: NoteArticle) =>
    !magazine ? true : magazine === NO_MAGAZINE ? !i.magazine : i.magazine === magazine;

  const items = all.filter(
    (i) => matchExam(i) && matchContentType(i) && matchPricing(i) && matchState(i) && matchMagazine(i));

  // 各facetの件数は「自分以外のfacetを適用した後」で数える。全体数を出すと、絞った状態で
  // 0 件のはずの選択肢が大きい数字で並び、押しても何も出ないという読み違いになる。
  const examScope = all.filter((i) => matchContentType(i) && matchPricing(i) && matchState(i) && matchMagazine(i));
  const typeScope = all.filter((i) => matchExam(i) && matchPricing(i) && matchState(i) && matchMagazine(i));
  const pricingScope = all.filter((i) => matchExam(i) && matchContentType(i) && matchState(i) && matchMagazine(i));
  const stateScope = all.filter((i) => matchExam(i) && matchContentType(i) && matchPricing(i) && matchMagazine(i));
  const magazineScope = all.filter((i) => matchExam(i) && matchContentType(i) && matchPricing(i) && matchState(i));

  const examCounts = countBy(examScope, (i) => i.theme ?? NO_THEME);
  const typeCounts = countBy(typeScope, (i) => i.contentType);
  const themeLabels = new Map(all.map((i) => [i.theme ?? NO_THEME, i.theme ? i.themeLabel : '未分類']));
  const pricingCounts = countBy(pricingScope, (i) => i.pricing);
  const stateCounts = new Map<string, number>([
    ['published', stateScope.filter((i) => i.published).length],
    ['unpublished', stateScope.filter((i) => !i.published).length],
    ['ready', stateScope.filter(isReady).length],
    ['blocked', stateScope.filter(isBlocked).length],
  ]);
  const magazineCounts = countBy(magazineScope, (i) => i.magazine ?? NO_MAGAZINE);

  // ラベルは `BK-01` のような社内コードもあるので、note-magazines.ts の shortTitle へ解決して出す。
  // 絞り込みキーは常に生ラベル（frontmatter の値）なので、写像が古びても絞り込みは壊れない。
  // 他 facet 適用後に 0 本になる選択肢は隠す — 44 行の死んだ選択肢がレールを埋めると、
  // 上の短い facet 3 つが画面外へ押し出される。
  const magIndex = magazineLabelIndex();
  const magazineItems = [...magazineCounts.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({
      key,
      count,
      label: key === NO_MAGAZINE ? '（マガジン未設定）' : magIndex.get(key)?.title ?? key,
      hint: key === NO_MAGAZINE ? 'noteMagazine を持たない記事' : key,
    }));

  const examKeys = [...examCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const filtered = Boolean(exam || contentType || pricing || state || magazine);

  const rows: DataTableRow[] = items.map((i) => {
    const sync = syncOf(i);
    const blockerLabel = sync?.blocker ? plan.blockers[sync.blocker]?.label ?? sync.blocker : null;
    const typeLabel = CONTENT_TYPES.find((type) => type.key === i.contentType)?.label ?? i.contentType;
    const pricingLabel = i.pricing === 'paid' ? '有料' : i.pricing === 'free' ? '無料' : i.pricing === 'membership' ? '会員' : '?';
    const ctaLabels = i.ctas.filter((c) => CTA_LABEL[c]).map((c) => CTA_LABEL[c]);
    const syncLabel = !plan.ok ? '?'
      : sync?.status === 'blocked' ? '止'
        : sync?.status === 'ready' ? sync.parts.map((p) => PART_LABEL[p]).join('・')
          : i.published ? '済' : null;
    return {
      id: i.rel,
      values: {
        title: i.title,
        theme: i.theme ? i.themeLabel : '未分類',
        pricing: pricingLabel,
        published: i.published ? '公開' : '未',
        sync: syncLabel,
      },
      cells: {
        title: (
          <DetailSheet trigger={<span className="block max-w-[28rem] truncate">{i.title}</span>} title={i.title} description={i.rel}>
            <DetailList
              items={[
                { label: '記事区分', value: typeLabel },
                { label: 'マガジン', value: i.magazine },
                { label: '導線', value: ctaLabels.join('・') },
                { label: '同期', value: blockerLabel },
                { label: 'note', value: i.noteUrl ? <a href={i.noteUrl} target="_blank" rel="noopener noreferrer">公開記事を開く</a> : null },
              ]}
            />
          </DetailSheet>
        ),
        theme: i.theme ? (
          <span className="text-muted-foreground">{i.themeLabel}</span>
        ) : (
          <StatusBadge tone="bad" title="content-themes.json のどのルールにも当たらない">未分類</StatusBadge>
        ),
        pricing: (
          <StatusBadge tone={i.pricing === 'paid' ? 'info' : i.pricing === 'free' ? 'good' : 'neutral'}>
            {pricingLabel}
          </StatusBadge>
        ),
        published: i.published ? (
          <StatusBadge tone="good">公開</StatusBadge>
        ) : (
          <StatusBadge tone="warn">未</StatusBadge>
        ),
        sync: !plan.ok ? (
          <StatusBadge tone="neutral">?</StatusBadge>
        ) : sync?.status === 'blocked' ? (
          <StatusBadge tone="bad" title={blockerLabel ?? undefined}>止</StatusBadge>
        ) : sync?.status === 'ready' ? (
          <span className="inline-flex flex-wrap gap-1" title={sync.parts.map((p) => PART_LABEL[p]).join('・')}>
            {sync.parts.map((p) => (
              <StatusBadge key={p} tone="warn">{PART_LABEL[p]}</StatusBadge>
            ))}
          </span>
        ) : i.published ? (
          <StatusBadge tone="good">済</StatusBadge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      },
    };
  });

  const main = (
    <Stack>
            <p className="text-sm">
              {plan.ok ? (
                <>
                  反映済み {plan.counts.synced} 本 / 反映待ち <strong>{plan.counts.ready}</strong> 本 / 止まっている <strong>{plan.counts.blocked}</strong> 本（<Link href="/content/note-sync">反映</Link>）
                </>
              ) : (
                <StatusBadge tone="bad">同期計画の取得失敗</StatusBadge>
              )}
              {filtered && <span className="ml-3">表示 <strong>{items.length}</strong> / {all.length} 本</span>}
            </p>

            <DataTable
              columns={COLUMNS}
              rows={rows}
              filter="タイトル・テーマなどで絞り込む"
              emptyText="該当なし"
            />
    </Stack>
  );

  const rail = (
    <>
      <FacetHead clearHref={filtered ? '/content/note' : null} />
      <Facet
        title="記事区分"
        items={facetItems(now, 't', contentType, typeScope.length, CONTENT_TYPES.map((type) => ({ ...type, count: typeCounts.get(type.key) ?? 0 })))}
      />
      <Facet
        title="テーマ"
        items={facetItems(now, 'e', exam, examScope.length, examKeys.map((key) => ({ key, label: themeLabels.get(key) ?? key, count: examCounts.get(key) ?? 0 })))}
      />
      <Facet
        title="価格"
        items={facetItems(now, 'p', pricing, pricingScope.length, PRICING.map((p) => ({ ...p, count: pricingCounts.get(p.key) ?? 0 })))}
      />
      <Facet
        title="状態"
        items={facetItems(now, 's', state, stateScope.length, STATES.map((s) => ({ ...s, count: stateCounts.get(s.key) ?? 0 })))}
      />
      <Facet title="マガジン" items={facetItems(now, 'm', magazine, magazineScope.length, magazineItems)} />
      {!plan.ok ? (
        <StatusBadge tone="bad">同期は判定不可</StatusBadge>
      ) : null}
    </>
  );

  return (
    <>
      <PageHead title="note 記事" />
      {viewTabs('articles')}
      <FacetShell main={main} rail={rail} />
    </>
  );
}

import Link from 'next/link';
import { PageHead } from '@/components/ui';
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
 * レール実装は /todo と同じ `todo-shell` / `todo-main` / `todo-rail` + `.facet` を再利用する
 * （globals.css:915-1011 に 900px 以下で縦積み＋先頭へ引き上げるレスポンシブが既にある）。
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

type Query = { e?: string; p?: string; s?: string; m?: string };

/**
 * 「マガジン未設定」を表す facet キー。ラベルは frontmatter の生値なので衝突しない接頭辞を使う。
 * どの商品にも属さない記事を洗い出すのが用途（827 本中 129 本ある）。
 */
const NO_MAGAZINE = '__none';

/**
 * テーマの絞り込み（DN-0437）。以前は content/note 直下のフォルダ名を「資格」として出していたため、
 * 資格のフォルダに置いた転職・キャリアの記事が資格の件数に混ざっていた。テーマは
 * scripts/lib/content-theme.mjs（.claude/config/content-themes.json）が決める。未分類は赤で出す。
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

const PART_LABEL: Record<SyncPart, string> = { body: '本文', cover: 'カバー', tags: 'タグ' };

/** 導線マーカー（原稿の `<!-- cta:<id> -->`）のうち、表で見せるもの。それ以外は数だけ出す。 */
const CTA_LABEL: Record<string, string> = { 'coconala-custom': 'ココナラ', 'pack-top': 'パック' };

const PRICING: { key: string; label: string }[] = [
  { key: 'paid', label: '有料' },
  { key: 'free', label: '無料' },
  { key: 'membership', label: 'メンバーシップ' },
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

function Facet({
  title,
  param,
  now,
  active,
  total,
  items,
}: {
  title: string;
  param: keyof Query;
  now: Query;
  active: string | null;
  total: number;
  items: { key: string; label: string; count: number; hint?: string }[];
}) {
  return (
    <section className="facet">
      <h4>{title}</h4>
      <Link href={href(now, { [param]: undefined })} className={active ? '' : 'active'}>
        <span className="fl">すべて</span>
        <span className="n">{total}</span>
      </Link>
      {items.map((item) => (
        <Link
          key={item.key}
          href={href(now, { [param]: item.key })}
          className={active === item.key ? 'active' : ''}
          title={item.hint}
        >
          <span className="fl">{item.label}</span>
          <span className="n">{item.count}</span>
        </Link>
      ))}
    </section>
  );
}

export default async function ContentNotePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null;
  const exam = one(sp.e);
  const pricing = one(sp.p);
  const state = one(sp.s);
  const magazine = one(sp.m);
  const now: Query = {
    e: exam ?? undefined,
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
  const matchPricing = (i: NoteArticle) => !pricing || i.pricing === pricing;
  const matchMagazine = (i: NoteArticle) =>
    !magazine ? true : magazine === NO_MAGAZINE ? !i.magazine : i.magazine === magazine;

  const items = all.filter(
    (i) => matchExam(i) && matchPricing(i) && matchState(i) && matchMagazine(i));

  // 各facetの件数は「自分以外のfacetを適用した後」で数える。全体数を出すと、絞った状態で
  // 0 件のはずの選択肢が大きい数字で並び、押しても何も出ないという読み違いになる。
  const examScope = all.filter((i) => matchPricing(i) && matchState(i) && matchMagazine(i));
  const pricingScope = all.filter((i) => matchExam(i) && matchState(i) && matchMagazine(i));
  const stateScope = all.filter((i) => matchExam(i) && matchPricing(i) && matchMagazine(i));
  const magazineScope = all.filter((i) => matchExam(i) && matchPricing(i) && matchState(i));

  const examCounts = countBy(examScope, (i) => i.theme ?? NO_THEME);
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
  const filtered = Boolean(exam || pricing || state || magazine);

  return (
    <>
      <PageHead
        title="note 記事"
        sub={`${all.length} 本（noteUrl あり = 公開済み ${all.filter((i) => i.published).length}）· content/note/**`}
      />
      <div className="todo-shell">
        <div className="todo-main">
          <div className="card">
            <p className="muted">
              {plan.ok ? (
                <>
                  公開記事の同期: 反映済み {plan.counts.synced} 本 / 反映待ち <strong>{plan.counts.ready}</strong> 本 /
                  止まっている <strong>{plan.counts.blocked}</strong> 本（理由と直し方は{' '}
                  <Link href="/content/note-sync">反映</Link>）
                </>
              ) : (
                <>
                  <span className="badge bad">同期計画の取得失敗</span> note-sync-plan が実行できないため、
                  下の「同期」列は判定していません（空欄＝問題なし ではありません）。{plan.error}
                </>
              )}
            </p>
            <p className="muted">
              {filtered ? (
                <>
                  <strong>{items.length}</strong> 本を表示中（全 {all.length} 本）
                </>
              ) : (
                <>全 {all.length} 本を表示中。右の絞り込みでテーマ・価格・状態・マガジンを選べる。</>
              )}
              {' '}タイトルをクリックすると note の公開記事を別タブで開く。
            </p>

            {items.length === 0 ? (
              <p className="empty">この条件に該当する記事はありません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data content-table">
                  <thead>
                    <tr>
                      <th className="title-col">タイトル</th>
                      <th className="category-col optional-col">テーマ</th>
                      <th className="price-col">価格</th>
                      <th className="publish-col">公開</th>
                      <th className="publish-col">同期</th>
                      <th className="publish-col">導線</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => {
                      const sync = syncOf(i);
                      const blockerLabel = sync?.blocker ? plan.blockers[sync.blocker]?.label ?? sync.blocker : null;
                      return (
                        <tr key={i.rel}>
                          <td className="title-cell" title={i.rel}>
                            {i.noteUrl ? (
                              <a href={i.noteUrl} target="_blank" rel="noopener noreferrer">
                                {i.title}
                              </a>
                            ) : (
                              i.title
                            )}
                          </td>
                          <td className="category-col optional-col">
                            {i.theme ? (
                              <span className="muted">{i.themeLabel}</span>
                            ) : (
                              <span className="badge bad" title="content-themes.json のどのルールにも当たらない">未分類</span>
                            )}
                          </td>
                          <td className="price-col">
                            <span
                              className={
                                'badge ' + (i.pricing === 'paid' ? 'accent' : i.pricing === 'free' ? 'good' : 'neutral')
                              }
                            >
                              {i.pricing === 'paid' ? '有料' : i.pricing === 'free' ? '無料' : i.pricing === 'membership' ? '会員' : '?'}
                            </span>
                          </td>
                          <td className="publish-col">
                            {i.published ? (
                              <span className="badge good">公開</span>
                            ) : (
                              <span className="badge warn">未</span>
                            )}
                          </td>
                          <td className="publish-col">
                            {!plan.ok ? (
                              <span className="badge neutral">?</span>
                            ) : sync?.status === 'blocked' ? (
                              <span className="badge bad" title={blockerLabel ?? undefined}>止</span>
                            ) : sync?.status === 'ready' ? (
                              <span title={sync.parts.map((p) => PART_LABEL[p]).join('・')}>
                                {sync.parts.map((p) => (
                                  <span key={p} className="badge warn">{PART_LABEL[p]}</span>
                                ))}
                              </span>
                            ) : i.published ? (
                              <span className="badge good">済</span>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td className="publish-col">
                            {i.ctas.filter((c) => CTA_LABEL[c]).map((c) => (
                              <span key={c} className="badge neutral" title={`<!-- cta:${c} -->`}>{CTA_LABEL[c]}</span>
                            ))}
                            {i.ctas.length === 0 ? <span className="muted">—</span> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="todo-rail">
          <div className="rail-head">
            <span>絞り込み</span>
            {filtered ? <Link href="/content/note">すべて解除</Link> : null}
          </div>
          <Facet
            title="テーマ"
            param="e"
            now={now}
            active={exam}
            total={examScope.length}
            items={examKeys.map((key) => ({ key, label: themeLabels.get(key) ?? key, count: examCounts.get(key) ?? 0 }))}
          />
          <Facet
            title="価格"
            param="p"
            now={now}
            active={pricing}
            total={pricingScope.length}
            items={PRICING.map((p) => ({ ...p, count: pricingCounts.get(p.key) ?? 0 }))}
          />
          <Facet
            title="状態"
            param="s"
            now={now}
            active={state}
            total={stateScope.length}
            items={STATES.map((s) => ({ ...s, count: stateCounts.get(s.key) ?? 0 }))}
          />
          <Facet
            title="マガジン"
            param="m"
            now={now}
            active={magazine}
            total={magazineScope.length}
            items={magazineItems}
          />
          {!plan.ok ? (
            <p className="muted">
              <span className="badge bad">同期は判定不可</span> 「反映待ち」「止まっている」の絞り込みは 0 件になります。
            </p>
          ) : null}
        </aside>
      </div>
    </>
  );
}

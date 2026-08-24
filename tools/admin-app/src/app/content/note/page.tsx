import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { noteArticles, noteRepoRelPath, noteRepublishState, type NoteArticle } from '@/lib/content';

export const dynamic = 'force-dynamic';

/**
 * note 記事一覧（読み取り専用）。
 *
 * 827 本を素で 1 表に流すと目で追えないため、右レールで資格・価格・状態を絞り込む。
 * レール実装は /todo と同じ `todo-shell` / `todo-main` / `todo-rail` + `.facet` を再利用する
 * （globals.css:915-1011 に 900px 以下で縦積み＋先頭へ引き上げるレスポンシブが既にある）。
 * JS 不要のリンク遷移だけで動く＝RSC ファーストの方針どおり。
 */

type Query = { e?: string; p?: string; s?: string };

/** 状態の絞り込み。「要再公開」は check-note-republish の判定が取れたときだけ意味を持つ。 */
const STATES: { key: string; label: string }[] = [
  { key: 'published', label: '公開済み' },
  { key: 'unpublished', label: '未公開' },
  { key: 'drift', label: '要再公開' },
];

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
  items: { key: string; label: string; count: number }[];
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
  const now: Query = { e: exam ?? undefined, p: pricing ?? undefined, s: state ?? undefined };

  const all = noteArticles();
  const republish = noteRepublishState();
  const isDrift = (i: NoteArticle) => republish.ok && republish.drift.has(noteRepoRelPath(i.rel));

  const matchState = (i: NoteArticle) =>
    state === 'published' ? i.published
      : state === 'unpublished' ? !i.published
        : state === 'drift' ? isDrift(i)
          : true;

  const items = all.filter((i) =>
    (!exam || i.exam === exam) && (!pricing || i.pricing === pricing) && matchState(i));

  // 各facetの件数は「他のfacetを適用した後」で数える。全体数を出すと、絞った状態で
  // 0 件のはずの選択肢が大きい数字で並び、押しても何も出ないという読み違いになる。
  const examCounts = countBy(
    all.filter((i) => (!pricing || i.pricing === pricing) && matchState(i)), (i) => i.exam);
  const pricingCounts = countBy(
    all.filter((i) => (!exam || i.exam === exam) && matchState(i)), (i) => i.pricing);
  const stateScope = all.filter((i) => (!exam || i.exam === exam) && (!pricing || i.pricing === pricing));
  const stateCounts = new Map<string, number>([
    ['published', stateScope.filter((i) => i.published).length],
    ['unpublished', stateScope.filter((i) => !i.published).length],
    ['drift', stateScope.filter(isDrift).length],
  ]);

  const examKeys = [...examCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const filtered = Boolean(exam || pricing || state);

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
              {republish.ok ? (
                <>
                  要再公開（本文が公開時から変更）<strong>{republish.counts.drift}</strong> 本 / 同期済み{' '}
                  {republish.counts.synced} 本 / 未初期化 {republish.counts.unknown} 本
                </>
              ) : (
                <>
                  <span className="badge bad">ドリフト取得失敗</span> check-note-republish が実行できないため、
                  下の「要再公開」列は判定していません（空欄＝問題なし ではありません）。{republish.error}
                </>
              )}
            </p>
            <p className="muted">
              {filtered ? (
                <>
                  <strong>{items.length}</strong> 本を表示中（全 {all.length} 本）
                </>
              ) : (
                <>全 {all.length} 本を表示中。右の絞り込みで資格・価格・状態を選べる。</>
              )}
            </p>

            {items.length === 0 ? (
              <p className="empty">この条件に該当する記事はありません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data content-table">
                  <thead>
                    <tr>
                      <th className="title-col">タイトル</th>
                      <th className="category-col optional-col">資格</th>
                      <th className="price-col">価格</th>
                      <th className="publish-col">公開</th>
                      <th className="publish-col">要再公開</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => {
                      const repoRel = noteRepoRelPath(i.rel);
                      const drift = republish.drift.has(repoRel);
                      const unknown = republish.unknown.has(repoRel);
                      return (
                        <tr key={i.rel}>
                          <td className="title-cell" title={i.rel}>
                            {i.title}
                            {i.series ? (
                              <>
                                <br />
                                <span className="muted">{i.series}</span>
                              </>
                            ) : null}
                          </td>
                          <td className="category-col optional-col">
                            <span className="muted">{i.exam}</span>
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
                            {i.published && i.noteUrl ? (
                              <a href={i.noteUrl} target="_blank" rel="noopener noreferrer">
                                公開
                              </a>
                            ) : (
                              <span className="badge warn">未</span>
                            )}
                          </td>
                          <td className="publish-col">
                            {!republish.ok ? (
                              <span className="badge neutral">?</span>
                            ) : drift ? (
                              <span className="badge warn">要</span>
                            ) : unknown ? (
                              <span className="badge neutral">未初期化</span>
                            ) : i.published ? (
                              <span className="badge good">同期</span>
                            ) : (
                              <span className="muted">—</span>
                            )}
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
            title="資格"
            param="e"
            now={now}
            active={exam}
            total={all.filter((i) => (!pricing || i.pricing === pricing) && matchState(i)).length}
            items={examKeys.map((key) => ({ key, label: key, count: examCounts.get(key) ?? 0 }))}
          />
          <Facet
            title="価格"
            param="p"
            now={now}
            active={pricing}
            total={all.filter((i) => (!exam || i.exam === exam) && matchState(i)).length}
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
          {!republish.ok ? (
            <p className="muted">
              <span className="badge bad">要再公開は判定不可</span> この絞り込みは 0 件になります。
            </p>
          ) : null}
        </aside>
      </div>
    </>
  );
}

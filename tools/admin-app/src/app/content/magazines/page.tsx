import { PageHead } from '@/components/ui';
import { magazines } from '@/lib/content';
import { membershipState } from '@/lib/note-status';

export const dynamic = 'force-dynamic';

/**
 * note マガジン一覧（商品が主語）。SoT = src/lib/note-magazines.ts。
 *
 * 記事一覧（/content/note）のマガジン facet では代替できない。facet は「ラベルの付いた記事」から
 * しか作れないので、**記事ラベルから辿れない 16 件**（essay-complete-pack / civil-membership-lab /
 * 各 takuitsu-pdf ほか＝束ね商品・単体商品・PDF 商品）が構造的に現れない。価格・バッジ・noteUrl・
 * マガジン自体の公開状態も記事の属性ではないため facet には出せない。
 *
 * 「repo 記事」列は check-magazine-membership --json の軸 A をそのまま出す（数え直さない
 * ＝第 4 のドリフト源を作らない）。0 本や参照なしがその場で見えるのがこの列の目的。
 * 取得に失敗したら 0 ではなく「?」を出す（CLAUDE.md §9「検査ゼロを PASS と呼ばない」）。
 */
export default function ContentMagazinesPage() {
  const mags = magazines();
  const pub = mags.filter((m) => m.published).length;
  const membership = membershipState();
  const repoCount = new Map(membership.rows.map((r) => [r.id, r.repoCount]));
  const unreferenced = new Set(membership.unreferenced);
  return (
    <>
      <PageHead
        title="note マガジン"
        sub={`${mags.length} 件（公開 ${pub} / 未公開 ${mags.length - pub}）· SoT: src/lib/note-magazines.ts`}
      />
      <div className="card">
        {membership.ok ? (
          <p className="muted">
            「repo 記事」= 記事 frontmatter <code>noteMagazine</code> の実数（check-magazine-membership 軸 A）。
            <strong>{unreferenced.size}</strong> 件はラベルから辿れない（束ね商品・単体商品・PDF）ため、
            記事一覧のマガジン絞り込みには現れない。
          </p>
        ) : (
          <p className="muted">
            <span className="badge bad">repo 記事は判定不可</span>{' '}
            check-magazine-membership が実行できないため「?」を出しています（空欄＝0本 ではありません）。
            {membership.error}
          </p>
        )}
        <div className="table-wrap">
          <table className="data content-table">
            <thead>
              <tr>
                <th className="title-col">タイトル</th>
                <th className="optional-col id-col">id</th>
                <th className="price-col">価格</th>
                <th className="publish-col">repo 記事</th>
                <th className="publish-col">公開</th>
                <th className="badge-col">バッジ</th>
              </tr>
            </thead>
            <tbody>
              {mags.map((m) => (
                <tr key={m.id}>
                  <td className="title-cell" title={m.title ?? m.id}>{m.title ?? m.id}</td>
                  <td className="mono small optional-col path-cell" title={m.id}>{m.id}</td>
                  <td className="price-col">{m.priceStr ?? ''}</td>
                  <td className="publish-col">
                    {!membership.ok ? (
                      <span className="badge neutral" title={membership.error ?? ''}>?</span>
                    ) : unreferenced.has(m.id) ? (
                      <span className="badge neutral" title="この id を指す noteMagazine ラベルが無い">
                        ラベル無
                      </span>
                    ) : (repoCount.get(m.id) ?? 0) === 0 ? (
                      <span className="badge warn">0</span>
                    ) : (
                      repoCount.get(m.id)
                    )}
                  </td>
                  <td className="publish-col">
                    {m.published && m.noteUrl ? (
                      <a href={m.noteUrl} target="_blank" rel="noopener noreferrer">
                        公開
                      </a>
                    ) : (
                      <span className="badge warn">未公開</span>
                    )}
                  </td>
                  <td className="muted small badge-col">{m.badge ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

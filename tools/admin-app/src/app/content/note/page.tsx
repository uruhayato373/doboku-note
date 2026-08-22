import { PageHead } from '@/components/ui';
import { noteArticles, noteRepoRelPath, noteRepublishState } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default function ContentNotePage() {
  const items = noteArticles();
  const pub = items.filter((i) => i.published).length;
  const republish = noteRepublishState();

  return (
    <>
      <PageHead
        title="note 記事"
        sub={`${items.length} 本（noteUrl あり = 公開済み ${pub}）· content/note/**`}
      />
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
        <div className="table-wrap">
          <table className="data content-table">
            <thead>
              <tr>
                <th className="title-col">タイトル</th>
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
                    <td className="title-cell" title={i.title}>{i.title}</td>
                    <td className="price-col">
                      <span
                        className={
                          'badge ' + (i.pricing === 'paid' ? 'accent' : i.pricing === 'free' ? 'good' : 'neutral')
                        }
                      >
                        {i.pricing === 'paid' ? '有料' : i.pricing === 'free' ? '無料' : '?'}
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
      </div>
    </>
  );
}

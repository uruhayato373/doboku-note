import { PageHead } from '@/components/ui';
import { ContentNav } from '@/components/ContentNav';
import { noteArticles } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default function ContentNotePage() {
  const items = noteArticles();
  const pub = items.filter((i) => i.published).length;
  return (
    <>
      <PageHead
        title="note 記事"
        sub={`${items.length} 本（noteUrl あり = 公開済み ${pub}）· docs/note/**`}
      />
      <ContentNav active="/content/note" />

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>タイトル</th>
                <th>ディレクトリ</th>
                <th>価格</th>
                <th>公開</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.rel}>
                  <td className="wrap">{i.title}</td>
                  <td className="mono small">{i.dir}</td>
                  <td>
                    <span
                      className={
                        'badge ' + (i.pricing === 'paid' ? 'accent' : i.pricing === 'free' ? 'good' : 'neutral')
                      }
                    >
                      {i.pricing === 'paid' ? '有料' : i.pricing === 'free' ? '無料' : '?'}
                    </span>
                  </td>
                  <td>
                    {i.published && i.noteUrl ? (
                      <a href={i.noteUrl} target="_blank" rel="noopener noreferrer">
                        公開
                      </a>
                    ) : (
                      <span className="badge warn">未</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

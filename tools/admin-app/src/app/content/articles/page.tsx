import { PageHead } from '@/components/ui';
import { ContentNav } from '@/components/ContentNav';
import { articlesIndex } from '@/lib/content';
import { GROUP_LABEL } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

export default function ContentArticlesPage() {
  const { summary, docs } = articlesIndex();
  return (
    <>
      <PageHead
        title="サイト記事"
        sub={`全 ${summary.total ?? docs.length} 記事（公開 ${summary.published ?? '—'} / 非公開 ${summary.unpublished ?? '—'}）· src/config/doc-meta-index.json`}
      />
      <ContentNav active="/content/articles" />

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>分類</th>
                <th>タイトル</th>
                <th>slug</th>
                <th>状態</th>
                <th>公開日</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.slug}>
                  <td>
                    <span className="badge neutral">{GROUP_LABEL[d.group] ?? d.group}</span>
                  </td>
                  <td className="wrap">{d.title}</td>
                  <td className="mono small">{d.slug}</td>
                  <td>
                    <span className={'badge ' + (d.published ? 'good' : 'warn')}>
                      {d.published ? '公開' : '非公開'}
                    </span>
                  </td>
                  <td className="muted small">{d.publishedAt ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

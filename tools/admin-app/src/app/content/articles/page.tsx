import { PageHead } from '@/components/ui';
import { articlesIndex } from '@/lib/content';
import { GROUP_LABEL } from '@/lib/gallery';
import { qualityCensus, qualitySummary } from '@/lib/quality';

export const dynamic = 'force-dynamic';

export default function ContentArticlesPage() {
  const { summary, docs } = articlesIndex();
  const quality = qualitySummary();
  const census = qualityCensus();
  const lintBySlug = new Map(quality.articles.map((article) => [article.slug, article]));
  const censusBySlug = new Map((census.articles ?? []).map((article) => [article.slug, article]));
  return (
    <>
      <PageHead
        title="サイト記事"
        sub={`全 ${summary.total ?? docs.length} 記事（公開 ${summary.published ?? '—'} / 非公開 ${summary.unpublished ?? '—'}）· 品質 = 採点 census + lint baseline`}
      />
      <div className="card">
        <div className="table-wrap">
          <table className="data content-table">
            <thead>
              <tr>
                <th className="category-col">分類</th>
                <th className="title-col">タイトル</th>
                <th className="optional-col id-col">slug</th>
                <th className="quality-col">品質</th>
                <th className="status-col">状態</th>
                <th className="date-col">公開日</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const lint = lintBySlug.get(d.slug);
                const score = censusBySlug.get(d.slug);
                const highCount = lint
                  ? Object.entries(lint.counts).reduce(
                      (sum, [rule, count]) => sum + (quality.ruleSeverity[rule] === 'HIGH' ? count : 0),
                      0,
                    )
                  : 0;
                const detail = [
                  score
                    ? score.scored
                      ? `採点 ${score.weighted ?? '済'}${score.thin ? '・薄層' : ''}${score.failed ? '・不合格' : ''}`
                      : `未採点${score.thin ? '・薄層' : ''}`
                    : d.published
                      ? '採点データなし'
                      : '非公開・採点対象外',
                  lint
                    ? `違反 ${lint.total}（${Object.entries(lint.counts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([rule, count]) => `${rule}:${count}`)
                        .join(' / ')}）`
                    : 'lint違反なし',
                ].join(' · ');

                return (
                  <tr key={d.slug}>
                    <td className="category-col">
                      <span className="badge neutral">{GROUP_LABEL[d.group] ?? d.group}</span>
                    </td>
                    <td className="title-cell" title={d.title}>{d.title}</td>
                    <td className="mono small optional-col path-cell" title={d.slug}>{d.slug}</td>
                    <td className="quality-col" title={detail}>
                      <span className="quality-badges">
                        {!d.published ? (
                          <span className="badge neutral">対象外</span>
                        ) : !score ? (
                          <span className="badge neutral">未収集</span>
                        ) : score.failed ? (
                          <span className="badge bad">不合格</span>
                        ) : score.scored ? (
                          <span className={'badge ' + (score.thin ? 'warn' : 'good')}>
                            {score.weighted ?? '採点済'}
                          </span>
                        ) : (
                          <span className="badge warn">未採点</span>
                        )}
                        {score?.thin ? <span className="badge warn">薄層</span> : null}
                        {lint ? (
                          <span className={'badge ' + (highCount > 0 ? 'bad' : 'warn')}>違反{lint.total}</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="status-col">
                      <span className={'badge ' + (d.published ? 'good' : 'warn')}>
                        {d.published ? '公開' : '非公開'}
                      </span>
                    </td>
                    <td className="muted small date-col">{d.publishedAt ?? ''}</td>
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

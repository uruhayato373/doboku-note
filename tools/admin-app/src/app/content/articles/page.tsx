import {
  StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow,
} from '@/components/admin';
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
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>分類</TableHead>
            <TableHead>タイトル</TableHead>
            <TableHead className="hidden xl:table-cell">slug</TableHead>
            <TableHead>品質</TableHead>
            <TableHead>状態</TableHead>
            <TableHead>公開日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
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
                  <TableRow key={d.slug}>
                    <TableCell>
                      <StatusBadge tone="neutral">{GROUP_LABEL[d.group] ?? d.group}</StatusBadge>
                    </TableCell>
                    <TableCell className="max-w-[28rem] truncate" title={d.title}>{d.title}</TableCell>
                    <TableCell className="hidden max-w-[16rem] truncate font-mono text-xs xl:table-cell" title={d.slug}>{d.slug}</TableCell>
                    <TableCell title={detail}>
                      <span className="flex flex-wrap gap-1">
                        {!d.published ? (
                          <StatusBadge tone="neutral">対象外</StatusBadge>
                        ) : !score ? (
                          <StatusBadge tone="neutral">未収集</StatusBadge>
                        ) : score.failed ? (
                          <StatusBadge tone="bad">不合格</StatusBadge>
                        ) : score.scored ? (
                          <StatusBadge tone={score.thin ? 'warn' : 'good'}>
                            {score.weighted ?? '採点済'}
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="warn">未採点</StatusBadge>
                        )}
                        {score?.thin ? <StatusBadge tone="warn">薄層</StatusBadge> : null}
                        {lint ? (
                          <StatusBadge tone={highCount > 0 ? 'bad' : 'warn'}>違反{lint.total}</StatusBadge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={d.published ? 'good' : 'warn'}>
                        {d.published ? '公開' : '非公開'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.publishedAt ?? ''}</TableCell>
                  </TableRow>
                );
              })}
        </TableBody>
      </TableFrame>
    </>
  );
}

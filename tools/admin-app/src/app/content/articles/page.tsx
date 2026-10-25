import { DataTable, type DataTableColumn, type DataTableRow, StatusBadge } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { articlesIndex } from '@/lib/content';
import { GROUP_LABEL } from '@/lib/gallery';
import { qualityCensus, qualitySummary } from '@/lib/quality';

export const dynamic = 'force-dynamic';

const COLUMNS: DataTableColumn[] = [
  { key: 'group', label: '分類' },
  { key: 'title', label: 'タイトル' },
  { key: 'slug', label: 'slug' },
  { key: 'quality', label: '品質' },
  { key: 'state', label: '状態' },
  { key: 'publishedAt', label: '公開日' },
];

export default function ContentArticlesPage() {
  const { summary, docs } = articlesIndex();
  const quality = qualitySummary();
  const census = qualityCensus();
  const lintBySlug = new Map(quality.articles.map((article) => [article.slug, article]));
  const censusBySlug = new Map((census.articles ?? []).map((article) => [article.slug, article]));

  const rows: DataTableRow[] = docs.map((d) => {
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
    const group = GROUP_LABEL[d.group] ?? d.group;

    return {
      id: d.slug,
      values: { group, title: d.title, slug: d.slug, quality: detail, state: d.published ? '公開' : '非公開', publishedAt: d.publishedAt ?? null },
      cells: {
        group: <StatusBadge tone="neutral">{group}</StatusBadge>,
        title: <span className="block max-w-[28rem] truncate" title={d.title}>{d.title}</span>,
        slug: <span className="block max-w-[16rem] truncate font-mono text-xs" title={d.slug}>{d.slug}</span>,
        quality: (
          <span className="flex flex-wrap gap-1" title={detail}>
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
        ),
        state: (
          <StatusBadge tone={d.published ? 'good' : 'warn'}>
            {d.published ? '公開' : '非公開'}
          </StatusBadge>
        ),
        publishedAt: <span className="text-xs text-muted-foreground">{d.publishedAt ?? ''}</span>,
      },
    };
  });

  return (
    <>
      <PageHead
        title="サイト記事"
        sub={`全 ${summary.total ?? docs.length} 記事（公開 ${summary.published ?? '—'} / 非公開 ${summary.unpublished ?? '—'}）· 品質 = 採点 census + lint baseline`}
      />
      <DataTable columns={COLUMNS} rows={rows} filter="タイトル・slug などで絞り込む" />
    </>
  );
}

import type { Metadata } from 'next';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionBlock from '@/components/layout/SectionBlock';
import { buildPageMetadata } from '@/lib/metadata';
import { getAllDocsMeta } from '@/lib/docs';
import { getPublicDocPath } from '@/lib/content-routes';
import { getCategoryBySlug } from '@/lib/categories';
import { getDocTopics, getTopicsByFacet } from '@/lib/topics';
import { LawDirectory } from '@/components/topics/TopicLaws';
import { getLawDirectory } from '@/lib/law-wiring';
import AffiliateSlot from '@/components/ui/AffiliateSlot/AffiliateSlot';
import LinkTile from '@/components/ui/LinkTile/LinkTile';
import { ButtonLink } from '@/components/ui/Button/Button';
import Arrow from '@/components/ui/Arrow/Arrow';
import { topicPath } from '@/lib/route-paths';

const category = getCategoryBySlug('laws')!;

export const metadata: Metadata = buildPageMetadata({
  title: '土木の法令の解説｜建設業法・労働安全衛生法・道路法・河川法を試験と実務で読む',
  description: category.description ?? category.subtitle,
  path: '/laws',
});

/**
 * 法令の一覧（/laws・DN-0731）。解説のある法令ページを分野・立場のテーマごとに並べ、その下に
 * 3 本以上の記事が引く法令と関わるテーマの対応（関係法令のテーマのページと同じ一覧）を置く。
 */
export default function LawsPage() {
  const pages = getAllDocsMeta().filter((d) => d.published !== false && d.category === 'laws');
  const groups = getTopicsByFacet()
    .flatMap(({ topics }) => topics)
    .map((topic) => ({ topic, pages: pages.filter((d) => getDocTopics(d).some((t) => t.slug === topic.slug)) }))
    .filter((g) => g.pages.length > 0 && g.topic.facet !== 'law');
  const directory = getLawDirectory();
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        breadcrumb={[{ label: 'ホーム', href: '/' }, { label: '法令' }]}
        label="LAWS"
        title="土木の法令の解説"
        lead={category.description ?? category.subtitle}
        meta={`解説 ${pages.length}件 / 記事が引く法令 ${directory.length}件`}
      />
      {groups.map(({ topic, pages: list }, i) => (
        <SectionBlock key={topic.slug} divider={i === 0 ? 'none' : 'top'} ariaLabel={`${topic.label}の法令`}>
          <h2 className="mb-2 font-serif text-2xl font-bold text-(--ink)">{topic.label}の法令</h2>
          <p className="mb-4 text-sm">
            <ButtonLink href={topicPath(topic.slug)} variant="text">{topic.label}のテーマ（記事・計画・審議会）を見る<Arrow /></ButtonLink>
          </p>
          <ul className="grid gap-4 md:grid-cols-2" data-cta="nav" data-cta-label="laws-index">
            {list.map((d) => (
              <li key={d.slug}>
                <LinkTile
                  href={getPublicDocPath(d.slug)}
                  size="lg"
                  serif
                  title={d.shortTitle || d.title}
                  description={d.subtitle || d.description}
                />
              </li>
            ))}
          </ul>
        </SectionBlock>
      ))}
      <SectionBlock divider={groups.length ? 'top' : 'none'} ariaLabel="法令と分野の対応">
        <LawDirectory rows={directory} />
      </SectionBlock>
      {/* 転職の案内（ページ末に 1 枠。案件は配置ルール）。ほかの区画と同じ左端にそろえる（2026-10-31 まで中央に細く出ていた） */}
      <SectionBlock divider="top" ariaLabel="転職の相談先">
        <AffiliateSlot page={{ pageKind: 'laws-list' }} slot="laws-list-end" />
      </SectionBlock>
    </PageShell>
  );
}

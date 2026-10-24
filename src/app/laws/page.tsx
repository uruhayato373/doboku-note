import type { Metadata } from 'next';
import Link from 'next/link';
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
            <Link href={`/topics/${topic.slug}`} className="text-(--accent) hover:underline">{topic.label}のテーマ（記事・計画・審議会）を見る →</Link>
          </p>
          <ul className="grid gap-4 md:grid-cols-2" data-cta="nav" data-cta-label="laws-index">
            {list.map((d) => (
              <li key={d.slug}>
                <Link
                  href={getPublicDocPath(d.slug)}
                  className="focus-ring card-interactive block h-full border border-(--rule-soft) bg-(--paper) p-5 transition-[border-color,box-shadow] hover:border-(--accent) dark:border-(--rule-soft)"
                >
                  <span className="block font-serif text-lg font-bold text-(--ink)">{d.shortTitle || d.title}</span>
                  <span className="mt-2 block text-[13px] leading-[1.75] text-(--ink-muted)">{d.subtitle || d.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </SectionBlock>
      ))}
      <SectionBlock divider={groups.length ? 'top' : 'none'} ariaLabel="法令と分野の対応">
        <LawDirectory rows={directory} />
      </SectionBlock>
      {/* 転職の案内（ページ末に 1 枠。案件は配置ルール） */}
      <AffiliateSlot page={{ pageKind: 'laws-list' }} slot="laws-list-end" className="max-w-[760px] mx-auto px-4 sm:px-6 pb-10" />
    </PageShell>
  );
}

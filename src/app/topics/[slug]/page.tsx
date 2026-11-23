import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import TwoColumnShell from '@/components/layout/TwoColumnShell';
import TopicRail from '@/components/topics/TopicRail';
import type { ReactNode } from 'react';
import type { TocHeading } from '@/lib/toc';
import TopicArticles, { type TopicArea } from '@/components/topics/TopicArticles';
import { getPublicDocPath } from '@/lib/content-routes';
import { getCategoryBySlug, getCategoryLabel } from '@/lib/categories';
import { getAreaLabel, getCategoryArea } from '@/lib/content-taxonomy';
import { getCardImage } from '@/lib/site-thumbnail';
import StandardDocumentCard from '@/components/standards/StandardDocumentCard';
import { buildPageMetadata } from '@/lib/metadata';
import Link from 'next/link';
import TopicIcon from '@/components/topics/TopicIcon';
import LinkTile from '@/components/ui/LinkTile/LinkTile';
import { getAllTopics, getRelatedTopics, getTopicBySlug, getTopicDocs, getTopicRoadmap, getTopicStandards, isTopicIndexable } from '@/lib/topics';
import AffiliateSlot from '@/components/ui/AffiliateSlot/AffiliateSlot';
import MagazineCard from '@/components/ui/MagazineCard/MagazineCard';
import { getMagazine, type MagazineId } from '@/lib/note-magazines';
import { TopicLaws, LawDirectory } from '@/components/topics/TopicLaws';
import { getLawDirectory, getTopicLaws, getTopicPolicies } from '@/lib/law-wiring';
import PolicyList from '@/components/laws/PolicyList';
import { peSectionLabel } from '@/lib/pe-keyword-nav';
import { topicPath } from '@/lib/route-paths';
import { docKindLabel } from '@/lib/doc-kind';

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getAllTopics().map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const topic = getTopicBySlug((await params).slug);
  return topic
    ? buildPageMetadata({
        title: topic.seoTitle ?? `${topic.label}｜試験・実務・基準を横断`,
        description: topic.description,
        path: topicPath(topic.slug),
        // 育成中のテーマは昇格基準（content-taxonomy.md §6）を満たすまで検索に出さない。サイトマップも out/ の robots を見て外す
        noindex: !isTopicIndexable(topic),
      })
    : { title: 'テーマが見つかりません', robots: { index: false, follow: false } };
}

/**
 * 本文の 1 区画（左の列）。id は右の欄の追従ブロックの目次（区画の見出し）が飛ぶ先。
 * 2026-11-23 に 1 列の全幅の帯（SectionBlock）から、ほかのページ種別と同じ 2 列＋右の欄へそろえた。
 */
function TopicSection({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <section id={id} aria-label={label} className="scroll-mt-24 border-t border-(--rule-soft) py-10 first:border-t-0 first:pt-0 dark:border-(--rule-soft)">
      {children}
    </section>
  );
}

export default async function TopicPage({ params }: { params: Promise<Params> }) {
  const topic = getTopicBySlug((await params).slug);
  if (!topic) notFound();
  const docs = getTopicDocs(topic);
  const roadmap = getTopicRoadmap(topic);
  const standards = getTopicStandards(topic);
  const relatedTopics = getRelatedTopics(topic);
  // 法令と分野・立場は多対多。このテーマの記事が引く法令と、法令・制度の軸のテーマでは法令と分野の対応の一覧
  const topicLaws = getTopicLaws(topic);
  const lawDirectory = topic.facet === 'law' ? getLawDirectory({ excludeTopic: topic.slug }) : [];
  // 制度の地図: このテーマに関わる国の計画・施策・審議会（config/policy-registry.json・根拠法は法令ページへ）
  const policies = getTopicPolicies(topic.slug);
  // このテーマの有料教材（分野・立場に合う note の商品。topics.json の products の順・非公開は出さない）
  const products = (topic.products ?? []).filter((id): id is MagazineId => getMagazine(id as MagazineId) !== null);
  const areaLabels: Record<TopicArea, string> = { exam: getAreaLabel('exam'), practice: getAreaLabel('practice'), standards: getAreaLabel('standards'), laws: getAreaLabel('laws') };
  const areaCount = (area: TopicArea) => docs.filter(doc => getCategoryArea(String(doc.category)) === area).length;
  const areaNav = (['laws', 'exam', 'practice', 'standards'] as TopicArea[])
    .map(area => ({ area, count: area === 'standards' ? areaCount(area) + standards.length : areaCount(area) }))
    .filter(({ count }) => count > 0);

  // 右の欄の追従ブロックの目次（出す区画だけ・本文の並び順）
  const sections: TocHeading[] = [
    topic.intro?.length ? { id: 'topic-intro', text: topic.introHeading ?? `${topic.label}で押さえること`, level: 2 } : null,
    roadmap.length ? { id: 'topic-roadmap', text: '学ぶ順番の地図', level: 2 } : null,
    topic.examDiffs?.length ? { id: 'topic-exam-diffs', text: '資格ごとの出題の違い', level: 2 } : null,
    { id: 'topic-articles', text: '試験対策・実務ノート', level: 2 },
    topicLaws.length ? { id: 'topic-laws', text: 'このテーマの記事が引く法令', level: 2 } : null,
    policies.length ? { id: 'topic-policies', text: '国の計画・施策・審議会', level: 2 } : null,
    lawDirectory.length ? { id: 'topic-law-directory', text: '法令と分野の対応', level: 2 } : null,
    standards.length ? { id: 'topic-standards', text: '関連する公的基準・マニュアル', level: 2 } : null,
    products.length ? { id: 'topic-products', text: 'このテーマの有料教材（note）', level: 2 } : null,
    relatedTopics.length ? { id: 'topic-related', text: '関連するテーマ', level: 2 } : null,
  ].filter((h): h is TocHeading => h !== null);

  return (
    <PageShell variant="default">
      <TwoColumnShell
        as="div"
        stretchAside
        aside={<TopicRail docs={docs} featured={topic.featured ?? []} sections={sections} />}
      >
      <PageHeader
        variant="inline"
        titleSize="lg"
        breadcrumb={[{ label: 'ホーム', href: '/' }, { label: 'テーマ', href: '/topics' }, { label: topic.label }]}
        label="TOPIC HUB"
        title={topic.label}
        lead={topic.description}
        meta={`記事 ${docs.length}件 / 基準資料 ${standards.length}件`}
        className="mb-6"
      />
      {topic.intro && topic.intro.length > 0 && (
        <TopicSection id="topic-intro" label="このテーマの要点">
          <h2 className="mb-4 font-serif text-2xl font-bold text-(--ink)">{topic.introHeading ?? `${topic.label}で押さえること`}</h2>
          <div className="max-w-[780px] space-y-4 text-[15px] leading-[1.9] text-(--ink-body)">
            {topic.intro.map((paragraph) => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)}
          </div>
        </TopicSection>
      )}
      {roadmap.length > 0 && (
        <TopicSection id="topic-roadmap" label="学ぶ順番の地図">
          <h2 className="mb-2 font-serif text-2xl font-bold text-(--ink)">学ぶ順番の地図</h2>
          <p className="mb-6 text-sm text-(--ink-muted)">上から順に進むと、前の段の知識が次の段で使えます。</p>
          <ol className="max-w-[780px] space-y-0" data-cta="nav" data-cta-label="topic-roadmap">
            {roadmap.map((step, i) => (
              <li key={step.label} className="relative flex gap-4 pb-6 last:pb-0">
                {i < roadmap.length - 1 && <span aria-hidden="true" className="absolute left-[15px] top-9 bottom-0 w-px bg-(--rule-soft)" />}
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--accent) text-sm font-bold text-white">{i + 1}</span>
                <div className="min-w-0">
                  <h3 className="font-serif text-lg font-bold text-(--ink)">{step.label}</h3>
                  <p className="mt-1 text-[15px] leading-[1.8] text-(--ink-body)">{step.summary}</p>
                  {step.docs.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {step.docs.map((doc) => (
                        <li key={doc.slug} className="text-[14px]"><Link href={getPublicDocPath(doc.slug)} className="focus-ring text-(--accent) hover:underline">{doc.title}</Link></li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </TopicSection>
      )}
      {topic.examDiffs && topic.examDiffs.length > 0 && (
        <TopicSection id="topic-exam-diffs" label="資格ごとの出題の違い">
          <h2 className="mb-2 font-serif text-2xl font-bold text-(--ink)">資格ごとの出題の違い</h2>
          <p className="mb-6 text-sm text-(--ink-muted)">同じ分野でも、資格によって問われ方が変わります。</p>
          <dl className="max-w-[780px] space-y-5">
            {topic.examDiffs.map((diff) => (
              <div key={diff.exam} className="border-l-2 border-(--rule-soft) pl-4 dark:border-(--rule-soft)">
                <dt className="font-serif text-base font-bold text-(--ink)">{diff.exam}</dt>
                <dd className="mt-1 text-[15px] leading-[1.8] text-(--ink-body)">{diff.text}</dd>
              </div>
            ))}
          </dl>
        </TopicSection>
      )}
      <TopicSection id="topic-articles" label="関連記事">
        {areaNav.length > 1 && (
          <nav aria-label="領域へ移動" className="mb-6 flex flex-wrap gap-x-5 gap-y-1">
            {areaNav.map(({ area, count }) => (
              <a key={area} className="focus-ring inline-block py-3 text-(--accent) underline" href={area === 'standards' && standards.length > 0 ? '#topic-standards' : `#area-${area}`}>{areaLabels[area]}（{count}件） →</a>
            ))}
          </nav>
        )}
        <h2 className="mb-6 font-serif text-2xl font-bold text-(--ink)">試験対策・実務ノート</h2>
        <div data-cta="nav" data-cta-label="topic-page">
        <TopicArticles articles={docs.map(doc => ({
          href: getPublicDocPath(doc.slug), title: doc.shortTitle || doc.title,
          description: doc.subtitle || doc.description || '', category: String(doc.category),
          categoryLabel: getCategoryLabel(String(doc.category)), image: getCardImage(doc),
          categoryOrder: getCategoryBySlug(String(doc.category))?.order ?? 999, area: getCategoryArea(String(doc.category)),
          subgroup: doc.category === 'pe-comprehensive-management' ? peSectionLabel(doc.section) : undefined,
          kind: docKindLabel(doc),
        }))} areaLabels={areaLabels} featured={(topic.featured ?? []).map(getPublicDocPath)} />
        </div>
      </TopicSection>
      {topicLaws.length > 0 && (
        <TopicSection id="topic-laws" label="このテーマの記事が引く法令">
          <TopicLaws laws={topicLaws} topicLabel={topic.label} />
        </TopicSection>
      )}
      {policies.length > 0 && (
        <TopicSection id="topic-policies" label="このテーマの国の計画・施策・審議会">
          <h2 className="mb-2 font-serif text-2xl font-bold text-(--ink)">{topic.label}の国の計画・施策・審議会</h2>
          <p className="mb-6 text-sm text-(--ink-muted)">このテーマの方向を決めている国の計画と施策、審議会の答申です。根拠になる法令とあわせて読めます。</p>
          <div className="max-w-[780px]"><PolicyList policies={policies} /></div>
        </TopicSection>
      )}
      {lawDirectory.length > 0 && (
        <TopicSection id="topic-law-directory" label="法令と分野の対応">
          <LawDirectory rows={lawDirectory} />
        </TopicSection>
      )}
      {standards.length > 0 && (
        <TopicSection id="topic-standards" label="関連する基準資料">
          <h2 className="mb-6 font-serif text-2xl font-bold text-(--ink)">関連する公的基準・マニュアル</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {standards.map((document) => <StandardDocumentCard key={`${document.agencyId}-${document.documentId}`} document={document} />)}
          </div>
        </TopicSection>
      )}
      {products.length > 0 && (
        <TopicSection id="topic-products" label="このテーマの有料教材">
          <h2 className="mb-2 font-serif text-2xl font-bold text-(--ink)">このテーマの有料教材（note）</h2>
          <p className="mb-2 text-sm text-(--ink-muted)">同じテーマを、資格ごとの模範解答・答案集で深めたいときに。</p>
          <div className="max-w-[760px]">
            {products.map((id) => <MagazineCard key={id} id={id} variant="inline" utmContent={`topic-${topic.slug}`} placement="topic-page" />)}
          </div>
        </TopicSection>
      )}
      {relatedTopics.length > 0 && (
        <TopicSection id="topic-related" label="関連するテーマ">
          <h2 className="mb-2 font-serif text-2xl font-bold text-(--ink)">関連するテーマ</h2>
          <p className="mb-6 text-sm text-(--ink-muted)">このテーマの記事が一緒に扱っているテーマです。</p>
          <ul className="grid gap-4 sm:grid-cols-2" data-cta="nav" data-cta-label="topic-related">
            {relatedTopics.map(({ topic: related, shared }) => (
              <li key={related.slug}>
                <LinkTile
                  href={topicPath(related.slug)}
                  serif
                  icon={<TopicIcon slug={related.slug} className="" />}
                  title={related.label}
                  meta={`共通の記事 ${shared}件`}
                />
              </li>
            ))}
          </ul>
        </TopicSection>
      )}
      {/* 転職の案内（ページ末に 1 枠。案件は配置ルール）。ほかの区画と同じ左端にそろえる（2026-10-31 まで中央に細く出ていた） */}
      <TopicSection id="topic-career" label="転職の相談先">
        <AffiliateSlot page={{ pageKind: 'topic' }} slot="topic-end" alignStart />
      </TopicSection>
      </TwoColumnShell>
    </PageShell>
  );
}

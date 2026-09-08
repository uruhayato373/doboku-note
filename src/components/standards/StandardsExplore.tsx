import Link from 'next/link';
import SectionCard from '@/components/ui/SectionCard/SectionCard';
import { ClipboardList, Mountain, FlaskConical } from 'lucide-react';
import { getDocsMetaByCategory } from '@/lib/docs';
import { getPublicDocPath } from '@/lib/content-routes';
import { resolveNavTitle } from '@/lib/doc-title';
import { getAllTopics } from '@/lib/topics';

// 基準書の規定を実務へつなぐ入口。表示名・公開状態は既存の索引から解決する。
const topicSlugs = ['quality-management', 'construction-management', 'concrete', 'earthwork-foundations', 'safety-laws', 'roads'];
const practiceEntries = [
  { slug: 'construction-plan-document', Icon: ClipboardList },
  { slug: 'embankment-quality-control', Icon: Mountain },
  { slug: 'concrete-mix-acceptance', Icon: FlaskConical },
];

export default function StandardsExplore() {
  const topics = getAllTopics();
  const practiceDocs = getDocsMetaByCategory('civil-practice').filter(doc => doc.published !== false && !doc.hideFromCategory);
  const selectedDocs = practiceEntries.flatMap(({ slug, Icon }) => {
    const doc = practiceDocs.find(item => item.slug === `civil-practice-${slug}`);
    return doc ? [{ doc, Icon }] : [];
  });

  return (
    <div className="space-y-4" data-standards-explore>
      <SectionCard padding="compact">
        <h2 className="text-lg font-bold text-[var(--ink)]">テーマから理解を深める</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-body)]">基準・実務・試験解説をまとめて読む</p>
        <nav aria-label="基準と関連する技術テーマ" className="mt-3 divide-y divide-[var(--rule-soft)]">
          {topicSlugs.flatMap(slug => {
            const topic = topics.find(item => item.slug === slug);
            return topic ? [
              <Link key={slug} href={`/topics/${slug}`} data-cta="nav" data-cta-label="standards-topic"
                className="focus-ring flex min-h-11 items-center justify-between gap-2 px-2 py-2 text-sm font-bold text-[var(--accent)] transition-colors hover:bg-[var(--accent-fill)]">
                {topic.label}<span aria-hidden="true">›</span>
              </Link>,
            ] : [];
          })}
        </nav>
        <Link href="/topics" className="focus-ring mt-2 flex min-h-11 items-center justify-end text-sm text-[var(--accent)] underline underline-offset-4">すべてのテーマへ →</Link>
      </SectionCard>

      <SectionCard padding="compact">
        <h2 className="text-lg font-bold text-[var(--ink)]">基準を現場で使う</h2>
        {selectedDocs.length > 0 && (
          <ul className="mt-2 divide-y divide-[var(--rule-soft)]">
            {selectedDocs.map(({ doc, Icon }) => (
              <li key={doc.slug}>
                <Link href={getPublicDocPath(doc.slug)} data-cta="nav" data-cta-label="standards-practice"
                  className="focus-ring group flex min-h-12 items-center gap-3 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent-fill)] text-[var(--accent)]">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="text-sm font-bold leading-relaxed text-[var(--ink)] group-hover:text-[var(--accent)]">{resolveNavTitle(doc).main}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/practice" className="focus-ring mt-2 flex min-h-11 items-center justify-between border-t border-[var(--rule-soft)] pt-3 text-sm font-bold text-[var(--accent)]">土木施工の実務ノートへ<span aria-hidden="true">→</span></Link>
      </SectionCard>

      <SectionCard padding="compact">
        <h2 className="text-lg font-bold text-[var(--ink)]">比較・データ利用</h2>
        <nav aria-label="基準類の活用" className="mt-2 divide-y divide-[var(--rule-soft)]">
          {([
            ['/standards/compare', '地方整備局別の違い', '近畿版を基準に比較'],
            ['/standards/data', '基準本文のデータ', 'JSON-LD・Markdown'],
          ] as const).map(([href, title, sub]) => (
            <Link key={href} href={href} className="focus-ring flex min-h-12 items-center justify-between gap-2 py-3 text-[var(--accent)]">
              <span><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-sm text-[var(--ink-body)]">{sub}</span></span><span aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
      </SectionCard>
    </div>
  );
}

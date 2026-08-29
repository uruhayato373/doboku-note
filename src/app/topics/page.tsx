import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionBlock from '@/components/layout/SectionBlock';
import { buildPageMetadata } from '@/lib/metadata';
import { getAllTopics, getTopicDocs, getTopicStandards } from '@/lib/topics';

export const metadata: Metadata = buildPageMetadata({
  title: '土木技術のテーマ別索引',
  description: 'コンクリート、土工、道路、河川、防災、安全、品質、環境、維持管理などのテーマから、資格試験・現場実務・公的基準を横断して探せます。',
  path: '/topics',
});

export default function TopicsPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        label="TOPICS"
        title="土木技術のテーマ別索引"
        lead="資格名や資料名ではなく、現場で調べたい技術テーマから試験対策・実務ノート・公的基準を横断できます。"
      />
      <SectionBlock>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {getAllTopics().map((topic) => {
            const docs = getTopicDocs(topic);
            const standards = getTopicStandards(topic);
            return (
              <Link
                key={topic.slug}
                href={`/topics/${topic.slug}`}
                className="focus-ring card-interactive border border-[var(--rule-soft)] bg-[var(--paper)] p-5 transition-[border-color,box-shadow] hover:border-[var(--accent)]"
              >
                <h2 className="font-serif text-lg font-bold text-[var(--ink)]">{topic.label}</h2>
                <p className="mt-2 text-[13px] leading-[1.75] text-[var(--ink-muted)]">{topic.description}</p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-[var(--accent)]">
                  記事 {docs.length} / 基準資料 {standards.length}
                </p>
              </Link>
            );
          })}
        </div>
      </SectionBlock>
    </PageShell>
  );
}

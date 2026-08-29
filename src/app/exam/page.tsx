import type { Metadata } from 'next';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { ExamCards } from '@/components/home';
import { buildExamCards } from '@/lib/home-exam-cards';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: '資格試験対策',
  description: '土木施工管理技士、技術士、コンクリート主任技士・診断士の試験別ガイド、体系テキスト、過去問解説を資格ごとに整理しています。',
  path: '/exam',
});

export default function ExamIndexPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        label="EXAM"
        title="資格試験対策"
        lead="資格ごとに、試験ガイド・体系テキスト・過去問・キーワードを一つの学習導線に整理しています。"
      />
      <ExamCards exams={buildExamCards()} />
    </PageShell>
  );
}

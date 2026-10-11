import type { Metadata } from 'next';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { ExamCards } from '@/components/home';
import { buildExamCards } from '@/lib/home-exam-cards';
import { buildPageMetadata } from '@/lib/metadata';
import SectionCard from '@/components/ui/SectionCard/SectionCard';

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
      <SectionCard as="section" className="mt-8">
        <h2 className="text-base font-bold text-(--ink) mb-3">資格ごとの学習の進め方</h2>
        <p className="text-sm leading-7 text-(--ink-body)">
          各資格のページは、試験の全体像をつかむ試験ガイド、出題分野を図で体系的に学ぶテキスト、年度別の過去問解説、用語を確かめるキーワードの順に並べています。初めて受ける資格は、試験ガイドで受験資格・試験日程・合格基準を確かめ、テキストで分野ごとの要点を押さえてから過去問で理解を確かめると、短い時間でも抜けなく進められます。記述式のある試験では、過去問の解答例と書き方のガイドで答案の型をつかんでください。
        </p>
      </SectionCard>
    </PageShell>
  );
}

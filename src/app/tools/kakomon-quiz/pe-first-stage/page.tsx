import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import KakomonQuizClient, { type KakomonQuizConfig } from "../KakomonQuizClient";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "技術士第一次試験 過去問 無料演習｜基礎・適性・建設 全560問",
  description:
    "技術士第一次試験の基礎科目・適性科目・専門科目（建設部門）を無料で演習。令和元〜7年度の全560問を、年度別・科目別・ランダム・間違い復習で解けます。図・数式・全選択肢解説つき。",
  alternates: { canonical: "/tools/kakomon-quiz/pe-first-stage" },
  openGraph: {
    type: "website",
    title: "技術士第一次試験 過去問 無料演習｜全560問",
    description: "令和元〜7年度の基礎・適性・専門（建設部門）全560問を、即採点・全選択肢解説つきで無料演習。",
    url: "https://doboku-note.com/tools/kakomon-quiz/pe-first-stage",
    siteName: "doboku-note",
    images: [{ url: "https://doboku-note.com/images/og-default.png", width: 1200, height: 630, alt: "技術士第一次試験 過去問 無料演習" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "技術士第一次試験 過去問 無料演習｜全560問",
    description: "基礎・適性・専門（建設部門）の令和元〜7年度を、図・数式・全選択肢解説つきで無料演習。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

const QUIZ_CONFIG: KakomonQuizConfig = {
  exam: "pe-first-stage",
  dataUrl: "/quiz/pe-first-stage.json",
  intro:
    "技術士第一次試験の基礎科目・適性科目・専門科目（建設部門）を、1問ずつ即採点＋全選択肢の解説つきで演習できます。令和元〜7年度の全560問（559問を採点、1問は公式正答番号の掲載なし）を無料で収録しています。",
  sourceNote:
    "出典: 公益社団法人 日本技術士会「技術士第一次試験 過去問題」。図・数式を含めて原典と照合済みです。令和7年度 専門科目Ⅲ-13は公式正答番号が掲載されていないため採点対象外としています。",
  yearTitleSuffix: "・全3科目",
  showSubjects: true,
  placeholderYears: [
    { year: "r07", yearLabel: "令和7年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r06", yearLabel: "令和6年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r05", yearLabel: "令和5年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r04", yearLabel: "令和4年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r03", yearLabel: "令和3年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r02", yearLabel: "令和2年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r01", yearLabel: "令和元年度", parts: ["basic", "aptitude", "construction"], count: 80 },
  ],
  placeholderSubjects: [
    { subject: "basic", subjectLabel: "基礎科目", count: 210 },
    { subject: "aptitude", subjectLabel: "適性科目", count: 105 },
    { subject: "construction", subjectLabel: "専門科目（建設部門）", count: 245 },
  ],
  noteCta: {
    id: "pe1-takuitsu-pdf",
    href: "https://note.com/dobokunote/n/n466132e6fd74?utm_source=doboku-note&utm_medium=quiz&utm_campaign=pe-first-stage-kakomon",
    title: "A4で印刷して書き込む｜全560問PDF（note）",
    description: "3科目7年分を一冊に集約。間違いへ直接メモして紙で反復したい方向け",
  },
  detailCta: {
    href: "/exam/pe-first-stage/primary/r07-basic",
    title: "令和7年度 基礎科目の詳しい解説",
    description: "計算過程・図・試験で押さえる要点まで元記事で確認",
  },
};

export default function PeFirstStageQuizPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "技術士第一次試験", href: "/exam/pe-first-stage" },
          { label: "無料演習" },
        ]}
        label="登録不要・無料"
        title="技術士第一次試験 過去問演習"
        lead={
          <>
            <strong className="text-[var(--ink)]">基礎・適性・専門（建設部門）</strong>の令和元〜7年度・全560問を、年度別・科目別・ランダム・間違い復習で解けます。図と数式もそのまま表示します。
          </>
        }
      />
      <KakomonQuizClient config={QUIZ_CONFIG} />
    </PageShell>
  );
}

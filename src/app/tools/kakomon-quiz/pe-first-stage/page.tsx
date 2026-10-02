import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import KakomonQuizClient, { type KakomonQuizConfig } from "../KakomonQuizClient";
import "katex/dist/katex.min.css";
import { buildMagazineUrl, getMagazine, type MagazineId } from "@/lib/note-magazines";

// 演習画面は結果表示後にしか note 導線が出ず、SSR の HTML には導線が無かった
// （2026-09-27 配線監査 DN-0364）。演習の下に静的な note 商品カードを置く。
const NOTE_PRODUCTS: readonly { id: MagazineId; lead: string }[] = [
  { id: "pe1-takuitsu-pdf", lead: "紙に書き込んで間違いを反復する 3 科目 7 年分" },
  { id: "pe1-chokuzen-pack", lead: "過去問 PDF と暗記ノートをまとめた直前パック" },
];

export const metadata: Metadata = {
  title: "技術士第一次試験 過去問 無料演習｜基礎・適性・建設 全1,270問",
  description:
    "技術士第一次試験の基礎科目・適性科目・専門科目（建設部門）を無料で演習。平成23〜令和7年度と令和元年度再試験の全1,270問を、年度別・科目別・ランダム・間違い復習で解けます。図・数式・全選択肢解説つき。",
  alternates: { canonical: "/tools/kakomon-quiz/pe-first-stage" },
  openGraph: {
    type: "website",
    title: "技術士第一次試験 過去問 無料演習｜全1,270問",
    description: "平成23〜令和7年度と令和元年度再試験の基礎・適性・専門（建設部門）全1,270問を、即採点・全選択肢解説つきで無料演習。",
    url: "https://doboku-note.com/tools/kakomon-quiz/pe-first-stage",
    siteName: "doboku-note",
    images: [{ url: "https://doboku-note.com/images/og-default.png", width: 1200, height: 630, alt: "技術士第一次試験 過去問 無料演習" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "技術士第一次試験 過去問 無料演習｜全1,270問",
    description: "基礎・適性・専門（建設部門）の平成23〜令和7年度と令和元年度再試験を、図・数式・全選択肢解説つきで無料演習。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

const QUIZ_CONFIG: KakomonQuizConfig = {
  exam: "pe-first-stage",
  dataUrl: "/quiz/pe-first-stage.json",
  intro:
    "技術士第一次試験の基礎科目・適性科目・専門科目（建設部門）を、1問ずつ即採点＋全選択肢の解説つきで演習できます。平成23〜令和7年度と令和元年度再試験の全1,270問（1,266問を採点、4問は採点対象外）を無料で収録しています。",
  sourceNote:
    "出典: 公益社団法人 日本技術士会「技術士第一次試験 過去問題」。図・数式を含めて原典と照合済みです。平成23年度 適性科目Ⅱ-4は公式に2肢（1又は5）を正答扱い、平成30年度と令和元年度再試験の適性科目Ⅱ-14は公式に全員正解、令和7年度 専門科目Ⅲ-13は公式正答番号の掲載なしのため、演習では採点対象外としています。",
  yearTitleSuffix: "・全3科目",
  showSubjects: true,
  placeholderYears: [
    { year: "r07", yearLabel: "令和7年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r06", yearLabel: "令和6年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r05", yearLabel: "令和5年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r04", yearLabel: "令和4年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r03", yearLabel: "令和3年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r02", yearLabel: "令和2年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r01-retry", yearLabel: "令和元年度（再試験）", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "r01", yearLabel: "令和元年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "h30", yearLabel: "平成30年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "h29", yearLabel: "平成29年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "h28", yearLabel: "平成28年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "h27", yearLabel: "平成27年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "h26", yearLabel: "平成26年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "h25", yearLabel: "平成25年度", parts: ["basic", "aptitude", "construction"], count: 80 },
    { year: "h24", yearLabel: "平成24年度", parts: ["basic", "aptitude", "construction"], count: 75 },
    { year: "h23", yearLabel: "平成23年度", parts: ["basic", "aptitude", "construction"], count: 75 },
  ],
  placeholderSubjects: [
    { subject: "basic", subjectLabel: "基礎科目", count: 470 },
    { subject: "aptitude", subjectLabel: "適性科目", count: 240 },
    { subject: "construction", subjectLabel: "専門科目（建設部門）", count: 560 },
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
            <strong className="text-(--ink)">基礎・適性・専門（建設部門）</strong>の平成23〜令和7年度と令和元年度再試験・全1,270問を、年度別・科目別・ランダム・間違い復習で解けます。図と数式もそのまま表示します。
          </>
        }
      />
      <KakomonQuizClient config={QUIZ_CONFIG} />
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 pb-10">
        <div className="text-[11px] font-bold uppercase tracking-wider text-(--ink-muted) mb-3">
          紙でも反復する（note）
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {NOTE_PRODUCTS.map(({ id, lead }) => {
            const mag = getMagazine(id);
            if (!mag) return null;
            const label = `${id}:tools-kakomon-quiz-pe-first-stage`;
            return (
              <a
                key={id}
                href={buildMagazineUrl(mag, label)}
                target="_blank"
                rel="noopener"
                data-cta="note"
                data-cta-label={label}
                data-cta-placement="tools-kakomon-quiz-pe-first-stage"
                className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-(--accent)"
              >
                <div className="font-bold text-(--ink)">{mag.shortTitle ?? mag.title}</div>
                <div className="text-sm text-(--ink-body) mt-1">{lead}</div>
              </a>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}

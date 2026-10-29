import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import KakomonQuizClient from "./KakomonQuizClient";
import QuizNoteProducts from "./QuizNoteProducts";
import type { MagazineId } from "@/lib/note-magazines";
import { DEFAULT_OG_IMAGE } from "@/lib/metadata";
import { SITE_ORIGIN } from "@/config/site-identity.mjs";
import AffiliateSlot from "@/components/ui/AffiliateSlot/AffiliateSlot";
import { quizQuestionCount, quizYearCount, quizYearRange } from "@/lib/quiz-summary";
import { toolByHref } from "@/lib/tools";

const tool = toolByHref("/tools/kakomon-quiz");

// 演習の下に出す note 商品カード（QuizNoteProducts）。結果画面の CTA と同じ出る順ノートと、紙で反復する択一 過去問PDF。
const NOTE_PRODUCTS: readonly { id: MagazineId; lead: string }[] = [
  { id: "civil-1-ichiji-ronten", lead: "出題の多い論点から順に押さえる合格ノート" },
  { id: "civil-1-takuitsu-pdf", lead: "紙に書き込んで間違いを反復する 12 年分の過去問" },
];

export const metadata: Metadata = {
  title: `1級土木 過去問 無料演習｜第一次検定 全${quizQuestionCount('civil-1')}問を4択クイズ`,
  description:
    `1級土木施工管理技士 第一次検定の過去問を、その場で解ける4択演習。1問ずつ即採点＋全選択肢の解説つき。${quizYearRange('civil-1')}の${quizYearCount('civil-1')}年度分・全${quizQuestionCount('civil-1')}問を年度別・ランダム・間違い復習で無料演習できます。`,
  alternates: { canonical: "/tools/kakomon-quiz" },
  openGraph: {
    type: "website",
    title: `1級土木 過去問 無料演習｜第一次検定 全${quizQuestionCount('civil-1')}問 4択クイズ`,
    description: `1級土木 第一次検定の過去問を即採点＋全選択肢解説つきで無料演習。${quizYearRange('civil-1')} 全${quizQuestionCount('civil-1')}問。`,
    url: `${SITE_ORIGIN}/tools/kakomon-quiz`,
    siteName: "doboku-note",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "1級土木 過去問 無料演習 — doboku-note" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `1級土木 過去問 無料演習｜第一次検定 全${quizQuestionCount('civil-1')}問 4択クイズ`,
    description: `1級土木 第一次検定の過去問を即採点＋全選択肢解説つきで無料演習。${quizYearRange('civil-1')} 全${quizQuestionCount('civil-1')}問。`,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function KakomonQuizPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }]}
        label="無料ツール"
        title={tool.title}
        lead={
          <>
            <strong className="text-(--ink)">1級土木施工管理技士 第一次検定</strong>の過去問を、その場で解ける<strong className="text-(--ink)">4択演習</strong>です。1問ずつ即採点し、全選択肢の解説を表示します（{quizYearRange("civil-1")}・全{quizQuestionCount("civil-1")}問／年度別・ランダム・間違い復習）。
          </>
        }
      />

      <KakomonQuizClient />
      <QuizNoteProducts products={NOTE_PRODUCTS} placement="tools-kakomon-quiz" />
      {/* 転職の案内（ページ末に 1 枠。案件は配置ルール） */}
      <AffiliateSlot page={{ pageKind: "tool" }} slot="tool-end" className="max-w-[760px] mx-auto px-4 sm:px-6 pb-10" />
    </PageShell>
  );
}

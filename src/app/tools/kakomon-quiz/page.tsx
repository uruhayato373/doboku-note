import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import KakomonQuizClient from "./KakomonQuizClient";

export const metadata: Metadata = {
  title: "1級土木 過去問 無料演習｜第一次検定 全1,098問を4択クイズ",
  description:
    "1級土木施工管理技士 第一次検定の過去問を、その場で解ける4択演習。1問ずつ即採点＋全選択肢の解説つき。平成26〜令和7年度の全1,098問を年度別・ランダム・間違い復習で無料演習できます。",
  alternates: { canonical: "/tools/kakomon-quiz" },
  openGraph: {
    type: "website",
    title: "1級土木 過去問 無料演習｜第一次検定 全1,098問 4択クイズ",
    description: "1級土木 第一次検定の過去問を即採点＋全選択肢解説つきで無料演習。平成26〜令和7年度 全1,098問。",
    url: "https://doboku-note.com/tools/kakomon-quiz",
    siteName: "doboku-note",
    images: [{ url: "https://doboku-note.com/images/og-default.png", width: 1200, height: 630, alt: "1級土木 過去問 無料演習 — doboku-note" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "1級土木 過去問 無料演習｜第一次検定 全1,098問 4択クイズ",
    description: "1級土木 第一次検定の過去問を即採点＋全選択肢解説つきで無料演習。平成26〜令和7年度 全1,098問。",
    images: ["https://doboku-note.com/images/og-default.png"],
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
        title="1級土木 過去問 無料演習"
        lead={
          <>
            <strong className="text-[var(--ink)]">1級土木施工管理技士 第一次検定</strong>の過去問を、その場で解ける<strong className="text-[var(--ink)]">4択演習</strong>です。1問ずつ即採点し、全選択肢の解説を表示します（平成26〜令和7年度・全1,098問／年度別・ランダム・間違い復習）。
          </>
        }
      />

      <KakomonQuizClient />
    </PageShell>
  );
}

import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import KakomonQuizClient from "./KakomonQuizClient";

export const metadata: Metadata = {
  title: "1級土木 過去問ミニ演習｜第一次検定 過去問を無料で4択クイズ",
  description:
    "1級土木施工管理技士 第一次検定の過去問を、その場で解けるミニ演習（4択クイズ）。1問ずつ即採点＋全選択肢の解説つき。令和4〜7年度から抜粋24問を無料で演習できます。",
  alternates: { canonical: "/tools/kakomon-quiz" },
  openGraph: {
    type: "website",
    title: "1級土木 過去問ミニ演習｜第一次検定 4択クイズ",
    description: "1級土木 第一次検定の過去問を即採点＋解説つきで無料演習。抜粋24問のミニテスト。",
    url: "https://doboku-note.com/tools/kakomon-quiz",
    siteName: "doboku-note",
    images: [{ url: "https://doboku-note.com/images/og-default.png", width: 1200, height: 630, alt: "1級土木 過去問ミニ演習 — doboku-note" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "1級土木 過去問ミニ演習｜第一次検定 4択クイズ",
    description: "1級土木 第一次検定の過去問を即採点＋解説つきで無料演習。",
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
        title="1級土木 過去問ミニ演習"
        lead={
          <>
            <strong className="text-[var(--ink)]">1級土木施工管理技士 第一次検定</strong>の過去問を、その場で解ける<strong className="text-[var(--ink)]">4択ミニ演習</strong>です。1問ずつ即採点し、全選択肢の解説を表示します（令和4〜7年度から抜粋24問）。
          </>
        }
      />

      <KakomonQuizClient />
    </PageShell>
  );
}

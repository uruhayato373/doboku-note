import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import ConcreteMaturityClient from "./ConcreteMaturityClient";

export const metadata: Metadata = {
  // title template `%s | doboku-note` で自動付与されるため "doboku-note" は重ねない
  title: "コンクリート 積算温度（マチュリティ）計算ツール｜寒中コンクリートの判定",
  description:
    "養生期間中の平均気温と日数から積算温度（マチュリティ M=Σ(θ+10)Δt）を計算し、標準養生28日相当（840℃・D）との比較・寒中コンクリートの区分（日平均気温4℃以下）を確認します。登録不要・無料。",
  alternates: { canonical: "/tools/concrete-maturity" },
  openGraph: {
    type: "website",
    title: "コンクリート 積算温度（マチュリティ）計算ツール",
    description: "養生期間中の温度と日数から積算温度を計算し、標準養生28日相当と比較。",
    url: "https://doboku-note.com/tools/concrete-maturity",
    siteName: "doboku-note",
    images: [
      {
        url: "https://doboku-note.com/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "コンクリート 積算温度（マチュリティ）計算ツール — doboku-note",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "コンクリート 積算温度（マチュリティ）計算ツール",
    description: "養生期間の温度と日数から積算温度を計算し、標準養生28日相当と比較。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

export default function ConcreteMaturityPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }]}
        label="無料ツール"
        title="コンクリート 積算温度（マチュリティ）計算ツール"
        lead={
          <>
            養生期間中の<strong className="text-[var(--ink)]">平均気温</strong>と<strong className="text-[var(--ink)]">日数</strong>から積算温度（マチュリティ）を計算し、標準養生28日相当（840℃・D）との比較で養生の進み具合の目安を確認します。強度そのものは、配合ごとに事前に把握した関係式・試験による確認と併用してください。
          </>
        }
      />

      <ConcreteMaturityClient />
    </PageShell>
  );
}

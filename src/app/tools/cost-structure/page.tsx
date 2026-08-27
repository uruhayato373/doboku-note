import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import CostStructureClient from "./CostStructureClient";

export const metadata: Metadata = {
  // title template `%s | doboku-note` で自動付与されるため "doboku-note" は重ねない
  title: "工事原価 構成比計算ツール｜直接工事費・共通仮設費・現場管理費",
  description:
    "直接工事費・共通仮設費・現場管理費・一般管理費等の金額から、請負工事費に占める構成比を計算します。土木工事積算基準の費目区分に基づく構成比の可視化のみで、赤字の判定は行いません。登録不要・無料。",
  alternates: { canonical: "/tools/cost-structure" },
  openGraph: {
    type: "website",
    title: "工事原価 構成比計算ツール",
    description: "費目ごとの金額から、請負工事費に占める構成比を計算・可視化。",
    url: "https://doboku-note.com/tools/cost-structure",
    siteName: "doboku-note",
    images: [
      {
        url: "https://doboku-note.com/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "工事原価 構成比計算ツール — doboku-note",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "工事原価 構成比計算ツール",
    description: "費目ごとの構成比を、その場で確認。判定はしません。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

export default function CostStructurePage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }]}
        label="無料ツール"
        title="工事原価 構成比計算ツール"
        lead={
          <>
            直接工事費・共通仮設費・現場管理費・一般管理費等の金額を入れると、請負工事費に占める<strong className="text-[var(--ink)]">構成比</strong>を計算します。<strong className="text-[var(--ink)]">「赤字かどうか」は判定しません</strong>——公的な判定基準が存在しないためです。自社の実績・計画との比較材料としてお使いください。
          </>
        }
      />

      <CostStructureClient />
    </PageShell>
  );
}

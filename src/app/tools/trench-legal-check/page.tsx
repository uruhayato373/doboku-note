import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import TrenchLegalCheckClient from "./TrenchLegalCheckClient";

export const metadata: Metadata = {
  // title template `%s | doboku-note` で自動付与されるため "doboku-note" は重ねない
  title: "溝掘削 法令チェッカー｜作業主任者・勾配基準・土止め先行工法の適用範囲",
  description:
    "掘削面の高さと地山の種類から、作業主任者の選任義務・法面勾配の基準・土止め先行工法ガイドラインの適用範囲を確認します。労働安全衛生規則第356・359・361条準拠、登録不要・無料。",
  alternates: { canonical: "/tools/trench-legal-check" },
  openGraph: {
    type: "website",
    title: "溝掘削 法令チェッカー｜作業主任者・勾配基準の適用確認",
    description: "掘削面の高さから、作業主任者の選任義務と法面勾配の基準をその場で確認。",
    url: "https://doboku-note.com/tools/trench-legal-check",
    siteName: "doboku-note",
    images: [
      {
        url: "https://doboku-note.com/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "溝掘削 法令チェッカー — doboku-note",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "溝掘削 法令チェッカー",
    description: "作業主任者の選任義務と法面勾配の基準を、その場で確認。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

export default function TrenchLegalCheckPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }]}
        label="無料ツール"
        title="溝掘削 法令チェッカー"
        lead={
          <>
            掘削面の高さと地山の種類を入れると、<strong className="text-[var(--ink)]">作業主任者の選任義務</strong>・<strong className="text-[var(--ink)]">法面勾配の基準</strong>・<strong className="text-[var(--ink)]">土止め先行工法ガイドラインの適用範囲</strong>を確認できます。「安全な深さ」を判定するツールではありません。
          </>
        }
      />

      <TrenchLegalCheckClient />
    </PageShell>
  );
}

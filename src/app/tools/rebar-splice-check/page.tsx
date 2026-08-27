import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import RebarSpliceCheckClient from "./RebarSpliceCheckClient";

export const metadata: Metadata = {
  // title template `%s | doboku-note` で自動付与されるため "doboku-note" は重ねない
  title: "鉄筋継手 判定ツール｜千鳥配置のずらし量とガス圧接ふくらみ検査",
  description:
    "継手長さと鉄筋径から千鳥配置のずらし量（継手長さ+25d）を計算し、ガス圧接のふくらみ検査基準（径1.4d・長さ1.1d等）への適合を判定します。JIS Z 3120準拠、登録不要・無料。",
  alternates: { canonical: "/tools/rebar-splice-check" },
  openGraph: {
    type: "website",
    title: "鉄筋継手 判定ツール｜ずらし量とガス圧接ふくらみ検査",
    description: "千鳥配置のずらし量と、ガス圧接のふくらみ検査基準への適合をその場で確認。",
    url: "https://doboku-note.com/tools/rebar-splice-check",
    siteName: "doboku-note",
    images: [
      {
        url: "https://doboku-note.com/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "鉄筋継手 判定ツール — doboku-note",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "鉄筋継手 判定ツール",
    description: "千鳥配置のずらし量とガス圧接ふくらみ検査基準を、その場で確認。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

export default function RebarSpliceCheckPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }]}
        label="無料ツール"
        title="鉄筋継手 判定ツール"
        lead={
          <>
            継手長さと鉄筋径から<strong className="text-[var(--ink)]">千鳥配置のずらし量</strong>（継手長さ+25d）を計算し、ガス圧接部の<strong className="text-[var(--ink)]">ふくらみの実測値</strong>がJIS Z 3120の検査基準を満たすかを判定します。
          </>
        }
      />

      <RebarSpliceCheckClient />
    </PageShell>
  );
}

import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import WaterContentClient from "./WaterContentClient";
import { DEFAULT_OG_IMAGE } from "@/lib/metadata";
import { SITE_ORIGIN } from "@/config/site-identity.mjs";
import AffiliateSlot from "@/components/ui/AffiliateSlot/AffiliateSlot";

export const metadata: Metadata = {
  // title template `%s | doboku-note` で自動付与されるため "doboku-note" は重ねない
  title: "コンクリート 単位水量・水和水 計算ツール｜余剰水の内訳",
  description:
    "水セメント比と単位セメント量から単位水量を計算し、水和反応に必要な水（セメント質量の25〜30%）と余剰水の内訳を確認します。単位水量175kg/m³・水セメント比65%の目安も表示、登録不要・無料。",
  alternates: { canonical: "/tools/water-content" },
  openGraph: {
    type: "website",
    title: "コンクリート 単位水量・水和水 計算ツール",
    description: "水セメント比と単位セメント量から、単位水量と水和水・余剰水の内訳を計算。",
    url: `${SITE_ORIGIN}/tools/water-content`,
    siteName: "doboku-note",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "コンクリート 単位水量・水和水 計算ツール — doboku-note",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "コンクリート 単位水量・水和水 計算ツール",
    description: "単位水量と水和水・余剰水の内訳を、その場で計算。",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function WaterContentPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }]}
        label="無料ツール"
        title="コンクリート 単位水量・水和水 計算ツール"
        lead={
          <>
            水セメント比と単位セメント量から<strong className="text-(--ink)">単位水量</strong>を計算し、水和反応に必要な水（セメント質量の25〜30%）と<strong className="text-(--ink)">余剰水</strong>の内訳を確認します。
          </>
        }
      />

      <WaterContentClient />
      {/* 転職の案内（ページ末に 1 枠。案件は配置ルール） */}
      <AffiliateSlot page={{ pageKind: "tool" }} slot="tool-end" className="max-w-[760px] mx-auto px-4 sm:px-6 pb-10" />
    </PageShell>
  );
}

import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import ConcreteTimeCheckClient from "./ConcreteTimeCheckClient";
import { DEFAULT_OG_IMAGE } from "@/lib/metadata";
import { SITE_ORIGIN } from "@/config/site-identity.mjs";
import AffiliateSlot from "@/components/ui/AffiliateSlot/AffiliateSlot";

export const metadata: Metadata = {
  // title template `%s | doboku-note` で自動付与されるため "doboku-note" は重ねない
  title: "コンクリート打込み 時間管理チェッカー｜打重ね時間間隔・運搬時間の限度",
  description:
    "外気温と練混ぜ完了時刻から、コンクリートの許容打重ね時間間隔・練混ぜ〜打込み終了・荷卸しの限度時刻を計算。日平均気温から暑中／寒中コンクリートの区分も判定します。土木学会コンクリート標準示方書・JIS A 5308 準拠、登録不要・無料。",
  alternates: { canonical: "/tools/concrete-time-check" },
  openGraph: {
    type: "website",
    title: "コンクリート打込み 時間管理チェッカー｜打重ね時間間隔の限度時刻",
    description:
      "外気温と練混ぜ時刻から、許容打重ね時間間隔・運搬時間の限度を時刻で表示。暑中／寒中コンクリートの区分も判定。",
    url: `${SITE_ORIGIN}/tools/concrete-time-check`,
    siteName: "doboku-note",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "コンクリート打込み 時間管理チェッカー — doboku-note",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "コンクリート打込み 時間管理チェッカー",
    description:
      "外気温と練混ぜ時刻から、許容打重ね時間間隔・運搬時間の限度を時刻で表示。暑中／寒中の区分も判定。",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function ConcreteTimeCheckPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }]}
        label="無料ツール"
        title="コンクリート打込み 時間管理チェッカー"
        lead={
          <>
            <strong className="text-(--ink)">外気温</strong>と<strong className="text-(--ink)">練混ぜ完了時刻</strong>を入れると、許容打重ね時間間隔・練混ぜ〜打込み終了・荷卸しの限度が<strong className="text-(--ink)">時刻</strong>で出ます。日平均気温から暑中／寒中コンクリートの区分も判定します。
          </>
        }
      />

      <ConcreteTimeCheckClient />
      {/* 転職の案内（ページ末に 1 枠。案件は配置ルール） */}
      <AffiliateSlot page={{ pageKind: "tool" }} slot="tool-end" className="max-w-[760px] mx-auto px-4 sm:px-6 pb-10" />
    </PageShell>
  );
}

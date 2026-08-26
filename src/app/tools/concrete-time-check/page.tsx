import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import ConcreteTimeCheckClient from "./ConcreteTimeCheckClient";

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
    url: "https://doboku-note.com/tools/concrete-time-check",
    siteName: "doboku-note",
    images: [
      {
        url: "https://doboku-note.com/images/og-default.png",
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
    images: ["https://doboku-note.com/images/og-default.png"],
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
            <strong className="text-[var(--ink)]">外気温</strong>と<strong className="text-[var(--ink)]">練混ぜ完了時刻</strong>を入れると、許容打重ね時間間隔・練混ぜ〜打込み終了・荷卸しの限度が<strong className="text-[var(--ink)]">時刻</strong>で出ます。日平均気温から暑中／寒中コンクリートの区分も判定します。
          </>
        }
      />

      <ConcreteTimeCheckClient />
    </PageShell>
  );
}

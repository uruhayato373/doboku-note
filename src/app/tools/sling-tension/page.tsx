import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import SlingTensionClient from "./SlingTensionClient";

export const metadata: Metadata = {
  // title template `%s | doboku-note` で自動付与されるため "doboku-note" は重ねない
  title: "玉掛け 吊り角度・張力計算ツール｜必要な破断荷重と安全係数6",
  description:
    "吊り荷重・本数・吊り角度から、ワイヤー1本当たりの張力と、安全係数6を満たすために必要な破断荷重を計算します。クレーン等安全規則第213条準拠、登録不要・無料。",
  alternates: { canonical: "/tools/sling-tension" },
  openGraph: {
    type: "website",
    title: "玉掛け 吊り角度・張力計算ツール｜必要な破断荷重",
    description: "吊り角度で変わる張力と、安全係数6を満たすワイヤー選定をその場で計算。",
    url: "https://doboku-note.com/tools/sling-tension",
    siteName: "doboku-note",
    images: [
      {
        url: "https://doboku-note.com/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "玉掛け 吊り角度・張力計算ツール — doboku-note",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "玉掛け 吊り角度・張力計算ツール",
    description: "吊り角度で変わる張力と必要な破断荷重を、その場で確認。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

export default function SlingTensionPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }]}
        label="無料ツール"
        title="玉掛け 吊り角度・張力計算ツール"
        lead={
          <>
            吊り荷重・ワイヤー本数・吊り角度を入れると、<strong className="text-[var(--ink)]">1本当たりの張力</strong>と、安全係数6を満たすために<strong className="text-[var(--ink)]">必要な破断荷重</strong>が出ます。角度が開くほど張力がどう増えるかを確認できます。
          </>
        }
      />

      <SlingTensionClient />
    </PageShell>
  );
}

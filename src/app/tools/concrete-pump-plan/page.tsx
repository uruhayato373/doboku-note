import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import ConcretePumpPlanClient from "./ConcretePumpPlanClient";

export const metadata: Metadata = {
  // title template `%s | doboku-note` で自動付与されるため "doboku-note" は重ねない
  title: "ポンプ車・アジテータ車 配車計算ツール｜台数と圧送距離の水平換算長",
  description:
    "目標の時間当たり打込み量からポンプ車・アジテータ車の必要台数を計算し、圧送ルートの水平換算長が100mの目安に収まるかを確認します。土木学会コンクリートのポンプ施工指針準拠、登録不要・無料。",
  alternates: { canonical: "/tools/concrete-pump-plan" },
  openGraph: {
    type: "website",
    title: "ポンプ車・アジテータ車 配車計算ツール｜台数と圧送距離の換算",
    description:
      "打込み量からポンプ車・アジテータ車の台数を計算し、圧送ルートが届くかを水平換算長で確認。",
    url: "https://doboku-note.com/tools/concrete-pump-plan",
    siteName: "doboku-note",
    images: [
      {
        url: "https://doboku-note.com/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "ポンプ車・アジテータ車 配車計算ツール — doboku-note",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ポンプ車・アジテータ車 配車計算ツール",
    description: "台数計算と圧送距離の水平換算長を、その場で確認。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

export default function ConcretePumpPlanPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }]}
        label="無料ツール"
        title="ポンプ車・アジテータ車 配車計算ツール"
        lead={
          <>
            総打込み量と作業時間から<strong className="text-[var(--ink)]">ポンプ車の必要台数</strong>を、積載量と往復時間から<strong className="text-[var(--ink)]">アジテータ車の必要台数</strong>を計算します。圧送ルートの<strong className="text-[var(--ink)]">水平換算長</strong>が100mの目安に収まるかも同じ画面で確認できます。
          </>
        }
      />

      <ConcretePumpPlanClient />
    </PageShell>
  );
}

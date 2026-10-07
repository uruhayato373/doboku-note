import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import JukenShikakuClient from "./JukenShikakuClient";
import AffiliateSlot from "@/components/ui/AffiliateSlot/AffiliateSlot";
import { DEFAULT_OG_IMAGE } from "@/lib/metadata";
import { SITE_ORIGIN } from "@/config/site-identity.mjs";

export const metadata: Metadata = {
  title: "土木施工管理技士 受験資格チェッカー｜1級・2級 新受検資格を年齢・実務経験で判定",
  description:
    "1級・2級土木施工管理技士の受験資格を無料で判定。第一次検定の年齢要件（1級19歳/2級17歳）と、第二次検定の新受検資格（第一次検定等合格後の実務経験年数）を、級・保有資格ルート別にチェック。令和6年度〜の新制度・経過措置に対応。",
  alternates: { canonical: "/tools/juken-shikaku" },
  openGraph: {
    type: "website",
    title: "土木施工管理技士 受験資格チェッカー｜1級・2級",
    description:
      "1級・2級土木施工管理技士の受験資格を年齢・実務経験で無料判定。令和6年度〜の新受検資格に対応。",
    url: `${SITE_ORIGIN}/tools/juken-shikaku`,
    siteName: "doboku-note",
    images: [
      { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "土木施工管理技士 受験資格チェッカー — doboku-note" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "土木施工管理技士 受験資格チェッカー｜1級・2級",
    description: "1級・2級土木施工管理技士の受験資格を年齢・実務経験で無料判定。新受検資格対応。",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function JukenShikakuPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }]}
        label="無料ツール"
        title="土木施工管理技士 受験資格チェッカー"
        lead={
          <>
            <strong className="text-(--ink)">1級・2級土木施工管理技士</strong>の受験資格を無料で判定します。第一次検定の<strong className="text-(--ink)">年齢要件</strong>と、第二次検定の<strong className="text-(--ink)">新受検資格（合格後の実務経験年数）</strong>を、級・保有資格ルート別にチェックできます（令和6年度〜の新制度）。
          </>
        }
      />

      <JukenShikakuClient />
      {/* 転職の案内（結果の下に 1 枠。案件は配置ルール） */}
      <AffiliateSlot page={{ pageKind: "tool" }} slot="tool-inline" className="max-w-[760px] mx-auto px-4 sm:px-6 pb-10" />
    </PageShell>
  );
}

import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import KeikenCharcountClient from "./KeikenCharcountClient";

export const metadata: Metadata = {
  // title template `%s | doboku-note` で自動付与されるため "doboku-note" は重ねない
  title: "施工経験記述 文字数チェッカー｜1級・2級土木 第2次検定 解答欄の字数確認",
  description:
    "1級・2級土木施工管理技士 第2次検定 問題1（施工経験記述）の答案が解答欄の字数に収まるかを無料でチェック。級・出題形式（現行2テーマ／旧3項目）・設問別に上限字数を判定し、超過分を即表示します。",
  alternates: { canonical: "/tools/keiken-charcount" },
  openGraph: {
    type: "website",
    title: "施工経験記述 文字数チェッカー｜1級・2級土木 第2次検定",
    description:
      "施工経験記述の答案が解答欄に収まるか無料でチェック。級・設問別に上限字数（1級 現行200字 ほか）を判定。",
    url: "https://doboku-note.com/tools/keiken-charcount",
    siteName: "doboku-note",
    images: [
      {
        url: "https://doboku-note.com/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "施工経験記述 文字数チェッカー — doboku-note",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "施工経験記述 文字数チェッカー｜1級・2級土木 第2次検定",
    description:
      "施工経験記述の答案が解答欄に収まるか無料でチェック。級・設問別に上限字数を判定。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

export default function KeikenCharcountPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }]}
        label="無料ツール"
        title="施工経験記述 文字数チェッカー"
        lead={
          <>
            <strong className="text-[var(--ink)]">1級・2級土木施工管理技士 第2次検定 問題1（施工経験記述）</strong>の答案が、本番の<strong className="text-[var(--ink)]">解答欄の字数</strong>に収まるかを無料でチェックします。級・出題形式・設問を選び、答案を貼り付けるだけ。
          </>
        }
      />

      <KeikenCharcountClient />
    </PageShell>
  );
}

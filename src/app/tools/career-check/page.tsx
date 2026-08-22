import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import Link from "next/link";
import type { Metadata } from "next";
import { CAREER_HUB_ENTRIES, CAREER_HUB_SLUG } from "@/config/career-pathways";
import CareerCheckClient from "./CareerCheckClient";

export const metadata: Metadata = {
  title: "土木施工管理キャリア整理ツール｜資格・工種・工事規模・立場を棚卸しする",
  description:
    "土木施工管理の経験を、資格・工種・工事規模・立場の4つで棚卸しできる無料ツール。転職の可否や年収は判定せず、整理すべき論点・次に読むページ・面談で確認する質問・工事経歴の書き出し項目を返します。選択式のみで、氏名や連絡先の入力欄はありません。",
  alternates: { canonical: "/tools/career-check" },
  openGraph: {
    type: "website",
    title: "土木施工管理キャリア整理ツール｜経験の棚卸し",
    description:
      "資格・工種・工事規模・立場で経験を棚卸し。転職可否や年収は判定せず、論点と確認事項を整理します。登録不要・入力は保存されません。",
    url: "https://doboku-note.com/tools/career-check",
    siteName: "doboku-note",
    images: [
      {
        url: "https://doboku-note.com/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "土木施工管理キャリア整理ツール — doboku-note",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "土木施工管理キャリア整理ツール｜経験の棚卸し",
    description: "資格・工種・工事規模・立場で経験を棚卸し。転職可否や年収は判定しません。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

export default function CareerCheckPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }]}
        label="無料ツール"
        title="土木施工管理キャリア整理ツール"
        lead={
          <>
            施工管理の経験を<strong className="text-[var(--ink)]">資格・工種・工事規模・立場</strong>
            の4つで棚卸しし、いま整理すべき論点と、面談・求人票で確認することを一覧にします。
            <strong className="text-[var(--ink)]">転職の可否や想定年収は判定しません</strong>
            。すべて選択式で、入力は保存も送信もされません。
          </>
        }
      />

      <CareerCheckClient />

      {/*
        JavaScript が無効でも、hub と 5 本の柱へ到達できるようにする素のリンク。
        ツール本体はクライアント側で動くため、これが無いとページが行き止まりになる。
      */}
      <noscript>
        <div className="mx-auto mt-8 w-full max-w-[760px] px-4 sm:px-0">
          <p className="text-[15px] text-[var(--ink-body)]">
            このツールは JavaScript が有効な環境で動きます。無効の場合は、次のページから同じ内容を確認できます。
          </p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href={`/docs/${CAREER_HUB_SLUG}`} className="text-brand underline">
                施工管理の転職（悩み別の入口）
              </Link>
            </li>
            {CAREER_HUB_ENTRIES.map((e) => (
              <li key={`${e.need}-${e.href}`}>
                <Link href={e.href} className="text-brand underline">
                  {e.label}
                </Link>
                <span className="text-[var(--ink-muted)]">（{e.state}）</span>
              </li>
            ))}
          </ul>
        </div>
      </noscript>
    </PageShell>
  );
}

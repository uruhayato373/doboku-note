import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import type { Metadata } from "next";
import KeikenCharcountClient from "./KeikenCharcountClient";
import OffsiteCta from "@/components/ui/OffsiteCta/OffsiteCta";
import { resolveOffsiteCta } from "@/lib/offsite-cta";
import { buildMagazineUrl, getMagazine, type MagazineId } from "@/lib/note-magazines";

// 答案を書いている最中の人が来る高 intent ページ。記事への内部リンク（クライアント側）に加えて、
// note の完成答案集とココナラ添削へ直接つなぐ（2026-09-27 配線監査 DN-0364）。
const NOTE_PRODUCTS: readonly { id: MagazineId; lead: string }[] = [
  { id: "civil-1-experience-essay", lead: "1級｜5管理別の完成答案と置換ガイド" },
  { id: "civil-2-experience-essay", lead: "2級｜自分の工事に置き換えて書ける完成答案" },
];

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
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 pb-10">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-3">
          完成答案で書き方を確かめる（note）
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {NOTE_PRODUCTS.map(({ id, lead }) => {
            const mag = getMagazine(id);
            if (!mag) return null;
            const label = `${id}:tools-keiken-charcount`;
            return (
              <a
                key={id}
                href={buildMagazineUrl(mag, label)}
                target="_blank"
                rel="noopener"
                data-cta="note"
                data-cta-label={label}
                data-cta-placement="tools-keiken-charcount"
                className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-[var(--accent)]"
              >
                <div className="font-bold text-[var(--ink)]">{mag.shortTitle ?? mag.title}</div>
                <div className="text-sm text-[var(--ink-body)] mt-1">{lead}</div>
              </a>
            );
          })}
        </div>
        <OffsiteCta items={resolveOffsiteCta("tools-keiken-charcount")} heading="答案を見てほしい方へ" />
      </div>
    </PageShell>
  );
}

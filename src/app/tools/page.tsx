import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import SectionBlock from "@/components/layout/SectionBlock";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "無料ツール一覧｜土木施工管理技士 受験対策",
  description:
    "土木施工管理技士の受験対策とキャリア整理に使える無料web ツール集。施工経験記述の文字数チェッカー、受験資格チェッカー、過去問ミニ演習、経験の棚卸しツールなど、その場で使えるものをまとめています。",
  alternates: { canonical: "/tools" },
  openGraph: {
    type: "website",
    title: "無料ツール一覧｜土木施工管理技士 受験対策 — doboku-note",
    description: "経験記述の文字数チェック・受験資格判定・過去問ミニ演習など、土木施工管理技士の受験対策に使える無料web ツール集。",
    url: "https://doboku-note.com/tools",
    siteName: "doboku-note",
    images: [{ url: "https://doboku-note.com/images/og-default.png", width: 1200, height: 630, alt: "無料ツール一覧 — doboku-note" }],
  },
};

const TOOLS = [
  {
    href: "/tools/kakomon-quiz",
    title: "1級土木 過去問 無料演習",
    desc: "1級土木 第一次検定の過去問 全1,098問を4択で演習。年度別・ランダム・間違い復習、即採点＋全選択肢解説つき。",
    tag: "演習",
  },
  {
    href: "/tools/juken-shikaku",
    title: "受験資格チェッカー",
    desc: "1級・2級土木施工管理技士の受験資格を、年齢・実務経験から判定。令和6年度〜の新受検資格に対応。",
    tag: "判定",
  },
  {
    href: "/tools/career-check",
    title: "キャリア整理ツール",
    desc: "施工管理の経験を資格・工種・工事規模・立場で棚卸し。転職可否や年収は判定せず、論点と面談で確認することを整理します。",
    tag: "整理",
  },
  {
    href: "/tools/keiken-charcount",
    title: "施工経験記述 文字数チェッカー",
    desc: "第2次検定 問題1（施工経験記述）の答案が、本番の解答欄の字数に収まるかを判定（1級・2級）。",
    tag: "判定",
  },
  {
    href: "/tools/concrete-time-check",
    title: "コンクリート打込み 時間管理チェッカー",
    desc: "外気温と練混ぜ時刻から、許容打重ね時間間隔・運搬時間の限度を時刻で表示。暑中／寒中の区分も判定。",
    tag: "計算",
  },
  {
    href: "/tools/concrete-pump-plan",
    title: "ポンプ車・アジテータ車 配車計算ツール",
    desc: "打込み量からポンプ車・アジテータ車の必要台数を計算し、圧送ルートが届くかを水平換算長で確認。",
    tag: "計算",
  },
  {
    href: "/tools/sling-tension",
    title: "玉掛け 吊り角度・張力計算ツール",
    desc: "吊り荷重・本数・吊り角度から、ワイヤー1本当たりの張力と安全係数6を満たす必要破断荷重を計算。",
    tag: "計算",
  },
  {
    href: "/tools/trench-legal-check",
    title: "溝掘削 法令チェッカー",
    desc: "掘削面の高さと地山の種類から、作業主任者の選任義務・法面勾配の基準・土止め先行工法の適用範囲を確認。",
    tag: "判定",
  },
  {
    href: "/tools/concrete-maturity",
    title: "コンクリート 積算温度（マチュリティ）計算ツール",
    desc: "養生期間中の平均気温と日数から積算温度を計算し、標準養生28日相当（840℃・D）と比較。寒中コンクリートの区分も判定。",
    tag: "計算",
  },
];

export default function ToolsIndexPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="860"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools" }]}
        title="無料ツール"
        lead="土木施工管理技士の受験対策に使える、その場で動く無料ツールをまとめています。すべて登録不要・無料です。"
      />

      <SectionBlock width="860" space="sm">
        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="focus-ring card-surface-section group block p-5 transition-colors hover:border-[var(--accent)]"
            >
              <div className="inline-flex items-center font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] px-2 py-0.5 bg-[var(--accent-fill)] rounded-full mb-3">
                {t.tag}
              </div>
              <div className="font-bold text-[17px] text-[var(--ink)] group-hover:underline mb-1.5">{t.title}</div>
              <p className="text-sm leading-6 text-[var(--ink-body)]">{t.desc}</p>
            </Link>
          ))}
        </div>
      </SectionBlock>
    </PageShell>
  );
}

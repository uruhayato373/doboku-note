import { TOOLS } from "@/lib/tools";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import SectionBlock from "@/components/layout/SectionBlock";
import Link from "next/link";
import { BookOpen, FlaskConical, HardHat } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "無料ツール一覧｜土木・技術士の試験対策",
  description:
    "土木施工管理技士・技術士の受験対策とキャリア整理に使える無料Webツール集。過去問演習、施工経験記述の文字数、受験資格、経験の棚卸しなどをその場で使えます。",
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


const TOOL_GROUPS = [
  { id: 'exam', title: '受験・演習・キャリア', icon: BookOpen },
  { id: 'concrete', title: 'コンクリートの計算', icon: FlaskConical },
  { id: 'construction', title: '施工・安全・原価', icon: HardHat },
];
const toolGroup = (href: string) => /concrete-|water-content/.test(href) ? 'concrete' : /sling-|trench-|rebar-|cost-/.test(href) ? 'construction' : 'exam';
const FLOWS: Record<string, string> = {
  'kakomon-quiz': '年度・問題を選ぶ → 解答・復習', 'pe-first-stage': '科目・年度を選ぶ → 解答・復習',
  'juken-shikaku': '年齢・実務経験 → 受験資格', 'career-check': '工種・立場・経験 → 強みの整理',
  'keiken-charcount': '答案を入力 → 解答欄との字数比較', 'concrete-time-check': '外気温・時刻 → 時間の限度',
  'concrete-pump-plan': '打込み量・ルート → 台数・圧送距離', 'sling-tension': '荷重・角度 → 張力',
  'trench-legal-check': '深さ・地山 → 確認すべき基準', 'concrete-maturity': '気温・日数 → 積算温度',
  'rebar-splice-check': '径・寸法 → 継手の適合確認', 'cost-structure': '費用の内訳 → 構成比',
  'water-content': '水セメント比・セメント量 → 水量',
};

export default function ToolsIndexPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="860"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Tools" }]}
        title="無料ツール"
        lead="受験対策と現場の計算・確認に使える、その場で動く無料ツールをまとめています。すべて登録不要・無料です。"
      />

      <SectionBlock width="860" space="sm">
        <nav aria-label="ツールの用途" className="mb-8 flex flex-wrap gap-3">{TOOL_GROUPS.map(g=><a key={g.id} href={`#tools-${g.id}`} className="focus-ring rounded-card-inline border border-[var(--rule-soft)] px-4 py-3 text-sm text-[var(--ink)]">{g.title}</a>)}</nav>
        {TOOL_GROUPS.map(g => <section key={g.id} id={`tools-${g.id}`} className="mb-10 scroll-mt-24">
          <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-[var(--ink)]"><g.icon aria-hidden="true" size={24} />{g.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.filter(t => toolGroup(t.href) === g.id).map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="focus-ring card-surface-section group block p-5 transition-colors hover:border-[var(--accent)]"
            >
              <div className="inline-flex items-center font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] px-2 py-0.5 bg-[var(--accent-fill)] rounded-full mb-3">
                {t.tag}
              </div>
              <h3 className="font-bold text-[17px] text-[var(--ink)] group-hover:underline mb-1.5">{t.title}</h3>
              <p className="text-sm leading-6 text-[var(--ink-body)]">{t.desc}</p>
              <p className="mt-4 border-t border-[var(--rule-soft)] pt-3 text-sm font-medium text-[var(--accent)]">{FLOWS[t.href.split('/').at(-1)!]}</p>
            </Link>
          ))}
        </div>
        </section>)}
      </SectionBlock>
    </PageShell>
  );
}

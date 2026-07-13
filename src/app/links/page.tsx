import PageShell from "@/components/layout/PageShell";
import Link from "next/link";
import {
  ExternalLink,
  Compass,
  FileText,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";
import { AUTHOR } from "@/config/author";
import {
  getMagazine,
  buildMagazineUrl,
  NOTE_MAGAZINES,
  type MagazineId,
} from "@/lib/note-magazines";
import { examKeyOf } from "@/lib/exam-brand";

export const metadata: Metadata = {
  // title テンプレート "%s | doboku-note" がサイト名を付与するため、ここでは重ねない
  // （旧: "Links — doboku-note の入口" + テンプレ = サイト名二重だった）。
  title: "Links — SNS・note・サイトの入口",
  description:
    "発注者視点で土木・建設系資格の合格を支援。技術士総監・建設部門・1級／2級土木施工管理技士の無料サイト解説と、模範論文・施工経験記述・記述解答のフル教材（note）への入口まとめ。",
  alternates: {
    canonical: "https://doboku-note.com/links",
  },
  openGraph: {
    type: "website",
    title: "Links — doboku-note の入口",
    description:
      "発注者視点で土木・建設系資格の合格を支援。無料サイト解説と note フル教材への動線まとめ。",
    url: "https://doboku-note.com/links",
    images: [
      {
        url: "https://doboku-note.com/images/og-links.png",
        width: 1200,
        height: 630,
        alt: "doboku-note 試験対策コンテンツ一覧 — 技術士総監・1級土木・2級土木",
      },
    ],
  },
};

const UTM_BASE = "utm_source=links&utm_medium=referral&utm_campaign=link-hub";

function withUtm(url: string, content: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${UTM_BASE}&utm_content=${content}`;
}

const M2_FREE_NOTE_URL = withUtm(
  "https://note.com/dobokunote/n/n60efbccd728b",
  "m2-free-whitepaper",
);

const NOTE_MAGAZINE_LIST_URL = withUtm(
  "https://note.com/dobokunote/magazines",
  "all-magazines",
);

type FreeLink = {
  label: string;
  sub: string;
  href: string;
  external?: boolean;
};

// 試験別グルーピング: note-magazines.ts の published を自動追従（ハードコード配列を廃し陳腐化を防止）。
// 各試験は「無料入口(freeLinks) → 有料マガジン」の funnel で構成（試験ファースト）。
const EXAM_SECTIONS: {
  key: string;
  heading: string;
  sub: string;
  freeLinks: FreeLink[];
}[] = [
  {
    key: "tankan",
    heading: "技術士（総合技術監理部門）",
    sub: "650+語の無料キーワード辞書で土台を固め、記述式は型・設問3・予想・模範論文で仕上げる",
    freeLinks: [
      {
        label: "サイト試験ガイド（無料）",
        sub: "5管理 × 650+ キーワード解説、過去問 H21-R7 全 680 問",
        href: "/category/pe-comprehensive-management",
      },
      {
        label: "白書R7完全対応集（無料・note）",
        sub: "約34,000字、R08 総合復習の決定版",
        href: M2_FREE_NOTE_URL,
        external: true,
      },
    ],
  },
  {
    key: "pe-construction",
    heading: "技術士（建設部門）第二次試験",
    sub: "必須科目I・選択科目を発注者視点で全選択肢フル解答（設問全文の再掲つき）",
    freeLinks: [],
  },
  {
    key: "civil-1",
    heading: "1級土木施工管理技士",
    sub: "第1次・第2次の無料ガイドで全体像、施工経験記述はフル完成答案集で確実に",
    freeLinks: [
      {
        label: "サイト試験ガイド（無料）",
        sub: "第1次・第2次検定対策、過去問解説、教科書範囲の網羅",
        href: "/category/civil-construction-1",
      },
    ],
  },
  {
    key: "civil-2",
    heading: "2級土木施工管理技士",
    sub: "受験資格緩和で増えた若手向け。無料ガイド＋経験記述の完成答案集で初挑戦を支える",
    freeLinks: [
      {
        label: "サイト試験ガイド（無料）",
        sub: "受験資格緩和後の若手向け、過去問解説、経験記述ガイド",
        href: "/category/civil-construction-2",
      },
    ],
  },
];


// 総監の模範論文（職種別ペルソナ）は1エントリに集約。コア商品は個別表示。
function isPersonaEssay(id: string): boolean {
  return (
    /^essay-.+-(consultant|municipality)-magazine$/.test(id) ||
    id === "essay-general-contractor-magazine"
  );
}

// 総監コア商品の表示順（完全パックを先頭の強訴求に）。未定義は末尾。
const TANKAN_CORE_ORDER: string[] = [
  "essay-complete-pack",
  "tankan-reading-guide",
  "r8-essay-forecast",
  "setsumon3-policy-bank",
  "tradeoff-5kanri",
];

type PublishedMagazine = NonNullable<ReturnType<typeof getMagazine>>;

// 教材の「中身」を語る3本柱（差別化軸）。既存有料商品の共通価値を言語化。
const VALUE_PILLARS: {
  icon: typeof Compass;
  title: string;
  body: string;
}[] = [
  {
    icon: Compass,
    title: "発注者・採点者の目線",
    body: "出題者が何を評価するかを逆算。減点される書き方と、評価される書き方を具体的に示します。",
  },
  {
    icon: FileText,
    title: "骨子でなくフル答案",
    body: "模範論文・施工経験記述・記述解答を丸ごと収録。自分の現場に差し替える置換ガイド付き。",
  },
  {
    icon: Layers,
    title: "過去問を全網羅",
    body: "主要年度を全選択肢でカバー。A案／B案の併記と印刷用PDFで、どのお題が来ても対応できます。",
  },
];

function MagazineCard({
  mag,
  accent = false,
}: {
  mag: PublishedMagazine;
  accent?: boolean;
}) {
  return (
    <a
      href={buildMagazineUrl(mag, `link-hub-${mag.id}`)}
      target="_blank"
      rel="noopener noreferrer"
      className={
        accent
          ? "focus-ring block rounded-card-content bg-[var(--accent)] px-4 py-3.5 text-white shadow-soft transition-opacity hover:opacity-95"
          : "focus-ring card-surface-content block px-4 py-3 shadow-none transition-[border-color,box-shadow] hover:border-[var(--accent)] hover:shadow-soft"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {accent && (
            <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 rounded-full px-2 py-0.5 mb-1.5">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              いちばん人気・全部入り
            </div>
          )}
          <div
            className={
              accent
                ? "font-serif font-bold text-sm sm:text-base"
                : "font-serif font-bold text-[var(--ink)] text-sm sm:text-base"
            }
          >
            {mag.shortTitle ?? mag.title}
          </div>
          <div
            className={
              accent
                ? "text-xs opacity-95 mt-0.5 leading-snug"
                : "text-xs text-[var(--ink-muted)] mt-0.5 leading-snug"
            }
          >
            {mag.shortDescription ?? mag.description}
          </div>
        </div>
        <ExternalLink
          className={
            accent
              ? "w-4 h-4 shrink-0 mt-0.5"
              : "w-4 h-4 text-[var(--ink-muted)] shrink-0 mt-0.5"
          }
          aria-hidden="true"
        />
      </div>
      {mag.price && (
        <div
          className={
            accent
              ? "text-xs font-bold mt-2"
              : "text-xs font-bold text-[var(--accent)] mt-2"
          }
        >
          {mag.price}
        </div>
      )}
    </a>
  );
}

// 模範論文ペルソナ（職種別 全N本）を1エントリに集約し note マガジン一覧へ送客
function PersonaAggregateCard({ count }: { count: number }) {
  return (
    <a
      href={NOTE_MAGAZINE_LIST_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring card-surface-content flex items-center justify-between border-dashed px-4 py-3 shadow-none transition-[border-color,box-shadow] hover:border-[var(--accent)] hover:shadow-soft"
    >
      <div className="min-w-0 flex-1 pr-3">
        <div className="font-serif font-bold text-[var(--ink)] text-sm sm:text-base">
          職種別 模範論文（全{count}本）
        </div>
        <div className="text-xs text-[var(--ink-muted)] mt-0.5 leading-snug">
          ゼネコン・建設コンサル・自治体各課の発注者／受注者視点フル論文。自分の立場に最も近い1本を選べます
        </div>
      </div>
      <ExternalLink
        className="w-4 h-4 text-[var(--ink-muted)] shrink-0"
        aria-hidden="true"
      />
    </a>
  );
}

// 無料入口（サイトガイド・無料note）。accent ボーダーで「無料」を識別させる。
function FreeLinkCard({ link }: { link: FreeLink }) {
  const cls =
    "focus-ring flex items-center justify-between rounded-card-content border border-[var(--accent)] bg-[var(--accent-fill)] px-4 py-3 transition-shadow hover:shadow-soft";
  const body = (
    <>
      <div className="min-w-0 flex-1 pr-3">
        <div className="font-serif font-bold text-[var(--ink)] text-sm sm:text-base">
          {link.label}
        </div>
        <div className="text-xs text-[var(--ink-muted)] mt-0.5 leading-snug">
          {link.sub}
        </div>
      </div>
      <ExternalLink
        className="w-4 h-4 text-[var(--accent)] shrink-0"
        aria-hidden="true"
      />
    </>
  );
  return link.external ? (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <Link href={link.href} className={cls}>
      {body}
    </Link>
  );
}

// note-magazines.ts の published を試験別に自動グルーピング（ハードコード配列を廃し陳腐化を防止）。
function buildByExam(): Record<string, PublishedMagazine[]> {
  const byExam: Record<string, PublishedMagazine[]> = {};
  (Object.keys(NOTE_MAGAZINES) as MagazineId[]).forEach((id) => {
    const mag = getMagazine(id);
    if (!mag) return;
    (byExam[examKeyOf(id)] ??= []).push(mag);
  });
  return byExam;
}

function sectionHasContent(
  byExam: Record<string, PublishedMagazine[]>,
  key: string,
): boolean {
  const sec = EXAM_SECTIONS.find((s) => s.key === key);
  return (byExam[key]?.length ?? 0) > 0 || (sec?.freeLinks.length ?? 0) > 0;
}

// 1 試験ぶんのパネル（見出し + サブ + 無料入口→有料カード）。featured で内部 2 カラム化（総監=主力）。
function ExamPanel({
  secKey,
  byExam,
  featured = false,
}: {
  secKey: string;
  byExam: Record<string, PublishedMagazine[]>;
  featured?: boolean;
}) {
  const sec = EXAM_SECTIONS.find((s) => s.key === secKey);
  if (!sec) return null;
  const mags = byExam[secKey] ?? [];
  if (mags.length === 0 && sec.freeLinks.length === 0) return null;

  const isTankan = secKey === "tankan";
  const personas = isTankan ? mags.filter((m) => isPersonaEssay(m.id)) : [];
  const core = isTankan ? mags.filter((m) => !isPersonaEssay(m.id)) : mags;
  const ordered = isTankan
    ? [...core].sort(
        (a, b) =>
          (TANKAN_CORE_ORDER.indexOf(a.id) + 1 || 99) -
          (TANKAN_CORE_ORDER.indexOf(b.id) + 1 || 99),
      )
    : core;

  return (
    <div id={`exam-${secKey}`} className="scroll-mt-24">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-1 h-4 bg-[var(--accent)] rounded-full shrink-0"
          aria-hidden="true"
        />
        <h3 className="font-serif text-base font-bold text-[var(--ink)]">
          {sec.heading}
        </h3>
      </div>
      <p className="text-xs text-[var(--ink-body)] mb-3 pl-3 leading-relaxed">
        {sec.sub}
      </p>
      <div className={featured ? "grid sm:grid-cols-2 gap-3" : "space-y-3"}>
        {sec.freeLinks.map((link) => (
          <FreeLinkCard key={link.href} link={link} />
        ))}
        {ordered.map((mag) => (
          <MagazineCard
            key={mag.id}
            mag={mag}
            accent={mag.id === "essay-complete-pack"}
          />
        ))}
        {personas.length > 0 && <PersonaAggregateCard count={personas.length} />}
      </div>
    </div>
  );
}

// 総監=主力パネル（フル幅・内部2カラム）、建設/1級/2級=均等グリッド。
function ExamSections() {
  const byExam = buildByExam();
  const others = ["pe-construction", "civil-1", "civil-2"].filter((k) =>
    sectionHasContent(byExam, k),
  );
  const otherCols =
    others.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";

  return (
    <div className="space-y-10">
      {sectionHasContent(byExam, "tankan") && (
        <ExamPanel secKey="tankan" byExam={byExam} featured />
      )}
      {others.length > 0 && (
        <div
          className={`grid grid-cols-1 ${otherCols} gap-x-6 gap-y-8 items-start`}
        >
          {others.map((key) => (
            <ExamPanel key={key} secKey={key} byExam={byExam} />
          ))}
        </div>
      )}
    </div>
  );
}

// ヒーロー帯の試験チップ（該当セクションへジャンプ）。実コンテンツのある試験のみ描画。
const HERO_CHIPS: { label: string; key: string }[] = [
  { label: "技術士総監", key: "tankan" },
  { label: "建設部門", key: "pe-construction" },
  { label: "1級土木", key: "civil-1" },
  { label: "2級土木", key: "civil-2" },
];

export default function LinksPage() {
  const byExam = buildByExam();
  const chips = HERO_CHIPS.filter((c) => sectionHasContent(byExam, c.key));

  return (
    <PageShell variant="default" className="py-10 sm:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Hero band: アバター + 名乗り + キャッチ + 試験チップ（ジャンプ） */}
          <section className="card-surface-section mb-8 p-6 shadow-none sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-7">
              <img
                src={AUTHOR.imageUrl}
                alt={`${AUTHOR.name}のプロフィール画像`}
                width={112}
                height={112}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[var(--rule-soft)] shrink-0"
              />
              <div className="text-center sm:text-left min-w-0">
                <h1 className="font-serif text-2xl sm:text-3xl font-black text-[var(--ink)] mb-1.5">
                  doboku-note
                </h1>
                <p className="font-serif text-base sm:text-lg font-bold text-[var(--accent)] mb-1.5 leading-snug">
                  発注者の視点で、土木・建設系資格の「合格」へ最短ルートを。
                </p>
                <p className="text-sm text-[var(--ink-body)] leading-relaxed mb-4">
                  技術士（総監・建設部門）・1級／2級土木施工管理技士の試験対策ハブ
                  <br />
                  元・地方自治体 土木職（発注者）｜技術士2部門ほか多数の資格を保有する運営者
                </p>
                {chips.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {chips.map((chip) => (
                      <a
                        key={chip.key}
                        href={`#exam-${chip.key}`}
                        className="inline-flex items-center rounded-full border border-[var(--rule-soft)] px-3 py-1 text-xs font-bold text-[var(--ink-body)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                      >
                        {chip.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 価値提案 — なぜここで合格できるのか（中身） */}
          <section className="mb-12">
            <div className="card-surface-section mx-auto mb-5 max-w-3xl p-5 shadow-none">
              <p className="text-sm text-[var(--ink-body)] leading-relaxed mb-3">
                市販のテキストや過去問演習だけでは、記述式・経験記述の
                <strong className="text-[var(--ink)]">「合格答案の型」</strong>
                までは埋まりません。doboku-note
                は、発注者として計画・発注・監督・審査に携わり、
                <strong className="text-[var(--ink)]">
                  技術士2部門を含む資格を実際に取得した運営者
                </strong>
                が、出題者・採点者の評価軸から逆算して教材を作っています。
              </p>
              <p className="text-sm text-[var(--ink-body)] leading-relaxed">
                進め方はシンプル。まず
                <strong className="text-[var(--accent)]">無料のサイト解説</strong>
                で土台を固め、仕上げに
                <strong className="text-[var(--ink)]">note のフル教材</strong>
                で得点を取りに行く。下の「試験別コンテンツ」から、受験する試験を選んでください。
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {VALUE_PILLARS.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="card-surface-content flex items-start gap-3 px-4 py-3 shadow-none sm:flex-col"
                  >
                    <div className="w-9 h-9 rounded-full bg-[var(--accent-fill)] flex items-center justify-center shrink-0">
                      <Icon
                        className="w-4 h-4 text-[var(--accent)]"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-serif font-bold text-[var(--ink)] text-sm">
                        {p.title}
                      </div>
                      <div className="text-xs text-[var(--ink-muted)] mt-0.5 leading-relaxed">
                        {p.body}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 試験別: 無料入口 → 有料教材（試験ファースト funnel） */}
          <section className="mb-12">
            <h2 className="font-serif text-xl font-bold text-[var(--ink)] mb-1 text-center">
              試験別コンテンツ
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mb-8 text-center leading-relaxed">
              受験する試験を選択。
              <span className="text-[var(--accent)] font-bold">色付きの無料ガイド</span>
              で全体像をつかみ、必要に応じて note 教材で記述・経験記述を仕上げる流れがおすすめです
            </p>

            <ExamSections />
          </section>

          {/* 運営者 + SNS（PC では 2 カラム） */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h2 className="font-serif text-base font-bold text-[var(--ink)] mb-1">
                運営者
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mb-3">
                どんな人が運営しているか知りたい方へ
              </p>
              <Link
                href="/about"
                className="focus-ring card-surface-content flex items-center justify-between px-4 py-3 shadow-none transition-[border-color,box-shadow] hover:border-[var(--accent)] hover:shadow-soft"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="font-serif font-bold text-[var(--ink)] text-sm sm:text-base">
                    運営者プロフィール
                  </div>
                  <div className="text-xs text-[var(--ink-muted)] mt-0.5 leading-snug">
                    {AUTHOR.jobTitle}。編集方針・保有資格の詳細はこちら
                  </div>
                </div>
                <ArrowRight
                  className="w-4 h-4 text-[var(--ink-muted)] shrink-0"
                  aria-hidden="true"
                />
              </Link>
            </div>

            <div>
              <h2 className="font-serif text-base font-bold text-[var(--ink)] mb-1">
                SNS
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mb-3">
                学習仲間との交流や最新情報・試験季節リマインダーが欲しい方へ
              </p>
              <a
                href={AUTHOR.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring card-surface-content flex items-center justify-between px-4 py-3 shadow-none transition-[border-color,box-shadow] hover:border-[var(--accent)] hover:shadow-soft"
              >
                <div>
                  <div className="font-serif font-bold text-[var(--ink)] text-sm sm:text-base">
                    X (旧 Twitter)
                  </div>
                  <div className="text-xs text-[var(--ink-muted)] mt-0.5 leading-snug">
                    @dobokunotecom｜試験対策・受験生コミュニティ
                  </div>
                </div>
                <ExternalLink
                  className="w-4 h-4 text-[var(--ink-muted)] shrink-0"
                  aria-hidden="true"
                />
              </a>
            </div>
          </section>
        </div>
    </PageShell>
  );
}

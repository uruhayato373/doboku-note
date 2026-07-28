import PageShell from "@/components/layout/PageShell";
import Link from "next/link";
import Image from "next/image";
import {
  ExternalLink,
  Compass,
  FileText,
  Layers,
  ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";
import { AUTHOR } from "@/config/author";
import { EXAM_BRAND, type ExamKey } from "@/lib/exam-brand";
import { pickCoconalaFor, pickBrainFor } from "@/lib/exam-key-bridge";
import { mokujiFor } from "@/lib/note-mokuji";
import ServiceIcon, { type ServiceChannel } from "@/components/icons/ServiceIcon";

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

/**
 * 資格カード（2026-07-28 再設計）。
 *
 * 旧構成は「試験別にマガジンを全件列挙 → ページ末尾にココナラ14件・Brain2件を独立セクション」で、
 * チャネルが資格から切り離されて混在し、SNS bio から来た人が自分に関係する導線を選べなかった。
 * カードは **役割を固定した 3 行**（①サイトで無料学習 ②note もくじ ③個別サービス）に畳む。
 * 関与度の順に並ぶので、資格をまたいでも同じ位置に同じ性質のリンクが来る。
 *
 * マガジンの個別列挙は **note の L2 もくじへ集約して廃止**した（商品が増えても改修不要）。
 */
type ExamCard = {
  /** exam-brand.ts の ExamKey（ラベル・テーマ色・背景イラストの解決に使う）。 */
  key: ExamKey;
  /** カード見出し（EXAM_BRAND.label より具体的な正式名）。 */
  heading: string;
  /** 見出し下の 1 行。誰向け・何が置いてあるか。 */
  tagline: string;
  /** ①「サイトで無料学習」の行。 */
  site: { label: string; sub: string; href: string };
};

const EXAM_CARDS: ExamCard[] = [
  {
    key: "tankan",
    heading: "技術士（総合技術監理部門）",
    tagline: "択一・記述・口頭の全体を、無料キーワード集から仕上げまで",
    site: {
      label: "キーワード集を読む",
      sub: "650+ 語の解説と過去問 H21-R7 を全問公開",
      href: "/category/pe-comprehensive-management",
    },
  },
  {
    key: "pe-construction",
    heading: "技術士（建設部門）第二次試験",
    tagline: "必須科目I・選択科目を発注者視点でフル解答",
    site: {
      label: "サイトで無料学習",
      sub: "出題テーマの整理と論述の型",
      href: "/category/pe-construction",
    },
  },
  {
    key: "civil-1",
    heading: "1級土木施工管理技士",
    tagline: "一次・二次の対策と、施工経験記述の完成答案",
    site: {
      label: "サイトで無料学習",
      sub: "過去問・テキスト・要点を全公開",
      href: "/category/civil-construction-1",
    },
  },
  {
    key: "civil-2",
    heading: "2級土木施工管理技士",
    tagline: "受験資格の緩和で増えた若手の初挑戦を支える",
    site: {
      label: "サイトで無料学習",
      sub: "過去問解説と経験記述の書き方",
      href: "/category/civil-construction-2",
    },
  },
];

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

/** カード内の 1 行（アイコン + リンク名 + チャネル小ラベル + 特徴 1 行）。 */
function CardRow({
  channel,
  label,
  sub,
  href,
  external,
  channelLabel,
}: {
  channel: ServiceChannel;
  label: string;
  sub: string;
  href: string;
  external?: boolean;
  channelLabel?: string;
}) {
  const inner = (
    <>
      <ServiceIcon channel={channel} />
      <span className="min-w-0">
        <span className="block text-sm text-brand group-hover:underline">
          {label}
          {channelLabel && (
            <span className="ml-1.5 text-[10px] text-[var(--ink-muted)]">{channelLabel}</span>
          )}
        </span>
        {/* 商品カタログの description は 170〜210 字あり、そのまま出すと 1 行だけ極端に高くなる
            （実測 220px）。一覧は走査が目的なので 2 行で打ち切り、全カードの行高を揃える。 */}
        <span
          className="mt-0.5 block overflow-hidden text-xs leading-relaxed text-[var(--ink-muted)]"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
        >
          {sub}
        </span>
      </span>
    </>
  );
  const cls =
    'focus-ring group flex gap-2.5 border-b border-[var(--rule-soft)] py-2.5 last:border-b-0';
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

/**
 * 資格カード 1 枚。頭に資格ブランドの帯（cta-bg イラスト or テーマ色）を敷き、
 * 中身は役割固定の 3 行。③ 個別サービスは資格に紐づく listed が無ければ行ごと省略する
 * （建設部門はココナラ・Brain とも 0 件）。
 */
function ExamCardView({ card }: { card: ExamCard }) {
  const brand = EXAM_BRAND[card.key];
  const mokuji = mokujiFor(card.key);
  const coconala = pickCoconalaFor(card.key);
  const brain = pickBrainFor(card.key);

  return (
    <div className="card-surface-content overflow-hidden p-0">
      <div
        className="relative flex h-[84px] items-end p-3"
        style={{ backgroundColor: `var(${brand.themeVar})` }}
      >
        {brand.ctaBg && (
          <Image
            src={brand.ctaBg}
            alt=""
            fill
            sizes="(min-width: 640px) 360px, 100vw"
            className="object-cover object-[center_35%] opacity-90"
          />
        )}
        <div className="relative">
          <div className="font-serif text-[15px] font-bold text-white drop-shadow-sm">{card.heading}</div>
          <div className="mt-0.5 text-[11px] leading-snug text-white/90 drop-shadow-sm">{card.tagline}</div>
        </div>
      </div>
      <div className="px-3 py-1">
        <CardRow channel="site" label={card.site.label} sub={card.site.sub} href={card.site.href} />
        {mokuji && (
          <CardRow
            channel="note"
            channelLabel="note"
            label={mokuji.title}
            sub="有料教材の一覧。どれから読むかがわかる"
            href={withUtm(mokuji.noteUrl, `mokuji-${card.key}`)}
            external
          />
        )}
        {coconala && (
          <CardRow
            channel="coconala"
            channelLabel="ココナラ"
            label={coconala.shortTitle ?? coconala.title}
            sub={coconala.description}
            href={coconala.serviceUrl}
            external
          />
        )}
        {!coconala && brain && (
          <CardRow
            channel="brain"
            channelLabel="Brain"
            label={brain.shortTitle ?? brain.title}
            sub={brain.description}
            href={brain.productUrl}
            external
          />
        )}
      </div>
    </div>
  );
}

/** チャネルが何をくれるかの凡例。ページ内に 1 度だけ置く。 */
const CHANNEL_LEGEND: { channel: ServiceChannel; name: string; what: string }[] = [
  { channel: 'site', name: 'サイト', what: '無料。まず読む' },
  { channel: 'note', name: 'note', what: '答案・予想問題を読む' },
  { channel: 'coconala', name: 'ココナラ', what: '自分の答案を見てもらう' },
  { channel: 'brain', name: 'Brain', what: '作業キットを手に入れる' },
];

function ChannelLegend() {
  return (
    <div className="card-surface-content px-4 py-3">
      {CHANNEL_LEGEND.map((c) => (
        <div key={c.channel} className="flex items-center gap-2.5 py-1">
          <ServiceIcon channel={c.channel} />
          <span className="text-xs">
            <span className="text-[var(--ink)]">{c.name}</span>
            <span className="text-[var(--ink-muted)]"> — {c.what}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function ExamSections() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {EXAM_CARDS.map((card) => (
        <div key={card.key} id={`exam-${card.key}`} className="scroll-mt-24">
          <ExamCardView card={card} />
        </div>
      ))}
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
  // チップはカード定義から導出する（旧: マガジン件数で出し分け。カード化で常に中身があるため不要）。
  const chips = HERO_CHIPS.filter((c) => EXAM_CARDS.some((card) => card.key === c.key));

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

          {/* チャネル凡例: 各サービスが何をくれるかを 1 度だけ示す。
              カード内はアイコン＋小ラベルだけなので、意味づけはここで担保する。 */}
          <section className="mb-12">
            <h2 className="font-serif text-base font-bold text-[var(--ink)] mb-1">
              それぞれで得られるもの
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mb-3">
              カード内のリンクは、上から「読む → 揃える → 見てもらう」の順に並んでいます
            </p>
            <ChannelLegend />
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

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { AUTHOR } from "@/config/author";
import {
  getMagazine,
  buildMagazineUrl,
  type MagazineId,
} from "@/lib/note-magazines";

export const metadata: Metadata = {
  title: "Links — doboku-note の入口",
  description:
    "技術士総監・1級土木の試験対策コンテンツ入口まとめ。無料 note 記事・有料マガジン・サイト試験ガイド・X アカウントへの動線。",
  alternates: {
    canonical: "https://doboku-note.com/links",
  },
  openGraph: {
    type: "website",
    title: "Links — doboku-note の入口",
    description:
      "技術士総監・1級土木の試験対策。無料 note・有料マガジン・サイトハブ・X への動線まとめ。",
    url: "https://doboku-note.com/links",
    images: [
      {
        url: "https://doboku-note.com/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "doboku-note Links",
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

const PAID_MAGAZINE_IDS: MagazineId[] = [
  "tankan-reading-guide",
  "essay-general-contractor-magazine",
  "essay-river-consultant-magazine",
  "essay-road-municipality-magazine",
  "r8-essay-forecast",
  "setsumon3-policy-bank",
  "tradeoff-5kanri",
];

export default function LinksPage() {
  const paidMagazines = PAID_MAGAZINE_IDS.map((id) => getMagazine(id)).filter(
    (m): m is NonNullable<typeof m> => m !== null,
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] transition-colors duration-300">
      <Header />

      <main className="flex-grow py-10 sm:py-14">
        <div className="max-w-[600px] mx-auto px-4 sm:px-6">
          {/* Profile Hero */}
          <section className="text-center mb-8">
            <img
              src={AUTHOR.imageUrl}
              alt={`${AUTHOR.name}のプロフィール画像`}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-[var(--rule-soft)]"
            />
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-[var(--ink)] mb-2">
              doboku-note
            </h1>
            <p className="text-sm text-[var(--ink-body)] leading-relaxed">
              技術士総監・1級土木の試験対策ハブ
              <br />
              元・地方自治体土木職（発注者）／6資格保有の運営
            </p>
          </section>

          {/* 導入文：このページについて */}
          <section className="mb-10 bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section p-5 text-sm text-[var(--ink-body)] leading-relaxed">
            <p className="mb-3">
              発注者として培った実務経験と6資格の受験知見をもとに、
              <strong className="text-[var(--ink)]">
                技術士（総合技術監理部門）・1級土木施工管理技士
              </strong>
              の合格を支援しています。
            </p>
            <p className="mb-3">
              本サイト doboku-note.com は<strong className="text-[var(--ink)]">体系的な技術解説とキーワード辞書</strong>を無料で公開し、
              note では<strong className="text-[var(--ink)]">模範論文・予想問題・5管理精読ガイド</strong>などの試験直結教材を提供しています。
            </p>
            <p>
              下のリンクから、目的に合うコンテンツへどうぞ。まずは
              <strong className="text-[var(--accent)]">完全無料の『白書R7完全対応集』</strong>
              から読むのがおすすめです。
            </p>
          </section>

          {/* Featured: M2 完全無料リード磁石 */}
          <section className="mb-10">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] mb-2 text-center">
              Featured — 完全無料
            </p>
            <p className="text-xs text-[var(--ink-muted)] mb-3 text-center">
              まず全体像と R08 出題予測をつかみたい方へ
            </p>
            <a
              href={M2_FREE_NOTE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[var(--accent)] text-white rounded-card-section p-5 sm:p-6 hover:opacity-90 transition-opacity text-center shadow-soft"
            >
              <div className="font-serif font-bold text-lg sm:text-xl mb-1.5">
                白書R7完全対応集
              </div>
              <div className="text-sm opacity-95 leading-relaxed">
                完全無料・約34,000字
                <br />
                R08総合復習の決定版
              </div>
            </a>
          </section>

          {/* note 有料マガジン */}
          <section className="mb-10">
            <h2 className="font-serif text-lg font-bold text-[var(--ink)] mb-1 text-center">
              note 有料マガジン
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mb-4 text-center">
              論点整理・模範論文・予想問題で合格を確実にしたい方へ
            </p>
            <div className="space-y-3">
              {paidMagazines.map((mag) => (
                <a
                  key={mag.id}
                  href={buildMagazineUrl(mag, `link-hub-${mag.id}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-content px-4 py-3 hover:border-[var(--accent)] hover:shadow-soft transition-all"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-serif font-bold text-[var(--ink)] text-sm sm:text-base">
                      {mag.shortTitle ?? mag.title}
                    </div>
                    <div className="text-xs text-[var(--ink-muted)] mt-0.5 leading-snug">
                      {mag.shortDescription ?? mag.description}
                    </div>
                  </div>
                  <ExternalLink
                    className="w-4 h-4 text-[var(--ink-muted)] shrink-0"
                    aria-hidden="true"
                  />
                </a>
              ))}
            </div>
          </section>

          {/* 無料サイトコンテンツ */}
          <section className="mb-10">
            <h2 className="font-serif text-lg font-bold text-[var(--ink)] mb-1 text-center">
              無料サイトコンテンツ
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mb-4 text-center">
              キーワード・過去問を辞書として日常学習に使いたい方へ
            </p>
            <div className="space-y-3">
              <Link
                href="/category/pe-comprehensive-management"
                className="block bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-content px-4 py-3 hover:border-[var(--accent)] hover:shadow-soft transition-all"
              >
                <div className="font-serif font-bold text-[var(--ink)] text-sm sm:text-base">
                  技術士（総合技術監理部門）試験ガイド
                </div>
                <div className="text-xs text-[var(--ink-muted)] mt-0.5 leading-snug">
                  5管理 × 600+ キーワード、過去問 H21-R7 全 680 問解説
                </div>
              </Link>
              <Link
                href="/category/civil-construction-1"
                className="block bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-content px-4 py-3 hover:border-[var(--accent)] hover:shadow-soft transition-all"
              >
                <div className="font-serif font-bold text-[var(--ink)] text-sm sm:text-base">
                  1級土木施工管理技士 試験ガイド
                </div>
                <div className="text-xs text-[var(--ink-muted)] mt-0.5 leading-snug">
                  第1次・第2次検定対策、過去問解説、教科書範囲の網羅
                </div>
              </Link>
              <Link
                href="/category/civil-construction-2"
                className="block bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-content px-4 py-3 hover:border-[var(--accent)] hover:shadow-soft transition-all"
              >
                <div className="font-serif font-bold text-[var(--ink)] text-sm sm:text-base">
                  2級土木施工管理技士 試験ガイド
                </div>
                <div className="text-xs text-[var(--ink-muted)] mt-0.5 leading-snug">
                  受験資格緩和後の若手向け、過去問解説、経験記述ガイド
                </div>
              </Link>
              <Link
                href="/about"
                className="block bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-content px-4 py-3 hover:border-[var(--accent)] hover:shadow-soft transition-all"
              >
                <div className="font-serif font-bold text-[var(--ink)] text-sm sm:text-base">
                  運営者プロフィール
                </div>
                <div className="text-xs text-[var(--ink-muted)] mt-0.5 leading-snug">
                  発注者退職・6 資格保有の運営者について
                </div>
              </Link>
            </div>
          </section>

          {/* SNS */}
          <section>
            <h2 className="font-serif text-lg font-bold text-[var(--ink)] mb-1 text-center">
              SNS
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mb-4 text-center">
              学習仲間との交流や最新情報・試験季節リマインダーが欲しい方へ
            </p>
            <div className="space-y-3">
              <a
                href={AUTHOR.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-content px-4 py-3 hover:border-[var(--accent)] hover:shadow-soft transition-all"
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
      </main>

      <Footer />
    </div>
  );
}

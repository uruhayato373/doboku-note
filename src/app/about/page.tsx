import Link from "next/link";
import {
  BookOpen,
  FileText,
  GraduationCap,
  CheckCircle,
  Target,
  Search,
} from "lucide-react";
import type { Metadata } from "next";
import { AUTHOR } from "@/config/author";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import SectionBlock from "@/components/layout/SectionBlock";
import SectionCard from "@/components/ui/SectionCard/SectionCard";
import AuthorProfile from "@/components/ui/AuthorProfile/AuthorProfile";

export const metadata: Metadata = {
  // title template `%s | doboku-note` で自動付与されるため "doboku-note" を重ねない
  title: "1級土木施工管理技士・技術士 試験対策サイトについて",
  description:
    "doboku-noteは1級土木施工管理技士・技術士の受験者向け技術ノート・試験対策サイトです。過去問解説・キーワード解説・勉強方法を提供。",
  openGraph: {
    type: "website",
    title: "doboku-noteについて — 1級土木施工管理技士・技術士 試験対策サイト",
    description:
      "doboku-noteは1級土木施工管理技士・技術士の受験者向け技術ノート・試験対策サイトです。",
    url: "https://doboku-note.com/about",
    images: [
      {
        url: "https://doboku-note.com/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "doboku-note - 土木系資格試験 専門技術ノート",
      },
    ],
  },
};

export default function AboutPage() {
  return (
    <PageShell variant="default">
      {/* Hero Section — editorial */}
      <SectionBlock band space="lg" width="wide">
        <PageHeader
          variant="inline"
          breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}
          label="About"
          title="doboku-note"
          lead={
            <>
              <strong className="text-[var(--ink)]">1級土木施工管理技士</strong>・<strong className="text-[var(--ink)]">技術士（総合技術監理部門）</strong>の受験者に向けて、体系的な技術解説・過去問分析・勉強方法を提供する試験対策サイトです。
            </>
          }
        />
        <p className="mt-5 italic text-[15px] text-[var(--accent)] max-w-[60ch]">
          <strong className="not-italic font-bold text-[var(--ink)]">橋を架ける。</strong>受験者と合格のあいだに、実務と試験のあいだに、現役と次世代のあいだに。
        </p>
      </SectionBlock>

      {/* Author Profile Section */}
      <SectionBlock width="wide" space="md">
        <h2 className="font-serif text-2xl sm:text-3xl font-black text-[var(--ink)] mb-8">
          運営者プロフィール
        </h2>
        <AuthorProfile variant="wide" showNoteCta={false} />
        <SectionCard as="div" className="mt-6">
          <div>
            <h4 className="text-sm font-bold text-[var(--ink-body)] mb-2">
              編集方針
            </h4>
            <ul className="text-sm text-[var(--ink-muted)] space-y-2">
              <li>
                ・出題範囲を体系的に整理し、実務での適用例を必ず併記する
              </li>
              <li>
                ・公式試験機関の公表内容（過去問・正答）を一次情報として参照する
              </li>
              <li>
                ・誤りを発見した場合はXまたは問い合わせフォームから連絡を受け付け、可能な限り速やかに修正する
              </li>
              <li>
                ・キーワード解説は実務経験に基づく具体例を意識して執筆する
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-6 border-t border-[var(--rule-soft)]">
            <h4 className="text-sm font-bold text-[var(--ink-body)] mb-2">
              今後の展開
            </h4>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
              現在は<strong>1級土木施工管理技士</strong>・<strong>技術士（総合技術監理部門）</strong>を中心にコンテンツを整備していますが、運営者が取得してきた<strong>技術士（建設部門）・コンクリート主任技士・コンクリート診断士・1級舗装施工管理技術者・行政書士・応用情報技術者</strong>などの受験経験を活かし、土木・建設・法務・IT にまたがる多様な資格試験の対策コンテンツを順次展開していく予定です。
            </p>
          </div>
        </SectionCard>
      </SectionBlock>

      {/* Mission Section */}
      <section className="py-12 bg-[var(--paper)] border-y border-[var(--rule-soft)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-6">
            サイトコンセプト
          </h2>
          <div className="bg-[var(--bg)] border border-[var(--rule-soft)] rounded-card-content p-6">
            <p className="text-xl font-bold text-[var(--accent)] mb-4">
              「ここだけで合格できる」体験を
            </p>
            <div className="space-y-3 text-left max-w-2xl mx-auto">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-[var(--accent)] shrink-0 mt-1" />
                <p className="text-[var(--ink-body)]">
                  <strong>体系的</strong> → 試験範囲を網羅した技術解説
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-[var(--accent)] shrink-0 mt-1" />
                <p className="text-[var(--ink-body)]">
                  <strong>実践的</strong> → 過去問の傾向分析と得点戦略
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-[var(--accent)] shrink-0 mt-1" />
                <p className="text-[var(--ink-body)]">
                  <strong>効率的</strong> → 忙しい実務者でも合格できる学習法
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Categories Section */}
      <section className="py-16 bg-[var(--paper)] border-y border-[var(--rule-soft)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[var(--ink)] text-center mb-2">
            対応試験
          </h2>
          <p className="text-[var(--ink-muted)] text-center mb-12">
            土木系の主要資格試験をカバー
          </p>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* 1級土木施工管理技士 */}
            <div>
              <h3 className="text-xl font-bold text-[var(--accent)] text-center mb-6">
                1級土木施工管理技士
              </h3>
              <div className="space-y-4">
                <div className="bg-[var(--bg)] border border-[var(--rule-soft)] rounded-card-content p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent)]">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--ink)] mb-1">
                        試験ガイド・勉強法
                      </h4>
                      <p className="text-sm text-[var(--ink-muted)]">
                        出題傾向、得点戦略、学習スケジュール
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[var(--bg)] border border-[var(--rule-soft)] rounded-card-content p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent)]">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--ink)] mb-1">
                        過去問解説
                      </h4>
                      <p className="text-sm text-[var(--ink-muted)]">
                        第1次・第2次検定の過去問を詳細解説
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[var(--bg)] border border-[var(--rule-soft)] rounded-card-content p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent)]">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--ink)] mb-1">
                        技術解説
                      </h4>
                      <p className="text-sm text-[var(--ink-muted)]">
                        土工・コンクリート・基礎工・施工管理
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 技術士 */}
            <div>
              <h3 className="text-xl font-bold text-[var(--accent)] text-center mb-6">
                技術士（総合技術監理部門）
              </h3>
              <div className="space-y-4">
                <div className="bg-[var(--bg)] border border-[var(--rule-soft)] rounded-card-content p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent)]">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--ink)] mb-1">
                        5つの管理分野
                      </h4>
                      <p className="text-sm text-[var(--ink-muted)]">
                        経済性管理・人的資源管理・情報管理・安全管理・社会環境管理
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[var(--bg)] border border-[var(--rule-soft)] rounded-card-content p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent)]">
                      <Search className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--ink)] mb-1">
                        キーワード解説
                      </h4>
                      <p className="text-sm text-[var(--ink-muted)]">
                        試験頻出キーワードを体系的に整理
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-[var(--bg)] border border-[var(--rule-soft)] rounded-card-content p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent)]">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--ink)] mb-1">
                        過去問・模擬問題
                      </h4>
                      <p className="text-sm text-[var(--ink-muted)]">
                        択一式・記述式の過去問を年度別に解説
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Start Learning Section */}
      <SectionBlock width="wide" space="md" divider="top">
        <h2 className="font-serif text-2xl sm:text-3xl font-black text-[var(--ink)] mb-3">
          学習を始める
        </h2>
        <p className="text-[15px] text-[var(--ink-body)] mb-6">
          まずは各試験のカテゴリ目次から、必要な分野にアクセスしてください。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/category/civil-construction-1"
            className="block bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section p-5 hover:border-[var(--accent)] hover:shadow-soft transition-all font-serif font-bold text-[var(--ink)] text-lg"
          >
            1級土木施工管理技士 →
          </Link>
          <Link
            href="/category/civil-construction-2"
            className="block bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section p-5 hover:border-[var(--accent)] hover:shadow-soft transition-all font-serif font-bold text-[var(--ink)] text-lg"
          >
            2級土木施工管理技士 →
          </Link>
          <Link
            href="/category/pe-comprehensive-management"
            className="block bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section p-5 hover:border-[var(--accent)] hover:shadow-soft transition-all font-serif font-bold text-[var(--ink)] text-lg"
          >
            技術士（総合技術監理部門） →
          </Link>
        </div>
      </SectionBlock>

      {/* Contact Section */}
      <SectionBlock width="wide" space="md" divider="top">
        <h2 className="font-serif text-2xl sm:text-3xl font-black text-[var(--ink)] mb-3">お問い合わせ</h2>
        <p className="text-[15px] text-[var(--ink-body)] mb-6">
          ご質問やご意見がございましたらお気軽にお問い合わせください。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2.5 rounded-card-content font-medium hover:opacity-90 transition-opacity"
          >
            お問い合わせフォーム
          </Link>
          <a
            href={AUTHOR.twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-[var(--rule-soft)] text-[var(--ink-body)] px-5 py-2.5 rounded-card-content font-medium hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            Xでフォロー
          </a>
        </div>
      </SectionBlock>
    </PageShell>
  );
}

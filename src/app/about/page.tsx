import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
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

export const metadata: Metadata = {
  title: "doboku-noteについて｜1級土木施工管理技士 試験対策サイト",
  description:
    "doboku-noteは1級土木施工管理技士・技術士の受験者向け技術ノート・試験対策サイトです。過去問解説・キーワード解説・勉強方法を提供。",
  openGraph: {
    title: "doboku-noteについて｜1級土木施工管理技士 試験対策サイト",
    description:
      "doboku-noteは1級土木施工管理技士・技術士の受験者向け技術ノート・試験対策サイトです。",
    url: "https://doboku-note.com/about",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary-50 via-white to-cyan-50 dark:from-primary-950 dark:via-gray-900 dark:to-cyan-950 py-16 lg:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-8 leading-tight text-gray-900 dark:text-gray-100">
              doboku-note
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              土木系資格試験 専門技術ノート
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-4xl mx-auto leading-relaxed">
              1級土木施工管理技士・技術士（総合技術監理部門）の受験者に向けて、体系的な技術解説・過去問分析・勉強方法を提供する試験対策サイトです。
            </p>
          </div>
        </section>

        {/* Author Profile Section */}
        <section className="py-12 bg-white dark:bg-gray-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-gray-100 text-center mb-8">
              運営者プロフィール
            </h2>
            <div className="bg-neutral-50 dark:bg-gray-900 border border-neutral-200 dark:border-gray-700 rounded-lg p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <img
                  src={AUTHOR.imageUrl}
                  alt={`${AUTHOR.name}のプロフィール画像`}
                  width={120}
                  height={120}
                  className="w-28 h-28 rounded-full border-2 border-primary-200 dark:border-primary-800 mx-auto sm:mx-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-gray-100">
                    {AUTHOR.name}
                  </h3>
                  <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
                    {AUTHOR.jobTitle}
                  </p>
                  <p className="mt-4 text-neutral-700 dark:text-gray-300 leading-relaxed">
                    {AUTHOR.bio}
                  </p>
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-neutral-700 dark:text-gray-300 mb-2">
                      保有資格・受験予定
                    </h4>
                    <ul className="space-y-1">
                      {AUTHOR.qualifications.map((q) => (
                        <li
                          key={q}
                          className="text-sm text-neutral-600 dark:text-gray-400 flex items-start gap-2"
                        >
                          <CheckCircle className="w-4 h-4 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-gray-700">
                <h4 className="text-sm font-bold text-neutral-700 dark:text-gray-300 mb-2">
                  編集方針
                </h4>
                <ul className="text-sm text-neutral-600 dark:text-gray-400 space-y-2">
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
              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-gray-700">
                <h4 className="text-sm font-bold text-neutral-700 dark:text-gray-300 mb-2">
                  今後の展開
                </h4>
                <p className="text-sm text-neutral-600 dark:text-gray-400 leading-relaxed">
                  現在は<strong>1級土木施工管理技士</strong>・<strong>技術士（総合技術監理部門）</strong>を中心にコンテンツを整備していますが、運営者が取得してきた<strong>コンクリート主任技士・コンクリート診断士・技術士（建設部門）・行政書士・応用情報技術者</strong>などの受験経験を活かし、土木・建設・法務・IT にまたがる多様な資格試験の対策コンテンツを順次展開していく予定です。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-12 bg-white dark:bg-gray-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-gray-100 mb-6">
              サイトコンセプト
            </h2>
            <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-6">
              <p className="text-xl font-bold text-primary-600 dark:text-primary-400 mb-4">
                「ここだけで合格できる」体験を
              </p>
              <div className="space-y-3 text-left max-w-2xl mx-auto">
                <div className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">
                    ✓
                  </span>
                  <p className="text-neutral-700 dark:text-gray-300">
                    <strong>体系的</strong> → 試験範囲を網羅した技術解説
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">
                    ✓
                  </span>
                  <p className="text-neutral-700 dark:text-gray-300">
                    <strong>実践的</strong> → 過去問の傾向分析と得点戦略
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">
                    ✓
                  </span>
                  <p className="text-neutral-700 dark:text-gray-300">
                    <strong>効率的</strong> → 忙しい実務者でも合格できる学習法
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Categories Section */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-gray-100 text-center mb-2">
              対応試験
            </h2>
            <p className="text-neutral-600 dark:text-gray-400 text-center mb-12">
              土木系の主要資格試験をカバー
            </p>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* 1級土木施工管理技士 */}
              <div>
                <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400 text-center mb-6">
                  1級土木施工管理技士
                </h3>
                <div className="space-y-4">
                  <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary-600 dark:bg-primary-500 w-12 h-12 rounded flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-gray-100 mb-1">
                          試験ガイド・勉強法
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400">
                          出題傾向、得点戦略、学習スケジュール
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary-600 dark:bg-primary-500 w-12 h-12 rounded flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-gray-100 mb-1">
                          過去問解説
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400">
                          第1次・第2次検定の過去問を詳細解説
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary-600 dark:bg-primary-500 w-12 h-12 rounded flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-gray-100 mb-1">
                          技術解説
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400">
                          土工・コンクリート・基礎工・施工管理
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 技術士 */}
              <div>
                <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 text-center mb-6">
                  技術士（総合技術監理部門）
                </h3>
                <div className="space-y-4">
                  <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-cyan-600 dark:bg-cyan-500 w-12 h-12 rounded flex items-center justify-center flex-shrink-0">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-gray-100 mb-1">
                          5つの管理分野
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400">
                          経済性管理・人的資源管理・情報管理・安全管理・社会環境管理
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-cyan-600 dark:bg-cyan-500 w-12 h-12 rounded flex items-center justify-center flex-shrink-0">
                        <Search className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-gray-100 mb-1">
                          キーワード解説
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400">
                          試験頻出キーワードを体系的に整理
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-cyan-600 dark:bg-cyan-500 w-12 h-12 rounded flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-gray-100 mb-1">
                          過去問・模擬問題
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400">
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

        {/* Contact Section */}
        <section className="py-16 bg-gradient-to-r from-primary-600 to-cyan-500 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-6">お問い合わせ</h2>
            <p className="text-xl mb-8 text-primary-100">
              ご質問やご意見がございましたらお気軽にお問い合わせください。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://twitter.com/doboku_note"
                className="bg-white text-primary-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105"
              >
                Xでフォロー
              </a>
              <Link
                href="/docs/civil-construction-1-guide-strategy"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-primary-600 transition-all"
              >
                学習を始める
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

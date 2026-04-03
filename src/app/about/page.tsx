import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import {
  Briefcase,
  DollarSign,
  Target,
  Dumbbell,
  Shirt,
  Coffee,
} from "lucide-react";
import type { Metadata } from "next";

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
              KAKKOMU（カッコム）
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              カッコいい公務員を目指して
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-4xl mx-auto leading-relaxed">
              「シゴデキ（仕事ができる）×
              イケオジ（イケてるおじさん）」をテーマに、40代の公務員が実践できる、仕事・副業・キャリア・美容・健康・ライフスタイルの情報を発信しています。
            </p>
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
                「40代公務員の、もう一歩先へ」
                <br />
                <span className="text-base">
                  〜安定の先に、あなたらしい人生を〜
                </span>
              </p>
              <div className="space-y-3 text-left max-w-2xl mx-auto">
                <div className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">
                    ✓
                  </span>
                  <p className="text-neutral-700 dark:text-gray-300">
                    <strong>実践的</strong> → 明日から使える具体的ノウハウ
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">
                    ✓
                  </span>
                  <p className="text-neutral-700 dark:text-gray-300">
                    <strong>共感重視</strong> → 同じ立場だからこそわかる悩み
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">
                    ✓
                  </span>
                  <p className="text-neutral-700 dark:text-gray-300">
                    <strong>効率的</strong> → 忙しくても続けられる方法
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-1">
                    ✓
                  </span>
                  <p className="text-neutral-700 dark:text-gray-300">
                    <strong>現実的</strong> → 無理なく実現できる目標設定
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-gray-100 text-center mb-2">
              2つのカテゴリで発信
            </h2>
            <p className="text-neutral-600 dark:text-gray-400 text-center mb-12">
              シゴデキ × イケオジで「カッコいい40代」を目指す
            </p>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* シゴデキ */}
              <div>
                <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400 text-center mb-6">
                  シゴデキ（仕事ができる）
                </h3>
                <div className="space-y-4">
                  <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary-600 dark:bg-primary-500 w-12 h-12 rounded flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-gray-100 mb-1">
                          仕事効率化
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400">
                          生産性向上、時間管理、業務改善
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary-600 dark:bg-primary-500 w-12 h-12 rounded flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-gray-100 mb-1">
                          副業
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400">
                          公務員でも可能な副業、収益化の方法
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary-600 dark:bg-primary-500 w-12 h-12 rounded flex items-center justify-center flex-shrink-0">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-gray-100 mb-1">
                          キャリア戦略
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400">
                          キャリアデザイン、スキルアップ、転職
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* イケオジ */}
              <div>
                <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 text-center mb-6">
                  イケオジ（イケてるおじさん）
                </h3>
                <div className="space-y-4">
                  <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-cyan-600 dark:bg-cyan-500 w-12 h-12 rounded flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-gray-100 mb-1">
                          美容・健康
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400">
                          メンズ美容、健康管理、筋トレ、体型改善
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-cyan-600 dark:bg-cyan-500 w-12 h-12 rounded flex items-center justify-center flex-shrink-0">
                        <Shirt className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-gray-100 mb-1">
                          ファッション
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400">
                          40代向けファッション、身だしなみ
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-cyan-600 dark:bg-cyan-500 w-12 h-12 rounded flex items-center justify-center flex-shrink-0">
                        <Coffee className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-gray-100 mb-1">
                          ライフスタイル
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-gray-400">
                          趣味、休日の過ごし方、家族との関係
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Operator Profile Section */}
        <section className="py-16 bg-neutral-50 dark:bg-gray-700">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-gray-100 text-center mb-8">
              運営者プロフィール
            </h2>
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Profile Details */}
              <div>
                <div className="bg-white dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-6 h-full">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      カズ（KAZU）
                    </h3>
                    <p className="text-neutral-600 dark:text-gray-400">
                      元地方公務員 ×
                      フリーランスライター＆キャリアコンサルタント
                    </p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-neutral-700 dark:text-gray-300">
                      <strong>年齢：</strong>44歳
                    </p>
                    <p className="text-neutral-700 dark:text-gray-300">
                      <strong>経歴：</strong>
                      元地方公務員（県庁18年勤務→2年前に円満退職）
                    </p>
                    <p className="text-neutral-700 dark:text-gray-300">
                      <strong>現職：</strong>
                      フリーランスライター＆キャリアコンサルタント
                    </p>
                    <p className="text-neutral-700 dark:text-gray-300">
                      <strong>家族：</strong>既婚・子ども2人（高1・小6）
                    </p>
                    <p className="text-neutral-700 dark:text-gray-300">
                      <strong>資格：</strong>
                      FP2級、日商簿記2級、行政書士、情報処理技術者、中小企業診断士
                    </p>
                    <p className="text-neutral-700 dark:text-gray-300">
                      <strong>趣味：</strong>筋トレ、読書、ブログ執筆
                    </p>
                  </div>
                </div>
              </div>

              {/* Story */}
              <div>
                <div className="bg-white dark:bg-gray-800 border border-neutral-200 dark:border-gray-600 p-6 h-full space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-gray-100 mb-3">
                      3年前の私（公務員時代）
                    </h3>
                    <ul className="space-y-2">
                      <li className="text-neutral-600 dark:text-gray-400 flex items-start text-sm">
                        <span className="text-red-500 mr-2">✗</span>
                        <span>体重が10kg増加（メタボ判定）</span>
                      </li>
                      <li className="text-neutral-600 dark:text-gray-400 flex items-start text-sm">
                        <span className="text-red-500 mr-2">✗</span>
                        <span>貯金は増えず、将来に不安</span>
                      </li>
                      <li className="text-neutral-600 dark:text-gray-400 flex items-start text-sm">
                        <span className="text-red-500 mr-2">✗</span>
                        <span>家族との会話も減り、趣味もなし</span>
                      </li>
                    </ul>
                  </div>

                  <div className="border-t border-neutral-300 dark:border-gray-600 pt-4">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-gray-100 mb-3">
                      そこから一念発起
                    </h3>
                    <ul className="space-y-2">
                      <li className="text-neutral-600 dark:text-gray-400 flex items-start text-sm">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>筋トレで体重-12kg、体脂肪率10%達成</span>
                      </li>
                      <li className="text-neutral-600 dark:text-gray-400 flex items-start text-sm">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>投資を学び資産1500万円突破</span>
                      </li>
                      <li className="text-neutral-600 dark:text-gray-400 flex items-start text-sm">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>ブログで情報発信を開始、月10万円の収益化</span>
                      </li>
                      <li className="text-neutral-600 dark:text-gray-400 flex items-start text-sm">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>2年前に公務員を円満退職、独立</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-neutral-100 dark:bg-gray-700 border border-neutral-200 dark:border-gray-600 p-4">
                    <p className="text-sm text-neutral-700 dark:text-gray-300 leading-relaxed">
                      今は「元公務員」の経験を活かし、同じ悩みを持つ40代のキャリア支援と情報発信で生計を立てています。
                    </p>
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
              「40代からの賢い自己投資術」について、ご質問やご意見がございましたらお気軽にお問い合わせください。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://twitter.com/doboku_note"
                className="bg-white text-primary-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105"
              >
                Twitterでフォロー
              </a>
              <a
                href="https://note.com/doboku_note"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-primary-600 transition-all"
              >
                noteでフォロー
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

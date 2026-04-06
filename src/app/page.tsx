import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

/**
 * ホームページのメインコンポーネント
 *
 * Phase 1: 試験対策コンテンツ特化
 * - 1級土木施工管理技士対策
 * - 技術士（総合技術監理）対策
 */
export default async function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-cyan-50 dark:from-primary-950 dark:via-gray-900 dark:to-cyan-950 py-20 lg:py-32">
          <div className="absolute inset-0 opacity-10 dark:opacity-20">
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary-400 rounded blur-3xl"></div>
            <div className="absolute top-1/2 right-0 w-24 h-24 bg-cyan-400 rounded blur-2xl"></div>
            <div className="absolute bottom-0 left-1/3 w-20 h-20 bg-primary-300 rounded blur-2xl"></div>
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
              土木系資格試験
              <span className="bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-800 dark:from-primary-400 dark:via-cyan-400 dark:to-primary-300 bg-clip-text text-transparent">
                対策サイト
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
              1級土木施工管理技士と技術士（総合技術監理）の試験対策に特化したコンテンツを提供しています。
            </p>

          </div>
        </section>

        {/* Exams Overview Section */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">
              対応試験
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 1級土木施工管理技士 */}
              <div className="p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-600 dark:hover:border-primary-400 transition-colors">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  1級土木施工管理技士
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  土木工事の第1次・第2次試験対策コンテンツ。試験ガイド、過去問、キーワード解説を提供します。
                </p>
                <Link
                  href="/docs/civil-construction-1-guide"
                  className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                >
                  コンテンツを見る →
                </Link>
              </div>

              {/* 技術士（総合技術監理） */}
              <div className="p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-cyan-600 dark:hover:border-cyan-400 transition-colors">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  技術士（総合技術監理部門）
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  総合技術監理部門の試験対策。5管理技術、論文作成、事例研究を含むコンテンツ。
                </p>
                <Link
                  href="/docs/cem-study-guide"
                  className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                >
                  コンテンツを見る →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              このサイトについて
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              doboku-noteは、土木系資格試験の合格を目指す受験者向けの対策サイトです。
              <br />
              確かな知識とわかりやすい解説で、皆様の合格をサポートします。
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

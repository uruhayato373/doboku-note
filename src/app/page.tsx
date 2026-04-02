import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BlogCard from "@/components/ui/BlogCard";
import { getPostsByCategory, getAllPosts } from "@/lib/mdx";
import type { Post } from "@/types/blog";
import { generateBuildTimeData } from "@/lib/build-time-data";

/**
 * ホームページのメインコンポーネント
 *
 * このページは以下の要素で構成されています：
 * 1. Hero Section: サイトのメインメッセージとCTAボタン
 * 2. Stats Section: サイトの統計情報表示
 * 3. Category Sections: イケオジ・シゴデキの記事カテゴリ紹介
 * 4. Latest Posts Section: 最新記事の表示
 */
export default function HomePage() {
  // ビルド時に生成されるデータを取得（記事数、カテゴリ別統計など）
  const buildData = generateBuildTimeData();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <main className="flex-grow">
        {/* 
          Hero Section - サイトの第一印象を決める重要なセクション
          グラデーション背景と装飾的な円形要素で視覚的な魅力を演出
        */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-cyan-50 dark:from-primary-950 dark:via-gray-900 dark:to-cyan-950 py-20 lg:py-32">
          {/* 
            装飾的な背景要素
            opacity-10/20で薄く表示し、blur効果で柔らかい印象を演出
            ダークモード時は少し濃いめに表示
          */}
          <div className="absolute inset-0 opacity-10 dark:opacity-20">
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary-400 rounded blur-3xl"></div>
            <div className="absolute top-1/2 right-0 w-24 h-24 bg-cyan-400 rounded blur-2xl"></div>
            <div className="absolute bottom-0 left-1/3 w-20 h-20 bg-primary-300 rounded blur-2xl"></div>
          </div>

          {/* 
            メインコンテンツエリア
            z-10で装飾要素の上に表示し、max-w-6xlで適切な幅を制限
          */}
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* 
              メインタイトル
              text-4xlからtext-7xlまでレスポンシブ対応
              bg-gradient-to-rでグラデーションテキストを実現
              bg-clip-text text-transparentでテキストを透明にして背景色を表示
            */}
            <h1 className="text-4xl md:text-4xl lg:text-7xl font-bold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
              カッコいい
              <span className="bg-gradient-to-r from-primary-600 via-cyan-600 to-primary-800 dark:from-primary-400 dark:via-cyan-400 dark:to-primary-300 bg-clip-text text-transparent">
                公務員
              </span>
            </h1>

            {/* 
              サブタイトル
              ターゲット読者（40代からの公務員・会社員）に直接訴求
              max-w-3xlで読みやすい幅に制限
            */}
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
              40代からの公務員・会社員が、仕事の効率化から資産形成、ライフスタイルの最適化まで、実践的なスキルを身につけるための情報をお届けします。
            </p>

            {/* 
              CTAボタン群
              flex-col sm:flex-rowでモバイル時は縦並び、デスクトップ時は横並び
              transform hover:-translate-y-1でホバー時の浮き上がり効果
            */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* プライマリーCTA: 記事一覧への誘導 */}
              <a
                href="/blog"
                className="inline-block bg-gradient-to-r from-primary-600 to-cyan-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-primary-700 hover:to-cyan-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                記事を読む
              </a>

              {/* セカンダリーCTA: サイト詳細への誘導 */}
              <a
                href="/about"
                className="inline-block bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-8 py-4 rounded-lg font-semibold text-lg border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                詳しく見る
              </a>
            </div>
          </div>
        </section>

        {/* 
          Stats Section - サイトの信頼性と規模を示す統計情報
          白い背景でHero Sectionと区別し、視認性を向上
        */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* 
              3カラムのグリッドレイアウト
              grid-cols-1 md:grid-cols-3でモバイル時は1列、デスクトップ時は3列
            */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              {/* 総記事数 */}
              <div className="p-6">
                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  {buildData.totalPosts}
                </div>
                <div className="text-gray-600 dark:text-gray-400">総記事数</div>
              </div>

              {/* イケオジ記事数 */}
              <div className="p-6">
                <div className="text-4xl font-bold text-cyan-600 dark:text-cyan-400 mb-2">
                  {buildData.categoryStats.イケオジ || 0}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  イケオジ記事
                </div>
              </div>

              {/* シゴデキ記事数 */}
              <div className="p-6">
                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  {buildData.categoryStats.シゴデキ || 0}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  シゴデキ記事
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 
          Latest Posts Section - 最新記事の一覧表示
          白い背景でCategory Sectionsと区別し、記事への誘導を強化
        */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* セクションタイトルと説明 */}
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                最新記事
              </h2>
            </div>

            {/* 
              最新記事の表示（最新6件）
              buildData.latestPostsから記事IDを取得し、getAllPosts()で詳細データを取得
              filterでundefinedを除外し、型安全性を確保
            */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {buildData.latestPosts
                .slice(0, 6)
                .map((postId) => getAllPosts().find((p) => p.id === postId))
                .filter((post): post is Post => post !== undefined)
                .map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
            </div>

            {/* 記事一覧への誘導ボタン */}
            <div className="text-center mt-8">
              <a
                href="/blog"
                className="inline-block bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-lg font-medium hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                すべての記事を見る
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

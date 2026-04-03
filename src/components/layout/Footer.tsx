import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* ブランド情報 */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold text-primary-400 mb-4">doboku-note</h3>
            <p className="text-gray-300 mb-4">土木系資格試験 専門技術ノート</p>
            <p className="text-gray-400 text-sm">1級土木施工管理技士・技術士の合格をサポート</p>
          </div>

          {/* カテゴリ */}
          <div>
            <h4 className="text-lg font-semibold mb-4">カテゴリ</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/category/civil-construction-manager"
                  className="text-gray-300 hover:text-primary-400 transition-colors"
                >
                  1級土木施工管理技士
                </Link>
              </li>
              <li>
                <Link
                  href="/category/professional-engineer"
                  className="text-gray-300 hover:text-primary-400 transition-colors"
                >
                  技術士（総合技術監理部門）
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-gray-300 hover:text-primary-400 transition-colors"
                >
                  すべての記事
                </Link>
              </li>
            </ul>
          </div>

          {/* サイト情報 */}
          <div>
            <h4 className="text-lg font-semibold mb-4">サイト情報</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-gray-300 hover:text-primary-400 transition-colors"
                >
                  このサイトについて
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-400 transition-colors"
                >
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-300 hover:text-primary-400 transition-colors"
                >
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 dark:border-gray-600 mt-8 pt-8 text-center">
          <p className="text-gray-400">© {new Date().getFullYear()} doboku-note. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

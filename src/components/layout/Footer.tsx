import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* ブランド情報 */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold text-primary-400 mb-4">KAKKOM</h3>
            <p className="text-gray-300 mb-4">カッコいい公務員を目指して</p>
            <p className="text-gray-400 text-sm">40代公務員の、もう一歩先へ</p>
          </div>

          {/* カテゴリ */}
          <div>
            <h4 className="text-lg font-semibold mb-4">カテゴリ</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/category/shigodeki"
                  className="text-gray-300 hover:text-primary-400 transition-colors"
                >
                  シゴデキ
                </Link>
              </li>
              <li>
                <Link
                  href="/category/ikeoji"
                  className="text-gray-300 hover:text-primary-400 transition-colors"
                >
                  イケオジ
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
          <p className="text-gray-400">© 2024 KAKKOM. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

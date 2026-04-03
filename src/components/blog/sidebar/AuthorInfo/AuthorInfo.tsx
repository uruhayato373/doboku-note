import Image from "next/image";
import Link from "next/link";

export default function AuthorInfo() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        著者
      </h3>
      <div className="text-center">
        <div className="w-32 h-32 rounded-full mx-auto mb-4 overflow-hidden">
          <Image
            src="/images/author.png"
            alt="カズ（KAZU）"
            width={128}
            height={128}
            className="w-full h-full object-cover"
            sizes="128px"  // 固定サイズ（w-32 = 128px）
          />
        </div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          カズ（KAZU）
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
          元地方公務員・フリーランスライター
        </p>

        {/* プロフィール詳細 */}
        <div className="text-xs text-gray-600 dark:text-gray-400 text-left">
          <p className="mb-2">
            <span className="font-medium">44歳</span>
            ・元地方公務員（県庁18年勤務）
          </p>
          <p className="mb-2">
            現在：フリーランスライター＆キャリアコンサルタント
          </p>
          <p className="mb-2">既婚・子ども2人（高1・小6）</p>
          <p className="text-primary-600 dark:text-primary-400 font-medium">
            同じ悩みを持つ40代の仲間をサポート
          </p>
        </div>

        {/* aboutページへのリンク */}
        <div className="mt-4">
          <Link
            href="/about"
            className="inline-block px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          >
            詳しいプロフィールを見る →
          </Link>
        </div>
      </div>
    </div>
  );
}

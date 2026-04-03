import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700">404</h1>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mt-4">
        ページが見つかりません
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mt-2">
        お探しのページは移動または削除された可能性があります。
      </p>
      <Link
        href="/"
        className="mt-6 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
      >
        トップページへ戻る
      </Link>
    </div>
  );
}

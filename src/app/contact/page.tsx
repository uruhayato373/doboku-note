import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Mail, Clock, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'お問い合わせ | doboku-note',
  description: 'doboku-noteへのご質問・ご意見・コンテンツに関するご指摘はこちらからお問い合わせください。',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <main className="flex-grow">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border-b border-blue-100 dark:border-gray-700 py-12 px-6">
          <div className="max-w-[780px] mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              お問い合わせ
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              ご質問・ご意見・コンテンツに関するご指摘をお待ちしております
            </p>
          </div>
        </div>

        <div className="max-w-[780px] mx-auto px-6 py-12">
          {/* メールでのお問い合わせ */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  メールでのお問い合わせ
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  以下のメールアドレスまでお気軽にご連絡ください
                </p>
              </div>
            </div>

            <a
              href="mailto:info@doboku-note.com"
              className="inline-flex items-center gap-2 text-xl font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              <span>info@doboku-note.com</span>
            </a>
          </div>

          {/* お問い合わせの種類 */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              お問い合わせの例
            </h2>
            <ul className="space-y-3 text-[15px] text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1 shrink-0">&#9679;</span>
                <span>コンテンツの誤り・古い情報のご指摘</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1 shrink-0">&#9679;</span>
                <span>試験対策に関するご質問</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1 shrink-0">&#9679;</span>
                <span>サイトの不具合・表示の問題</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1 shrink-0">&#9679;</span>
                <span>その他のご意見・ご要望</span>
              </li>
            </ul>
          </div>

          {/* 注意事項 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  返信について
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                お問い合わせいただいた内容には、通常3営業日以内にご返信いたします。内容によってはお時間をいただく場合がございます。
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  ご了承事項
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                個別の試験問題の解答や、合否に関するご質問にはお答えできかねます。あらかじめご了承ください。
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | カッコム',
  description: 'カッコムのプライバシーポリシーについて説明します。個人情報の収集、利用、管理について詳しく記載しています。',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            プライバシーポリシー
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            最終更新日: 2025年10月5日
          </p>
        </div>

        {/* プライバシーポリシー内容 */}
        <div className="prose prose-lg max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              1. はじめに
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              カッコム（以下「当サイト」）は、ユーザーの個人情報の保護を重要な責務と考え、以下のプライバシーポリシーに従って個人情報を適切に取り扱います。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              2. 収集する情報
            </h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <h3 className="text-xl font-semibold mb-3">2.1 自動的に収集される情報</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>IPアドレス</li>
                <li>ブラウザの種類とバージョン</li>
                <li>アクセス日時</li>
                <li>参照元のURL</li>
                <li>デバイスの種類（PC、スマートフォン、タブレット）</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">2.2 ユーザーが提供する情報</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>お問い合わせフォームからの情報</li>
                <li>コメントやフィードバック</li>
                <li>メール配信の登録情報</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              3. 情報の利用目的
            </h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <p className="mb-4">収集した情報は以下の目的で利用します：</p>
              <ul className="list-disc pl-6 mb-4">
                <li>サイトの運営・改善</li>
                <li>ユーザーサポートの提供</li>
                <li>コンテンツの最適化</li>
                <li>不正アクセスの防止</li>
                <li>統計データの作成（個人を特定できない形式）</li>
                <li>法的義務の履行</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              4. 第三者との情報共有
            </h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <p className="mb-4">以下の場合を除き、個人情報を第三者と共有することはありません：</p>
              <ul className="list-disc pl-6 mb-4">
                <li>ユーザーの同意がある場合</li>
                <li>法令に基づく場合</li>
                <li>生命、身体または財産の保護のために必要な場合</li>
                <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要な場合</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              5. クッキー（Cookie）について
            </h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <p className="mb-4">
                当サイトでは、ユーザーエクスペリエンスの向上のためにクッキーを使用しています。
                クッキーは、ブラウザの設定により無効にすることができます。
              </p>
              <h3 className="text-xl font-semibold mb-3">使用しているクッキーの種類</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>必須クッキー：サイトの基本機能に必要</li>
                <li>分析クッキー：サイトの利用状況を分析</li>
                <li>機能クッキー：ユーザーの設定を記憶</li>
              </ul>
              <h3 className="text-xl font-semibold mb-3">広告配信におけるクッキーの使用</h3>
              <p className="mb-4">
                当サイトでは、第三者配信の広告サービス「Google AdSense」を利用しています。
                Google などの第三者広告配信事業者は、ユーザーの興味に応じた広告を表示するために、当サイトや他サイトへのアクセスに関する情報（氏名、住所、メール アドレス、電話番号は含まれません）である Cookie を使用することがあります。
              </p>
              <p className="mb-4">
                ユーザーは、<a href="https://adssettings.google.com/authenticated" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">広告設定</a>でパーソナライズ広告を無効にすることができます。また、<a href="http://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">www.aboutads.info</a> にアクセスすれば、パーソナライズ広告に使われる第三者配信事業者の Cookie を無効にできます。
              </p>
              <p className="mb-4">
                Google AdSense に関する詳細は、<a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">広告 - ポリシーと規約 - Google</a> をご覧ください。
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              6. データの保存期間
            </h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <p className="mb-4">
                個人情報は、利用目的の達成に必要な期間のみ保存し、その後は適切に削除または匿名化します。
                ただし、法令により保存が義務付けられている場合は、その期間に従います。
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              7. データの保護
            </h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <p className="mb-4">
                当サイトは、個人情報の漏洩、滅失、毀損の防止その他の安全管理のために、
                必要かつ適切な措置を講じます。
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              8. ユーザーの権利
            </h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <p className="mb-4">ユーザーは以下の権利を有します：</p>
              <ul className="list-disc pl-6 mb-4">
                <li>個人情報の開示請求</li>
                <li>個人情報の訂正・削除請求</li>
                <li>個人情報の利用停止・消去請求</li>
                <li>個人情報の第三者提供の停止請求</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              9. プライバシーポリシーの変更
            </h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <p className="mb-4">
                当サイトは、必要に応じて本プライバシーポリシーを変更することがあります。
                変更があった場合は、当サイト上で公表します。
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              10. お問い合わせ
            </h2>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <p className="mb-4">
                本プライバシーポリシーに関するお問い合わせは、以下の方法でお願いします：
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                <p className="font-semibold mb-2">doboku-note 運営事務局</p>
                <p>Email: privacy@doboku-note.com</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  ※お問い合わせの際は、件名に「プライバシーポリシーに関するお問い合わせ」と記載してください。
                </p>
              </div>
            </div>
          </section>
        </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

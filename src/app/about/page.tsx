import type { Metadata } from 'next';
import { FaEnvelope, FaTwitter, FaInstagram, FaGithub } from 'react-icons/fa';

export const metadata: Metadata = {
  title: 'サイト情報',
};

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-12">サイト情報</h1>

      {/* 管理者 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">管理者</h2>
        <p className="leading-relaxed text-gray-700">管理者のmindy です。</p>
        <p className="leading-relaxed text-gray-700">
          これまで土木技術に関する仕事に携わる中で得られた知識・経験を可能な限りドキュメントとして整理したいと思い、このサイトの運営を始めました。
        </p>
        <div className="flex justify-center gap-8 mt-8">
          <a href="mailto:uruhayato373@gmail.com" aria-label="Email" className="text-black hover:text-gray-600 transition-colors">
            <FaEnvelope size={30} />
          </a>
          <a href="https://twitter.com/uruhayato373" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-black hover:text-gray-600 transition-colors">
            <FaTwitter size={30} />
          </a>
          <a href="https://www.instagram.com/uruhayato373/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-black hover:text-gray-600 transition-colors">
            <FaInstagram size={30} />
          </a>
          <a href="https://github.com/uruhayato373" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-black hover:text-gray-600 transition-colors">
            <FaGithub size={30} />
          </a>
        </div>
      </section>

      {/* 免責事項 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">免責事項</h2>
        <p className="leading-relaxed text-gray-700">
          当サイトの情報は可能な限り正確性を保つよう努めていますが、その正確性、完全性、最新性などを保証するものではありません。当サイトの情報によって生じたいかなる損害についても、当サイトは責任を負いかねます。
        </p>
        <p className="leading-relaxed text-gray-700">
          また、当サイトからリンクやバナーなどによって他のサイトに移動された場合、移動先サイトで提供される情報、サービス等について当サイトは一切の責任を負いません。
        </p>
      </section>

      {/* プライバシーポリシー */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">プライバシーポリシー</h2>
        <p className="leading-relaxed text-gray-700">
          当サイトでは、Googleアナリティクスを使用しています。このGoogleアナリティクスはトラフィックデータの収集のためにCookieを使用しています。このトラフィックデータは匿名で収集されており、個人を特定するものではありません。
        </p>
        <p className="leading-relaxed text-gray-700">
          この機能はCookieを無効にすることで収集を拒否することが出来ますので、お使いのブラウザの設定をご確認ください。この規約に関しての詳細は
          <a href="https://marketingplatform.google.com/about/analytics/terms/jp/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Googleアナリティクスサービス利用規約
          </a>
          のページや
          <a href="https://policies.google.com/technologies/ads?hl=ja" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Googleポリシーと規約ページ
          </a>
          をご覧ください。
        </p>
      </section>

      {/* お問い合わせ */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">お問い合わせ</h2>
        <p className="leading-relaxed text-gray-700">
          ご質問、ご意見、お問い合わせは以下のリンクからGoogleフォームへアクセスしてください。
        </p>
        <div className="text-center mt-6">
          <a
            href="https://docs.google.com/forms/d/1VzUAh0VgA2SVpYS3nVYEg87FD7IjSinTrJhUFRqHiNI"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors no-underline"
          >
            お問い合わせフォームへ
          </a>
        </div>
      </section>
    </main>
  );
}

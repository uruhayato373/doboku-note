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
        <h2 id="プライバシーポリシー" className="text-2xl font-bold mb-4">プライバシーポリシー</h2>

        <h3 className="text-lg font-semibold mt-6 mb-2">アクセス解析ツールについて</h3>
        <p className="leading-relaxed text-gray-700">
          当サイトでは、Googleアナリティクス（Google LLC）を使用しています。Googleアナリティクスはトラフィックデータの収集のためにCookieを使用しています。このトラフィックデータは匿名で収集されており、個人を特定するものではありません。
        </p>
        <p className="leading-relaxed text-gray-700">
          この機能はCookieを無効にすることで収集を拒否することが出来ますので、お使いのブラウザの設定をご確認ください。詳細は
          <a href="https://marketingplatform.google.com/about/analytics/terms/jp/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Googleアナリティクスサービス利用規約
          </a>
          および
          <a href="https://policies.google.com/technologies/ads?hl=ja" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Googleポリシーと規約ページ
          </a>
          をご覧ください。
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-2">広告配信について</h3>
        <p className="leading-relaxed text-gray-700">
          当サイトでは、第三者配信の広告サービスとしてGoogle AdSense（Google LLC）を利用しています。Google AdSenseでは、ユーザーの興味に基づいた広告を表示するためにCookieを使用することがあります。
        </p>
        <p className="leading-relaxed text-gray-700">
          Cookieを使用することにより、GoogleはユーザーがそのサイトやGoogleのパートナーのサイトを訪問した際の情報に基づいて、適切な広告を表示することが可能になります。ユーザーは
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Googleの広告設定ページ
          </a>
          でパーソナライズ広告を無効にすることができます。また、
          <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            www.aboutads.info
          </a>
          にアクセスすれば、パーソナライズ広告に使われる第三者配信事業者のCookieを無効にすることができます。
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-2">Amazonアソシエイトについて</h3>
        <p className="leading-relaxed text-gray-700">
          当サイトは、Amazon.co.jpを宣伝しリンクすることによってサイトが紹介料を獲得できる手段を提供することを目的に設定されたアフィリエイトプログラムである、Amazonアソシエイト・プログラムの参加者です。
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-2">個人情報の取り扱いについて</h3>
        <p className="leading-relaxed text-gray-700">
          当サイトのお問い合わせフォームにて、名前やメールアドレス等の個人情報をご入力いただく場合があります。取得した個人情報は、お問い合わせに対する回答を電子メールなどでご連絡する場合に利用させていただくものであり、これらの目的以外では利用いたしません。
        </p>
      </section>

      {/* 著作権 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">著作権について</h2>
        <p className="leading-relaxed text-gray-700">
          当サイトに掲載されている文章・画像・図表等のコンテンツの著作権は、当サイト管理者または各権利所有者に帰属します。法律で認められた範囲を超えた無断転載・複製を禁じます。
        </p>
        <p className="leading-relaxed text-gray-700">
          当サイトのコンテンツには、公共機関が公表した技術基準・法令等を基に作成した解説が含まれます。引用元の著作権は各公共機関に帰属します。
        </p>
      </section>

      {/* お問い合わせ */}
      <section className="mb-12">
        <h2 id="お問い合わせ" className="text-2xl font-bold mb-4">お問い合わせ</h2>
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

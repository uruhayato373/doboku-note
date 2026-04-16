import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  FileText,
  BookOpen,
  Shield,
  AlertTriangle,
  Ban,
  RefreshCw,
} from 'lucide-react';

export const metadata: Metadata = {
  title: '利用規約 | doboku-note',
  description: 'doboku-noteの利用規約について。コンテンツの利用条件、免責事項、知的財産権についてご案内します。',
};

type SectionCardProps = {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
};

function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-card-section p-6 hover:shadow-card-hover transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-primary-100 dark:bg-primary-900/30 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">{title}</h2>
      </div>
      <div className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <main className="flex-grow w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            利用規約
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">最終更新日: 2026年4月8日</p>
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
          本利用規約（以下「本規約」）は、doboku-note（以下「当サイト」）の利用に関する条件を定めるものです。
          当サイトを利用されることにより、本規約に同意したものとみなします。
        </p>

        <div className="space-y-6">
          <SectionCard
            icon={<FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            title="1. サービスの内容"
          >
            <p className="mb-3">
              当サイトは、1級土木施工管理技士および技術士（総合技術監理部門）の受験対策を支援する学習コンテンツを提供するWebサイトです。
            </p>
            <p>
              当サイトのコンテンツは試験対策の参考資料として提供しており、各試験の実施機関が発行する公式教材・公式情報とは異なります。
              試験に関する最新・正確な情報は、各試験実施機関のWebサイトをご確認ください。
            </p>
          </SectionCard>

          <SectionCard
            icon={<BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            title="2. 知的財産権"
          >
            <p className="mb-3">
              当サイトに掲載されるオリジナルコンテンツ（解説文、図表、構成等）の著作権は当サイト運営者に帰属します。
            </p>
            <p className="mb-3">
              試験問題および公的機関が公開する資料については、出典を明記した上で引用・参照しています。
              これらの著作権は各権利者に帰属します。
            </p>
            <p>
              当サイトのコンテンツを個人の学習目的で利用することは自由ですが、無断での転載・複製・商用利用は禁止します。
              引用する場合は、当サイト名とURLを明記してください。
            </p>
          </SectionCard>

          <SectionCard
            icon={<AlertTriangle className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            title="3. 免責事項"
          >
            <ul className="list-disc list-inside space-y-2">
              <li>
                当サイトの情報は正確性に万全を期していますが、内容の完全性・正確性・最新性を保証するものではありません。
              </li>
              <li>
                当サイトの利用により生じた損害（試験の合否を含む）について、当サイト運営者は一切の責任を負いません。
              </li>
              <li>
                当サイトからリンクされる外部サイトの内容については、当サイト運営者は責任を負いません。
              </li>
              <li>
                当サイトは予告なくコンテンツの変更・削除・サービスの中断を行う場合があります。
              </li>
            </ul>
          </SectionCard>

          <SectionCard
            icon={<Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            title="4. 広告について"
          >
            <p className="mb-3">
              当サイトでは、Google AdSense等の第三者配信事業者による広告を掲載する場合があります。
            </p>
            <p className="mb-3">
              これらの広告配信事業者は、ユーザーの興味に応じた広告を表示するために Cookie を使用することがあります。
              Cookie の使用については
              <a href="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">プライバシーポリシー</a>
              をご確認ください。
            </p>
            <p>
              当サイトにはアフィリエイトプログラムに基づく広告リンクが含まれる場合があります。
            </p>
          </SectionCard>

          <SectionCard
            icon={<Ban className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            title="5. 禁止事項"
          >
            <p className="mb-3">当サイトの利用にあたり、以下の行為を禁止します。</p>
            <ul className="list-disc list-inside space-y-2">
              <li>当サイトのコンテンツの無断転載・複製・商用利用</li>
              <li>当サイトの運営を妨害する行為</li>
              <li>不正アクセスまたはそれに準ずる行為</li>
              <li>他のユーザーまたは第三者の権利を侵害する行為</li>
              <li>その他、当サイト運営者が不適切と判断する行為</li>
            </ul>
          </SectionCard>

          <SectionCard
            icon={<RefreshCw className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
            title="6. 規約の変更"
          >
            <p>
              当サイト運営者は、必要に応じて本規約を変更することがあります。
              変更後の利用規約は当ページに掲載した時点で効力を生じます。
              重要な変更がある場合は、当サイト上でお知らせします。
            </p>
          </SectionCard>
        </div>

        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
          <p>ご不明な点がございましたら、<a href="/about" className="text-primary-600 dark:text-primary-400 hover:underline">お問い合わせ</a>よりご連絡ください。</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

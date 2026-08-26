import { Metadata } from 'next';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionCard from '@/components/ui/SectionCard/SectionCard';
import {
  FileText,
  BookOpen,
  Shield,
  AlertTriangle,
  Ban,
  RefreshCw,
} from 'lucide-react';

export const metadata: Metadata = {
  title: '利用規約',
  description: 'doboku-noteの利用規約について。コンテンツの利用条件、免責事項、知的財産権についてご案内します。',
  // self canonical（root 継承事故の防止。og:url は既に self 指定済み）
  alternates: { canonical: '/terms' },
  openGraph: {
    type: 'website',
    title: '利用規約 | doboku-note',
    description: 'doboku-noteの利用規約について。コンテンツの利用条件、免責事項、知的財産権についてご案内します。',
    url: 'https://doboku-note.com/terms',
    images: [
      {
        url: 'https://doboku-note.com/images/og-default.png',
        width: 1200,
        height: 630,
        alt: 'doboku-note - 土木系資格試験 専門技術ノート',
      },
    ],
  },
};

const bodyClass = 'text-[15px] text-[var(--ink-body)] leading-relaxed';

export default function TermsPage() {
  return (
    <PageShell variant="content" rail="780">
      <PageHeader
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Terms' }]}
        title="利用規約"
        meta="最終更新日 2026.04.08"
        className="mb-8"
      />

      <p className="text-[var(--ink-body)] mb-8 leading-relaxed">
        本利用規約（以下「本規約」）は、doboku-note（以下「当サイト」）の利用に関する条件を定めるものです。
        当サイトを利用されることにより、本規約に同意したものとみなします。
      </p>

      <div className="space-y-6">
        <SectionCard
          interactive
          icon={<FileText className="w-5 h-5 text-[var(--accent)]" />}
          title="1. サービスの内容"
        >
          <div className={bodyClass}>
            <p className="mb-3">
              当サイトは、1級土木施工管理技士および技術士（総合技術監理部門）の受験対策を支援する学習コンテンツを提供するWebサイトです。
            </p>
            <p>
              当サイトのコンテンツは試験対策の参考資料として提供しており、各試験の実施機関が発行する公式教材・公式情報とは異なります。
              試験に関する最新・正確な情報は、各試験実施機関のWebサイトをご確認ください。
            </p>
          </div>
        </SectionCard>

        <SectionCard
          interactive
          icon={<BookOpen className="w-5 h-5 text-[var(--accent)]" />}
          title="2. 知的財産権"
        >
          <div className={bodyClass}>
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
          </div>
        </SectionCard>

        <SectionCard
          interactive
          icon={<AlertTriangle className="w-5 h-5 text-[var(--accent)]" />}
          title="3. 免責事項"
        >
          <ul className={`${bodyClass} list-disc list-inside space-y-2`}>
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
          interactive
          icon={<Shield className="w-5 h-5 text-[var(--accent)]" />}
          title="4. 広告について"
        >
          <div className={bodyClass}>
            <p>
              当サイトにはアフィリエイトプログラムに基づく広告リンクが含まれる場合があります。
              Cookie の使用については
              <a href="/privacy" className="text-[var(--accent)] hover:underline">プライバシーポリシー</a>
              をご確認ください。
            </p>
          </div>
        </SectionCard>

        <SectionCard
          interactive
          icon={<Ban className="w-5 h-5 text-[var(--accent)]" />}
          title="5. 禁止事項"
        >
          <div className={bodyClass}>
            <p className="mb-3">当サイトの利用にあたり、以下の行為を禁止します。</p>
            <ul className="list-disc list-inside space-y-2">
              <li>当サイトのコンテンツの無断転載・複製・商用利用</li>
              <li>当サイトの運営を妨害する行為</li>
              <li>不正アクセスまたはそれに準ずる行為</li>
              <li>他のユーザーまたは第三者の権利を侵害する行為</li>
              <li>その他、当サイト運営者が不適切と判断する行為</li>
            </ul>
          </div>
        </SectionCard>

        <SectionCard
          interactive
          icon={<RefreshCw className="w-5 h-5 text-[var(--accent)]" />}
          title="6. 規約の変更"
        >
          <div className={bodyClass}>
            <p>
              当サイト運営者は、必要に応じて本規約を変更することがあります。
              変更後の利用規約は当ページに掲載した時点で効力を生じます。
              重要な変更がある場合は、当サイト上でお知らせします。
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        as="div"
        padding="compact"
        className="mt-8 bg-[var(--accent-fill)] border-0 shadow-none"
      >
        <p className="text-sm text-[var(--ink-body)]">
          ご不明な点がございましたら、
          <a href="/contact" className="text-[var(--accent)] hover:underline">お問い合わせ</a>
          よりご連絡ください。
        </p>
      </SectionCard>
    </PageShell>
  );
}

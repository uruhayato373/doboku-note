import { Metadata } from 'next';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionBlock from '@/components/layout/SectionBlock';
import SectionCard from '@/components/ui/SectionCard/SectionCard';
import { Mail, Clock, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'お問い合わせ',
  description: 'doboku-noteへのご質問・ご意見・コンテンツに関するご指摘はこちらからお問い合わせください。',
  // self canonical（root 継承事故の防止。og:url は既に self 指定済み）
  alternates: { canonical: '/contact' },
  openGraph: {
    type: 'website',
    title: 'お問い合わせ | doboku-note',
    description: 'doboku-noteへのご質問・ご意見・コンテンツに関するご指摘はこちらからお問い合わせください。',
    url: 'https://doboku-note.com/contact',
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

export default function ContactPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="780"
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
        title="お問い合わせ"
        lead="ご質問・ご意見・コンテンツに関するご指摘をお待ちしております"
      />

      <SectionBlock width="780" space="md">
        {/* メール */}
        <SectionCard className="mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-[var(--accent-fill)] w-12 h-12 rounded-card-content flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-[var(--ink)] text-lg">
                メールでのお問い合わせ
              </h2>
              <p className="text-sm text-[var(--ink-muted)]">
                以下のメールアドレスまでお気軽にご連絡ください
              </p>
            </div>
          </div>
          <a
            href="mailto:info@doboku-note.com"
            className="inline-flex items-center gap-2 font-mono text-lg text-[var(--accent)] hover:underline"
          >
            info@doboku-note.com
          </a>
        </SectionCard>

        {/* お問い合わせの種類 */}
        <SectionCard title="お問い合わせの例" className="mb-6">
          <ul className="space-y-2 text-[15px] text-[var(--ink-body)]">
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent)] mt-1 shrink-0">●</span>
              <span>コンテンツの誤り・古い情報のご指摘</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent)] mt-1 shrink-0">●</span>
              <span>試験対策に関するご質問</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent)] mt-1 shrink-0">●</span>
              <span>サイトの不具合・表示の問題</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--accent)] mt-1 shrink-0">●</span>
              <span>その他のご意見・ご要望</span>
            </li>
          </ul>
        </SectionCard>

        {/* 注意事項 */}
        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard padding="default">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-[var(--ink-muted)]" />
              <h3 className="font-serif font-bold text-[var(--ink)]">返信について</h3>
            </div>
            <p className="text-sm text-[var(--ink-body)] leading-relaxed">
              お問い合わせいただいた内容には、通常3営業日以内にご返信いたします。内容によってはお時間をいただく場合がございます。
            </p>
          </SectionCard>
          <SectionCard padding="default">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-[var(--ink-muted)]" />
              <h3 className="font-serif font-bold text-[var(--ink)]">ご了承事項</h3>
            </div>
            <p className="text-sm text-[var(--ink-body)] leading-relaxed">
              個別の試験問題の解答や、合否に関するご質問にはお答えできかねます。あらかじめご了承ください。
            </p>
          </SectionCard>
        </div>
      </SectionBlock>
    </PageShell>
  );
}

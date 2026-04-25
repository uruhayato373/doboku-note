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
    <div className="min-h-screen flex flex-col bg-[var(--bg)] transition-colors duration-300">
      <Header />

      <main className="flex-grow">
        <div className="border-b border-[var(--rule-soft)] bg-[var(--paper)] py-10 sm:py-12 px-4 sm:px-6 lg:px-10">
          <div className="max-w-[780px] mx-auto">
            <nav aria-label="breadcrumb" className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>Home</span>
              <span aria-hidden className="opacity-60">›</span>
              <span>Contact</span>
            </nav>
            <h1 className="font-serif font-black text-[var(--ink)] text-[32px] sm:text-[40px] tracking-tight mb-3">
              お問い合わせ
            </h1>
            <p className="text-[15px] text-[var(--ink-body)]">
              ご質問・ご意見・コンテンツに関するご指摘をお待ちしております
            </p>
          </div>
        </div>

        <div className="max-w-[780px] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-12">
          {/* メール */}
          <div className="bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section p-6 sm:p-8 mb-6 shadow-soft">
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
          </div>

          {/* お問い合わせの種類 */}
          <div className="bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section p-6 sm:p-8 mb-6 shadow-soft">
            <h2 className="font-serif text-lg font-bold text-[var(--ink)] mb-4">
              お問い合わせの例
            </h2>
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
          </div>

          {/* 注意事項 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-[var(--ink-muted)]" />
                <h3 className="font-serif font-bold text-[var(--ink)]">
                  返信について
                </h3>
              </div>
              <p className="text-sm text-[var(--ink-body)] leading-relaxed">
                お問い合わせいただいた内容には、通常3営業日以内にご返信いたします。内容によってはお時間をいただく場合がございます。
              </p>
            </div>
            <div className="bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-[var(--ink-muted)]" />
                <h3 className="font-serif font-bold text-[var(--ink)]">
                  ご了承事項
                </h3>
              </div>
              <p className="text-sm text-[var(--ink-body)] leading-relaxed">
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

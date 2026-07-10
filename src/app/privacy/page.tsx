import { Metadata } from 'next';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionBlock from '@/components/layout/SectionBlock';
import SectionCard from '@/components/ui/SectionCard/SectionCard';
import {
  Shield,
  Database,
  Target,
  Users,
  Cookie,
  ShoppingBag,
  Clock,
  Lock,
  UserCheck,
  RefreshCw,
  Mail,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description: 'doboku-noteのプライバシーポリシーについて説明します。個人情報の収集、利用、管理について詳しく記載しています。',
  openGraph: {
    type: 'website',
    title: 'プライバシーポリシー | doboku-note',
    description: 'doboku-noteのプライバシーポリシーについて説明します。個人情報の収集、利用、管理について詳しく記載しています。',
    url: 'https://doboku-note.com/privacy',
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

type PolicyCardProps = {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
};

// 共通 SectionCard へ委譲（chrome の二重管理を解消）。
function PolicyCard({ icon, title, children }: PolicyCardProps) {
  return (
    <SectionCard interactive icon={icon} title={title}>
      <div className="text-[15px] text-[var(--ink-body)] leading-relaxed">{children}</div>
    </SectionCard>
  );
}

export default function PrivacyPage() {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="780"
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Privacy' }]}
        title="プライバシーポリシー"
        meta="最終更新日 2026.05.21"
      />

      <SectionBlock width="860" space="lg">
        <div className="space-y-6">
          {/* 1. はじめに */}
          <PolicyCard
            icon={<Shield className="w-5 h-5 text-[var(--accent)]" />}
            title="はじめに"
          >
            <p>
              doboku-note（以下「当サイト」）は、ユーザーの個人情報の保護を重要な責務と考え、以下のプライバシーポリシーに従って個人情報を適切に取り扱います。
            </p>
          </PolicyCard>

          {/* 2. 収集する情報 */}
          <PolicyCard
            icon={<Database className="w-5 h-5 text-[var(--accent)]" />}
            title="収集する情報"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-card-content bg-[var(--bg)] p-4">
                <h3 className="font-semibold text-[var(--ink)] mb-2 text-sm">自動的に収集される情報</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[var(--accent)] rounded-full flex-shrink-0" />IPアドレス</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[var(--accent)] rounded-full flex-shrink-0" />ブラウザの種類とバージョン</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[var(--accent)] rounded-full flex-shrink-0" />アクセス日時</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[var(--accent)] rounded-full flex-shrink-0" />参照元のURL</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[var(--accent)] rounded-full flex-shrink-0" />デバイスの種類</li>
                </ul>
              </div>
              <div className="rounded-card-content bg-[var(--bg)] p-4">
                <h3 className="font-semibold text-[var(--ink)] mb-2 text-sm">ユーザーが提供する情報</h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[var(--accent)] rounded-full flex-shrink-0" />お問い合わせフォームからの情報</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[var(--accent)] rounded-full flex-shrink-0" />コメントやフィードバック</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 bg-[var(--accent)] rounded-full flex-shrink-0" />メール配信の登録情報</li>
                </ul>
              </div>
            </div>
          </PolicyCard>

          {/* 3. 情報の利用目的 */}
          <PolicyCard
            icon={<Target className="w-5 h-5 text-[var(--accent)]" />}
            title="情報の利用目的"
          >
            <p className="mb-3">収集した情報は以下の目的で利用します：</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                'サイトの運営・改善',
                'ユーザーサポートの提供',
                'コンテンツの最適化',
                '不正アクセスの防止',
                '統計データの作成（個人を特定できない形式）',
                '法的義務の履行',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-card-content bg-[var(--bg)] px-3 py-2 text-sm">
                  <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </PolicyCard>

          {/* 4. 第三者との情報共有 */}
          <PolicyCard
            icon={<Users className="w-5 h-5 text-[var(--accent)]" />}
            title="第三者との情報共有"
          >
            <p className="mb-3">以下の場合を除き、個人情報を第三者と共有することはありません：</p>
            <ul className="space-y-2">
              {[
                'ユーザーの同意がある場合',
                '法令に基づく場合',
                '生命、身体または財産の保護のために必要な場合',
                '公衆衛生の向上または児童の健全な育成の推進のために特に必要な場合',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full flex-shrink-0 mt-1.5" />
                  {item}
                </li>
              ))}
            </ul>
          </PolicyCard>

          {/* 5. クッキー */}
          <PolicyCard
            icon={<Cookie className="w-5 h-5 text-[var(--accent)]" />}
            title="クッキー（Cookie）について"
          >
            <p className="mb-4">
              当サイトでは、ユーザーエクスペリエンスの向上のためにクッキーを使用しています。
              クッキーは、ブラウザの設定により無効にすることができます。
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: '必須クッキー', desc: 'サイトの基本機能に必要' },
                { label: '分析クッキー', desc: 'サイトの利用状況を分析' },
                { label: '機能クッキー', desc: 'ユーザーの設定を記憶' },
              ].map((cookie) => (
                <div key={cookie.label} className="rounded-card-content bg-[var(--bg)] p-3 text-center">
                  <div className="font-semibold text-sm text-[var(--ink)]">{cookie.label}</div>
                  <div className="text-xs text-[var(--ink-muted)] mt-1">{cookie.desc}</div>
                </div>
              ))}
            </div>

            <div className="rounded-card-content border border-[var(--rule-soft)] bg-[var(--accent-fill)] p-4">
              <h3 className="font-semibold text-[var(--ink)] text-sm mb-2">広告配信におけるクッキーの使用</h3>
              <p className="text-sm mb-2">
                当サイトでは、第三者配信の広告サービス「Google AdSense」を利用しています。
                Google などの第三者広告配信事業者は、ユーザーの興味に応じた広告を表示するために Cookie を使用することがあります。
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <a href="https://adssettings.google.com/authenticated" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs bg-[var(--paper)] border border-[var(--rule-soft)] rounded-full px-3 py-1 text-[var(--accent)] hover:border-[var(--accent)] transition-colors">
                  広告設定
                </a>
                <a href="http://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs bg-[var(--paper)] border border-[var(--rule-soft)] rounded-full px-3 py-1 text-[var(--accent)] hover:border-[var(--accent)] transition-colors">
                  広告Cookie無効化
                </a>
                <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs bg-[var(--paper)] border border-[var(--rule-soft)] rounded-full px-3 py-1 text-[var(--accent)] hover:border-[var(--accent)] transition-colors">
                  Google AdSense 詳細
                </a>
              </div>
            </div>
          </PolicyCard>

          {/* 5b. アフィリエイトプログラム */}
          <PolicyCard
            icon={<ShoppingBag className="w-5 h-5 text-[var(--accent)]" />}
            title="アフィリエイトプログラムについて"
          >
            <p className="mb-4">
              当サイトは、成果報酬型広告（アフィリエイトプログラム）を利用しています。
              これは、商品やサービスを紹介するリンクを掲載し、ユーザーがそのリンク経由で購入・登録した場合に当サイトが紹介料を受け取る仕組みです。
            </p>
            <p>
              これらのプログラムでは、成果の計測のために Cookie を使用します。リンク経由のアクセス情報はプログラム提供事業者により記録されますが、
              当サイトが個人を特定できる情報を取得することはありません。
            </p>
          </PolicyCard>

          {/* 6 & 7: 2カラム */}
          <div className="grid sm:grid-cols-2 gap-6">
            <PolicyCard
              icon={<Clock className="w-5 h-5 text-[var(--accent)]" />}
              title="データの保存期間"
            >
              <p>
                個人情報は、利用目的の達成に必要な期間のみ保存し、その後は適切に削除または匿名化します。
                ただし、法令により保存が義務付けられている場合は、その期間に従います。
              </p>
            </PolicyCard>

            <PolicyCard
              icon={<Lock className="w-5 h-5 text-[var(--accent)]" />}
              title="データの保護"
            >
              <p>
                当サイトは、個人情報の漏洩、滅失、毀損の防止その他の安全管理のために、
                必要かつ適切な措置を講じます。
              </p>
            </PolicyCard>
          </div>

          {/* 8. ユーザーの権利 */}
          <PolicyCard
            icon={<UserCheck className="w-5 h-5 text-[var(--accent)]" />}
            title="ユーザーの権利"
          >
            <p className="mb-3">ユーザーは以下の権利を有します：</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                '個人情報の開示請求',
                '個人情報の訂正・削除請求',
                '個人情報の利用停止・消去請求',
                '個人情報の第三者提供の停止請求',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-card-content bg-[var(--bg)] px-3 py-2 text-sm">
                  <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </PolicyCard>

          {/* 9. ポリシーの変更 */}
          <PolicyCard
            icon={<RefreshCw className="w-5 h-5 text-[var(--accent)]" />}
            title="プライバシーポリシーの変更"
          >
            <p>
              当サイトは、必要に応じて本プライバシーポリシーを変更することがあります。
              変更があった場合は、当サイト上で公表します。
            </p>
          </PolicyCard>

          {/* 10. お問い合わせ */}
          <PolicyCard
            icon={<Mail className="w-5 h-5 text-[var(--accent)]" />}
            title="お問い合わせ"
          >
            <p className="mb-4">
              本プライバシーポリシーに関するお問い合わせは、以下の方法でお願いします：
            </p>
            <div className="flex items-center gap-4 rounded-card-content bg-[var(--bg)] p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent)]">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-[var(--ink)] text-sm">doboku-note 運営事務局</p>
                <p className="text-sm">privacy@doboku-note.com</p>
                <p className="text-xs text-[var(--ink-muted)] mt-1">
                  件名に「プライバシーポリシーに関するお問い合わせ」と記載してください
                </p>
              </div>
            </div>
          </PolicyCard>
        </div>
      </SectionBlock>
    </PageShell>
  );
}

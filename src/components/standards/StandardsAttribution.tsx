import Link from 'next/link';
import SectionCard from '@/components/ui/SectionCard/SectionCard';
import type { StandardDocument, StandardPart } from '@/lib/standards';

export default function StandardsAttribution({ document, part }: { document?: StandardDocument; part?: StandardPart }) {
  return (
    <SectionCard as="aside" title="出典・利用上の注意" padding="compact" className="mt-8">
      <div className="space-y-2 text-[13px] leading-[1.8] text-[var(--ink-body)]">
        {document && (
          <p>
            出典：{document.agencyName}「{document.title}」（
            <a
              href={document.landing}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] underline underline-offset-4"
            >
              原典掲載ページ
            </a>
            {document.sourceUrl && (
              <>
                {' / '}
                <a
                  href={document.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline underline-offset-4"
                >
                  原本PDF
                </a>
              </>
            )}
            ）
          </p>
        )}
        <p>
          doboku-noteが検索・閲覧用にページ単位で文字起こしし、分冊・整形した二次利用物です。国土交通省ウェブサイト利用規約および公共データ利用規約（第1.0版）に基づき、出典と加工内容を表示しています。
        </p>
        <p>
          正確性を保証するものではありません。契約・施工・検査の判断では、発注機関が公開する最新版の原本と適用条件を必ず確認してください。個別の権利表示がある図表等は、その表示を優先します。
        </p>
        <p>
          <a
            href="https://www.mlit.go.jp/link.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline underline-offset-4"
          >
            国土交通省ウェブサイト利用規約
          </a>
          {' / '}
          <a
            href="https://www.digital.go.jp/resources/open_data/public_data_license_v1.0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline underline-offset-4"
          >
            公共データ利用規約（第1.0版）
          </a>
          {' / '}
          <Link href="/terms" className="text-[var(--accent)] underline underline-offset-4">
            当サイト利用規約
          </Link>
        </p>
        {document && (
          <details className="border-t border-[var(--rule-soft)] pt-2">
            <summary className="focus-ring flex min-h-11 cursor-pointer items-center font-bold">原本・文字起こしの詳細</summary>
            <dl className="space-y-2 break-all pb-3">
              <div><dt>原本 SHA-256</dt><dd>{document.sourceSha256}</dd></div>
              <div><dt>文字起こしの構成</dt><dd>{document.partCount}分冊</dd></div>
              {part && <div><dt>この分冊の SHA-256</dt><dd>{part.sha256}</dd></div>}
              {document.duplicateOf && <div><dt>同一原本</dt><dd><Link href={`/standards/${document.duplicateOf}`} className="text-[var(--accent)] underline">同じ原本を掲載する文書</Link></dd></div>}
            </dl>
          </details>
        )}
      </div>
    </SectionCard>
  );
}

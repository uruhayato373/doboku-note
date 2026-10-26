import Link from 'next/link';
import SectionCard from '@/components/ui/SectionCard/SectionCard';
import { getStandardDocument, getStandardEditionDuplicate, standardDocumentPath } from '@/lib/standards';
import { getStandardChapters, standardChapterPath } from '@/lib/standards-articles';
import type { StandardDocument, StandardPart } from '@/lib/standards';
import Disclosure from '@/components/ui/Disclosure/Disclosure';

export default function StandardsAttribution({ document, part, item }: { document?: StandardDocument; part?: StandardPart; item?: number | undefined }) {
  // 同じ要綱を他の機関・版でも収録していて、この文書（冊子の項目）は索引に載せない側なら、載せている 1 本へ案内する
  const edition = document ? getStandardEditionDuplicate(document, item ?? null) : null;
  const [canonicalAgency = '', canonicalId = ''] = edition ? edition.canonical.document.split('/') : [];
  const canonical = edition ? getStandardDocument(canonicalAgency, canonicalId) : null;
  // 載せている側が冊子の項目なら、その項目の最初の章へ（章記事が無ければ文書ページ）
  const canonicalChapter = edition?.canonical.item && canonical
    ? getStandardChapters(canonicalAgency, canonicalId).find((chapter) => chapter.item === edition.canonical.item)
    : undefined;
  const canonicalHref = canonical ? (canonicalChapter ? standardChapterPath(canonical, canonicalChapter) : standardDocumentPath(canonical)) : '';
  return (
    <SectionCard as="aside" title="出典・利用上の注意" padding="compact" className="mt-8">
      <div className="space-y-2 text-[13px] leading-[1.8] text-(--ink-body)">
        {document && (
          <p>
            出典：{document.agencyName}「{document.title}」（
            <a
              href={document.landing}
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--accent) underline underline-offset-4"
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
                  className="text-(--accent) underline underline-offset-4"
                >
                  原本PDF
                </a>
              </>
            )}
            ）
          </p>
        )}
        {edition && canonical && (
          <p>
            同じ「{edition.title}」を
            <Link href={canonicalHref} className="text-(--accent) underline underline-offset-4">
              {canonical.agencyName}「{canonical.title}」{edition.canonical.item ? `の ${edition.canonical.item} 項` : ''}
            </Link>
            （{edition.canonical.edition}）でも掲載しています。検索にはそちらを載せ、この収録（{edition.edition}）は原本どおり読める状態で残しています。
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
            className="text-(--accent) underline underline-offset-4"
          >
            国土交通省ウェブサイト利用規約
          </a>
          {' / '}
          <a
            href="https://www.digital.go.jp/resources/open_data/public_data_license_v1.0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-(--accent) underline underline-offset-4"
          >
            公共データ利用規約（第1.0版）
          </a>
          {' / '}
          <Link href="/terms" className="text-(--accent) underline underline-offset-4">
            当サイト利用規約
          </Link>
        </p>
        {document && (
          <Disclosure variant="plain" className="border-t border-(--rule-soft) pt-2" summaryClassName="font-bold" summary="原本・文字起こしの詳細">
            <dl className="space-y-2 break-all pb-3">
              <div><dt>原本 SHA-256</dt><dd>{document.sourceSha256}</dd></div>
              <div><dt>文字起こしの構成</dt><dd>{document.partCount}分冊</dd></div>
              {part && <div><dt>この分冊の SHA-256</dt><dd>{part.sha256}</dd></div>}
              {document.duplicateOf && <div><dt>同一原本</dt><dd><Link href={`/standards/${document.duplicateOf}`} className="text-(--accent) underline">同じ原本を掲載する文書</Link></dd></div>}
            </dl>
          </Disclosure>
        )}
      </div>
    </SectionCard>
  );
}

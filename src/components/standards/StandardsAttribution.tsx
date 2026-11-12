import Link from 'next/link';
import Disclosure from '@/components/ui/Disclosure/Disclosure';
import { getStandardDocument, getStandardEditionDuplicate, standardDocumentPath } from '@/lib/standards';
import { getStandardChapters, standardChapterPath } from '@/lib/standards-articles';
import type { StandardDocument } from '@/lib/standards';

const linkClass = 'text-(--accent) underline underline-offset-4';

/**
 * 出典の共通表示。見える 1 行（機関・原典リンク・二次利用物の注意）＋ 全文（開閉）。
 * 法的リンクは閉じていても DOM に残る。見える文字は 160 字以内（check-standards-density）。
 */
export default function StandardsAttribution({ document, item }: { document?: StandardDocument; item?: number | undefined }) {
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
    <aside data-standards-attribution className="mt-8 border-t border-(--rule-soft) pt-3 text-[13px] leading-[1.8] text-(--ink-body)">
      <p>
        出典：{document ? `${document.agencyName}` : '国土交通省ほか各発行機関'}
        {document && (
          <>
            {'（'}
            <a href={document.landing} target="_blank" rel="noopener noreferrer" className={linkClass}>原典ページ</a>
            {document.sourceUrl && (
              <>
                {' / '}
                <a href={document.sourceUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>原本PDF</a>
              </>
            )}
            {'）'}
          </>
        )}
        {' '}二次利用物。正確性は原本で確認
      </p>
      <Disclosure variant="plain" summary="出典・利用上の注意" summaryClassName="px-0 py-1 text-[13px] font-bold text-(--ink-muted)">
        <div className="space-y-2 pb-2">
          {document && (
            <p>
              出典：{document.agencyName}「{document.title}」
            </p>
          )}
          {edition && canonical && (
            <p>
              同じ「{edition.title}」を
              <Link href={canonicalHref} className={linkClass}>
                {canonical.agencyName}「{canonical.title}」{edition.canonical.item ? `の ${edition.canonical.item} 項` : ''}
              </Link>
              （{edition.canonical.edition}）でも掲載しています。検索にはそちらを載せ、この収録（{edition.edition}）は原本どおり読める状態で残しています。
            </p>
          )}
          <p>
            doboku-noteが検索・閲覧用に文字起こしし、編・章・節に整形した二次利用物です。国土交通省ウェブサイト利用規約および公共データ利用規約（第1.0版）に基づき、出典と加工内容を表示しています。
          </p>
          <p>
            正確性を保証するものではありません。契約・施工・検査の判断では、発注機関が公開する最新版の原本と適用条件を必ず確認してください。個別の権利表示がある図表等は、その表示を優先します。
          </p>
          <p>
            <a href="https://www.mlit.go.jp/link.html" target="_blank" rel="noopener noreferrer" className={linkClass}>国土交通省ウェブサイト利用規約</a>
            {' / '}
            <a href="https://www.digital.go.jp/resources/open_data/public_data_license_v1.0" target="_blank" rel="noopener noreferrer" className={linkClass}>公共データ利用規約（第1.0版）</a>
            {' / '}
            <Link href="/terms" className={linkClass}>当サイト利用規約</Link>
          </p>
        </div>
      </Disclosure>
    </aside>
  );
}

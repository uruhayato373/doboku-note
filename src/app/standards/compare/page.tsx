import type { Metadata } from 'next';
import Link from 'next/link';
import { GitCompare, ShieldCheck } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import SectionBlock from '@/components/layout/SectionBlock';
import SectionCard from '@/components/ui/SectionCard/SectionCard';
import DisclosureChevron from '@/components/ui/DisclosureChevron';
import { buildPageMetadata } from '@/lib/metadata';
import { getStandardsComparison, inferStandardEdition } from '@/lib/standards-comparison';

export const metadata: Metadata = buildPageMetadata({
  title: '地方整備局別 土木工事共通仕様書の差分比較',
  description:
    '近畿地方整備局版を基準に、各地方整備局の土木工事共通仕様書を章・行単位で比較。完全一致する文書と、北陸・四国版の地域固有記述を原文付きで確認できます。',
  path: '/standards/compare',
});

const statusLabel = {
  baseline: '比較基準',
  identical: '本文一致',
  different: '地域差分あり',
  'source-duplicate': '原本重複',
  'different-document-structure': '別体系',
} as const;

export default function StandardsComparePage() {
  const comparison = getStandardsComparison();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: '地方整備局別 土木工事共通仕様書の差分比較',
    description: '近畿地方整備局版を基準とした、各地方整備局の土木工事共通仕様書の章・行単位比較結果',
    url: 'https://doboku-note.com/standards/compare',
    creator: { '@type': 'Organization', name: 'doboku-note', url: 'https://doboku-note.com' },
    dateModified: comparison.asOf,
    license: 'https://www.digital.go.jp/resources/open_data/public_data_license_v1.0',
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: 'https://doboku-note.com/standards-data/comparison.json',
    },
  };

  return (
    <PageShell
      variant="default"
      beforeHeader={(
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      )}
    >
      <PageHeader
        variant="band"
        breadcrumb={[
          { label: 'ホーム', href: '/' },
          { label: '基準類', href: '/standards' },
          { label: '地域差分' },
        ]}
        label="地域差分"
        title="地方整備局別 共通仕様書比較"
        lead="同じ章を並べ、単なるPDFの違いではなく、地域固有の記述がある箇所だけを抽出しました。"
        meta={`比較対象 ${comparison.summary.structuredDocuments}文書 / 実差分 ${comparison.summary.changedChapters}章・${comparison.summary.changeHunks}箇所 / 基準 近畿版`}
      />

      <SectionBlock space="md">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['共通仕様書', `${comparison.summary.commonDocuments}文書`],
            ['構造比較済み', `${comparison.summary.structuredDocuments}文書`],
            ['本文完全一致', `${comparison.summary.identicalDocuments}文書`],
            ['地域差分', `${comparison.summary.differentDocuments}文書`],
          ].map(([label, value]) => (
            <SectionCard key={label} padding="compact">
              <div className="text-[11px] font-bold tracking-[0.08em] text-[var(--ink-muted)]">{label}</div>
              <div className="mt-2 text-2xl font-bold text-[var(--ink)]">{value}</div>
            </SectionCard>
          ))}
        </div>

        <div className="mt-8 overflow-x-auto border border-[var(--rule-soft)] bg-[var(--paper)]">
          <table className="w-full min-w-[780px] border-collapse text-left text-[13px]">
            <thead className="bg-[var(--bg)] text-[var(--ink)]">
              <tr>
                <th scope="col" className="border-b border-[var(--rule)] px-4 py-3">発行機関・版</th>
                <th scope="col" className="border-b border-[var(--rule)] px-4 py-3">比較結果</th>
                <th scope="col" className="border-b border-[var(--rule)] px-4 py-3 text-right">一致章</th>
                <th scope="col" className="border-b border-[var(--rule)] px-4 py-3 text-right">差分章</th>
                <th scope="col" className="border-b border-[var(--rule)] px-4 py-3 text-right">原本</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rule-soft)]">
              {comparison.rows.map((row) => (
                <tr key={row.agencyId}>
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/standards/${row.agencyId}/${row.documentId}`}
                      className="focus-ring font-bold text-[var(--ink)] hover:text-[var(--accent)] hover:underline"
                    >
                      {row.agencyName}
                    </Link>
                    <div className="mt-1 text-[11px] text-[var(--ink-muted)]">
                      {inferStandardEdition(row.title)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className={row.status === 'different' ? 'font-bold text-[var(--accent)]' : 'text-[var(--ink-body)]'}>
                      {statusLabel[row.status]}
                    </span>
                    {row.duplicateOf && (
                      <div className="mt-1 text-[11px] text-[var(--ink-muted)]">{row.duplicateOf} と原本SHA一致</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--ink-body)]">
                    {row.structured ? row.sameChapters : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--ink-body)]">
                    {row.structured ? row.changedChapters : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--ink-muted)]">{row.pages}頁</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] leading-[1.7] text-[var(--ink-muted)]">
          「本文一致」は、生成器コメント、原本ページ参照タグ、空白差を除外した章本文が一致することを示します。PDFファイル自体のハッシュ一致とは別の判定です。
        </p>
      </SectionBlock>

      <SectionBlock divider="top" ariaLabel="地域固有の差分">
        <div className="mb-6 flex items-start gap-3">
          <GitCompare aria-hidden="true" className="mt-0.5 h-7 w-7 shrink-0 text-[var(--accent)]" />
          <div>
            <h2 className="text-2xl font-bold text-[var(--ink)]">地域固有の差分</h2>
            <p className="mt-2 max-w-[72ch] text-[14px] leading-[1.8] text-[var(--ink-body)]">
              近畿版から追加・削除・変更された行を、章と直前の条項ごとに表示します。番号だけがずれた場合も、その影響範囲を確認できます。
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {comparison.changes.map((change) => (
            <details
              key={`${change.agencyId}-${change.chapterId}`}
              className="group border border-[var(--rule-soft)] bg-[var(--paper)]"
            >
              <summary className="focus-ring flex min-h-16 cursor-pointer list-none items-center gap-4 px-5 py-4 marker:hidden">
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-bold text-[var(--accent)]">{change.agencyName}</span>
                  <span className="mt-1 block font-bold text-[var(--ink)]">{change.chapterTitle}</span>
                </span>
                <span className="shrink-0 text-right text-[11px] tabular-nums text-[var(--ink-muted)]">
                  {change.hunks.length}箇所<br />−{change.removedLines} / ＋{change.addedLines}
                </span>
                <DisclosureChevron className="text-[var(--ink-muted)]" />
              </summary>
              <div className="border-t border-[var(--rule-soft)] px-5 py-5">
                <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
                  <Link
                    href={`/standards/kinki/common/chapters/${change.chapterId}`}
                    className="focus-ring inline-flex min-h-11 items-center text-[var(--accent)] hover:underline"
                  >
                    比較基準の近畿版
                  </Link>
                  <Link
                    href={`/standards/${change.agencyId}/common/chapters/${change.chapterId}`}
                    className="focus-ring inline-flex min-h-11 items-center text-[var(--accent)] hover:underline"
                  >
                    {change.agencyName}版
                  </Link>
                </div>
                <div className="space-y-5">
                  {change.hunks.map((hunk, index) => (
                    <section key={`${change.chapterId}-${index}`} aria-label={`差分${index + 1}`}>
                      <h3 className="text-[13px] font-bold text-[var(--ink)]">
                        {index + 1}. {hunk.context ?? '章内の記述'}
                      </h3>
                      <div className="mt-2 grid gap-3 lg:grid-cols-2">
                        <div className="min-w-0 border-l-4 border-[var(--color-danger)] bg-[var(--color-danger-fill)] p-3">
                          <div className="mb-2 text-[11px] font-bold text-[var(--ink-muted)]">近畿版</div>
                          <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-[1.7] text-[var(--ink-body)]">
                            {hunk.before.length > 0 ? hunk.before.join('\n') : '（該当記述なし）'}
                          </pre>
                        </div>
                        <div className="min-w-0 border-l-4 border-[var(--accent)] bg-[var(--accent-fill)] p-3">
                          <div className="mb-2 text-[11px] font-bold text-[var(--ink-muted)]">{change.agencyName}版</div>
                          <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-[1.7] text-[var(--ink-body)]">
                            {hunk.after.length > 0 ? hunk.after.join('\n') : '（該当記述なし）'}
                          </pre>
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock divider="top" width="860" ariaLabel="比較方法と注意事項">
        <SectionCard title="比較方法と利用上の注意">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />
            <div className="space-y-2 text-[13px] leading-[1.8] text-[var(--ink-body)]">
              <p>{comparison.method}。</p>
              <p>差分は調査の入口です。契約・施工・検査の判断では、各発行機関が公開する最新版原本と適用条件を必ず確認してください。</p>
              <p>現在の収録は各文書1版です。次回改定時から同じ比較方式で年度差分を保存・公開します。</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/standards/data" className="focus-ring inline-flex min-h-11 items-center font-bold text-[var(--accent)] hover:underline">
              データ仕様を見る →
            </Link>
            <a
              href="/standards-data/comparison.json"
              download
              data-cta="standards-data"
              data-cta-label="comparison-json"
              data-cta-placement="standards-compare-footer"
              className="focus-ring inline-flex min-h-11 items-center font-bold text-[var(--accent)] hover:underline"
            >
              比較結果JSONを取得
            </a>
          </div>
        </SectionCard>
      </SectionBlock>
    </PageShell>
  );
}

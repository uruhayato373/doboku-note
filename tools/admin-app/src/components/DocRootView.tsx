import type { ReactNode } from 'react';
import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { listDocuments } from '@/lib/document-store';
import { type RootDescriptor } from '@/lib/document-roots';
import { loadProjectEntries } from '@/lib/project';
import {
  DOCUMENT_TYPES,
  DOC_CHANNELS,
  DOC_RETENTIONS,
  DOCUMENT_TYPE_LABELS,
  DOC_CHANNEL_LABELS,
  DOC_RETENTION_LABELS,
  type DocChannel,
} from '@/lib/doc-taxonomy';

interface CardModel {
  key: string;
  href: string;
  title: string;
  summary: string;
  file: string;
  metaChips: ReactNode;
  footer?: ReactNode;
}

/**
 * ルート descriptor 1 つ分の一覧ビュー（read-only）。
 *
 * /docs・/knowledge・/plans が同じ実装を通る。Markdown が SSOT で、HTML はリクエスト時に
 * 生成して保存しない。編集導線は持たない（詳細画面の VS Code リンクのみ）。
 *
 * `docs` ルートだけ、物理ディレクトリの `category` の代わりに目的・チャネル・保持区分の
 * 3 軸フィルタ（documentType/channel/retention）を独立させる（DN-0103 Phase 02）。
 * /knowledge・/plans は taxonomy を持たないため、この 3 props を渡さなければ従来どおり動く。
 */
export function DocRootView({
  descriptor,
  query,
  category,
  documentType = '',
  channel = '',
  retention = '',
}: {
  descriptor: RootDescriptor;
  query: string;
  category: string;
  /** docs ルートだけが意味を持つ。他ルートでは常に空文字で無視される。 */
  documentType?: string;
  channel?: string;
  retention?: string;
}) {
  const isDocs = descriptor.id === 'docs';
  const q = query.trim().toLocaleLowerCase('ja');

  const docEntries = isDocs ? loadProjectEntries() : null;
  const plainEntries = isDocs ? null : listDocuments(descriptor);
  const totalCount = (docEntries ?? plainEntries ?? []).length;

  const categories = plainEntries ? [...new Set(plainEntries.map((e) => e.category))].sort() : [];

  const cards: CardModel[] = docEntries
    ? docEntries
        .filter((e) => {
          if (q && !e.searchText.includes(q)) return false;
          if (documentType && e.documentType !== documentType) return false;
          if (channel && !e.channel.includes(channel as DocChannel)) return false;
          if (retention && e.retention !== retention) return false;
          return true;
        })
        .map((e) => ({
          key: e.file,
          href: `${descriptor.routeBase}/${e.slug}`,
          title: e.title,
          summary: e.summary,
          file: e.file,
          metaChips: (
            <>
              <span className="chip">{DOCUMENT_TYPE_LABELS[e.documentType]}</span>
              {e.retention === 'temporary' && <span className="chip doc-badge-temporary">一時記録</span>}
              <span>{e.modifiedAt.slice(0, 10)}</span>
            </>
          ),
          footer:
            e.channel.length > 0 ? (
              <div className="doc-channel-chips">
                {e.channel.map((c) => (
                  <span className="chip chip-outline" key={c}>
                    {DOC_CHANNEL_LABELS[c]}
                  </span>
                ))}
              </div>
            ) : undefined,
        }))
    : (plainEntries ?? [])
        .filter((e) => (!category || e.category === category) && (!q || e.searchText.includes(q)))
        .map((e) => ({
          key: e.file,
          href: `${descriptor.routeBase}/${e.slug}`,
          title: e.title,
          summary: e.summary,
          file: e.file,
          metaChips: (
            <>
              <span className="chip">{e.category}</span>
              <span>{Math.max(1, Math.round(e.size / 1024))} KB</span>
              <span>{e.modifiedAt.slice(0, 10)}</span>
            </>
          ),
        }));

  const hasFilter = Boolean(q || (isDocs ? documentType || channel || retention : category));

  return (
    <>
      <PageHead
        title={descriptor.label}
        sub={`${cards.length} / ${totalCount} 件 · ${descriptor.filePrefix}/（read-only）`}
      />

      <form className="knowledge-toolbar">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="タイトル・本文・パスを検索"
          aria-label={`${descriptor.label}を検索`}
        />
        {isDocs ? (
          <>
            <select name="documentType" defaultValue={documentType} aria-label="目的">
              <option value="">全目的</option>
              {DOCUMENT_TYPES.map((t) => (
                <option value={t} key={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <select name="channel" defaultValue={channel} aria-label="チャネル">
              <option value="">全チャネル</option>
              {DOC_CHANNELS.map((c) => (
                <option value={c} key={c}>{DOC_CHANNEL_LABELS[c]}</option>
              ))}
            </select>
            <select name="retention" defaultValue={retention} aria-label="保持区分">
              <option value="">全区分</option>
              {DOC_RETENTIONS.map((r) => (
                <option value={r} key={r}>{DOC_RETENTION_LABELS[r]}</option>
              ))}
            </select>
          </>
        ) : (
          <select name="category" defaultValue={category} aria-label="分類">
            <option value="">全分類</option>
            {categories.map((c) => (
              <option value={c} key={c}>{c}</option>
            ))}
          </select>
        )}
        <button type="submit">絞り込む</button>
        {hasFilter && <Link href={descriptor.routeBase}>クリア</Link>}
      </form>

      <div className="knowledge-grid">
        {cards.map((item) => (
          <Link className="knowledge-card" href={item.href} key={item.key}>
            <div className="knowledge-card-meta">{item.metaChips}</div>
            <h2>{item.title}</h2>
            <p>{item.summary || '説明はありません。'}</p>
            {item.footer}
            <code>{item.file}</code>
          </Link>
        ))}
      </div>
      {cards.length === 0 && (
        <div className="card empty">{totalCount === 0 ? descriptor.emptyState : '一致する文書はありません。'}</div>
      )}
    </>
  );
}

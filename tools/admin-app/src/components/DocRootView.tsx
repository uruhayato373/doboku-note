import type { ReactNode } from 'react';
import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { Card, CardContent } from '@/components/ui/card';
import { listDocuments, matchesQuery } from '@/lib/document-store';
import { type RootDescriptor } from '@/lib/document-roots';
import { loadProjectEntries } from '@/lib/project';
import {
  DOCUMENT_TYPES,
  DOC_RETENTIONS,
  DOCUMENT_TYPE_LABELS,
  DOC_CHANNEL_LABELS,
  DOC_RETENTION_LABELS,
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
 * `docs` ルートは `category` を領域（先頭ディレクトリ・project.ts の sectionLabel）として使い、
 * 目的・保持区分（documentType/retention）の絞り込みを足す（DN-0103 Phase 02）。チャネルの絞り込みは
 * 出さない（frontmatter に channel を持つ docs が 0 本で、全件「横断」になるため）。
 * /knowledge・/plans は taxonomy を持たないため、この 2 props を渡さなければ従来どおり動く。
 */
/** 一覧は更新の新しい順（日付は git の最終コミット日。同日は題名順）。 */
const newestFirst = (a: { modifiedAt: string; title: string }, b: { modifiedAt: string; title: string }) =>
  b.modifiedAt.localeCompare(a.modifiedAt) || a.title.localeCompare(b.title, 'ja');

export function DocRootView({
  descriptor,
  query,
  category,
  documentType = '',
  retention = '',
}: {
  descriptor: RootDescriptor;
  query: string;
  category: string;
  /** docs ルートだけが意味を持つ。他ルートでは常に空文字で無視される。 */
  documentType?: string;
  retention?: string;
}) {
  const isDocs = descriptor.id === 'docs';

  const docEntries = isDocs ? loadProjectEntries() : null;
  const plainEntries = isDocs ? null : listDocuments(descriptor);
  const totalCount = (docEntries ?? plainEntries ?? []).length;

  const categories: { value: string; label: string }[] = docEntries
    ? [...new Map(docEntries.map((e) => [e.section, e.sectionLabel])).entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([value, label]) => ({ value, label }))
    : [...new Set((plainEntries ?? []).map((e) => e.category))].sort().map((c) => ({ value: c, label: c }));

  const cards: CardModel[] = docEntries
    ? docEntries
        .filter((e) => {
          if (!matchesQuery(e.searchText, query)) return false;
          if (category && e.section !== category) return false;
          if (documentType && e.documentType !== documentType) return false;
          if (retention && e.retention !== retention) return false;
          return true;
        })
        .sort(newestFirst)
        .map((e) => ({
          key: e.file,
          href: `${descriptor.routeBase}/${e.slug}`,
          title: e.title,
          summary: e.summary,
          file: e.file,
          metaChips: (
            <>
              <span className="chip">{e.sectionLabel}</span>
              <span className="chip chip-outline">{DOCUMENT_TYPE_LABELS[e.documentType]}</span>
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
        .filter((e) => (!category || e.category === category) && matchesQuery(e.searchText, query))
        .sort(newestFirst)
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

  const hasFilter = Boolean(query.trim() || category || (isDocs && (documentType || retention)));

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
        <select name="category" defaultValue={category} aria-label={isDocs ? '領域' : '分類'}>
          <option value="">{isDocs ? '全領域' : '全分類'}</option>
          {categories.map((c) => (
            <option value={c.value} key={c.value}>{c.label}</option>
          ))}
        </select>
        {isDocs && (
          <>
            <select name="documentType" defaultValue={documentType} aria-label="目的">
              <option value="">全目的</option>
              {DOCUMENT_TYPES.map((t) => (
                <option value={t} key={t}>{DOCUMENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <select name="retention" defaultValue={retention} aria-label="保持区分">
              <option value="">全区分</option>
              {DOC_RETENTIONS.map((r) => (
                <option value={r} key={r}>{DOC_RETENTION_LABELS[r]}</option>
              ))}
            </select>
          </>
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
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">{totalCount === 0 ? descriptor.emptyState : '一致する文書はありません。'}</CardContent>
        </Card>
      )}
    </>
  );
}

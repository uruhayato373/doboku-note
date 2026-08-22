import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { listDocuments } from '@/lib/document-store';
import { type RootDescriptor } from '@/lib/document-roots';

/**
 * ルート descriptor 1 つ分の一覧ビュー（read-only）。
 *
 * /docs・/knowledge・/plans が同じ実装を通る。Markdown が SSOT で、HTML はリクエスト時に
 * 生成して保存しない。編集導線は持たない（詳細画面の VS Code リンクのみ）。
 */
export function DocRootView({
  descriptor,
  query,
  category,
}: {
  descriptor: RootDescriptor;
  query: string;
  category: string;
}) {
  const entries = listDocuments(descriptor);

  const q = query.trim().toLocaleLowerCase('ja');
  const categories = [...new Set(entries.map((e) => e.category))].sort();
  const items = entries.filter(
    (e) => (!category || e.category === category) && (!q || e.searchText.includes(q)),
  );

  return (
    <>
      <PageHead
        title={descriptor.label}
        sub={`${items.length} / ${entries.length} 件 · ${descriptor.filePrefix}/（read-only）`}
      />

      <form className="knowledge-toolbar">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="タイトル・本文・パスを検索"
          aria-label={`${descriptor.label}を検索`}
        />
        <select name="category" defaultValue={category} aria-label="分類">
          <option value="">全分類</option>
          {categories.map((c) => (
            <option value={c} key={c}>{c}</option>
          ))}
        </select>
        <button type="submit">絞り込む</button>
        {(q || category) && <Link href={descriptor.routeBase}>クリア</Link>}
      </form>

      <div className="knowledge-grid">
        {items.map((item) => (
          <Link
            className="knowledge-card"
            href={`${descriptor.routeBase}/${item.slug}`}
            key={item.file}
          >
            <div className="knowledge-card-meta">
              <span className="chip">{item.category}</span>
              <span>{Math.max(1, Math.round(item.size / 1024))} KB</span>
              <span>{item.modifiedAt.slice(0, 10)}</span>
            </div>
            <h2>{item.title}</h2>
            <p>{item.summary || '説明はありません。'}</p>
            <code>{item.file}</code>
          </Link>
        ))}
      </div>
      {items.length === 0 && <div className="card empty">{entries.length === 0 ? descriptor.emptyState : '一致する文書はありません。'}</div>}
    </>
  );
}

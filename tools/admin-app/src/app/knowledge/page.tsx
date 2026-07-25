import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { loadKnowledge } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ q?: string; category?: string }> };

export default async function KnowledgePage({ searchParams }: Props) {
  const params = await searchParams;
  const query = (params.q ?? '').trim().toLocaleLowerCase('ja');
  const selectedCategory = params.category ?? '';
  const all = loadKnowledge();
  const categories = [...new Set(all.map((item) => item.category))].sort();
  const items = all.filter(
    (item) =>
      (!selectedCategory || item.category === selectedCategory) &&
      (!query || item.searchText.includes(query)),
  );

  return (
    <>
      <PageHead
        title="ナレッジ"
        sub={`${items.length} / ${all.length} 件 · .claude/knowledge/（人向けビュー）`}
      />

      <form className="knowledge-toolbar">
        <input
          name="q"
          type="search"
          defaultValue={params.q ?? ''}
          placeholder="タイトル・本文・パスを検索"
          aria-label="ナレッジを検索"
        />
        <select name="category" defaultValue={selectedCategory} aria-label="カテゴリ">
          <option value="">全カテゴリ</option>
          {categories.map((category) => (
            <option value={category} key={category}>
              {category}
            </option>
          ))}
        </select>
        <button type="submit">絞り込む</button>
        {(query || selectedCategory) && <Link href="/knowledge">クリア</Link>}
      </form>

      <div className="knowledge-grid">
        {items.map((item) => (
          <Link className="knowledge-card" href={`/knowledge/${item.slug}`} key={item.file}>
            <div className="knowledge-card-meta">
              <span className="chip">{item.category}</span>
              <span>{Math.max(1, Math.round(item.size / 1024))} KB</span>
            </div>
            <h2>{item.title}</h2>
            <p>{item.summary || '説明はありません。'}</p>
            <code>{item.file}</code>
          </Link>
        ))}
      </div>
      {items.length === 0 && <div className="card empty">一致するナレッジはありません。</div>}
    </>
  );
}

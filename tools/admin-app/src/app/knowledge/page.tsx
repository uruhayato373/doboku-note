import Link from 'next/link';
import { DataTable, DetailList, DetailSheet, DetailText, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { loadKnowledge } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

const COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '題名' },
  { key: 'category', label: 'カテゴリ' },
  { key: 'size', label: '大きさ(KB)', num: true },
];

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

  const rows: DataTableRow[] = items.map((item) => {
    const kb = Math.max(1, Math.round(item.size / 1024));
    return {
      id: item.file,
      values: { title: item.title, category: item.category, size: kb },
      cells: {
        title: (
          <span className="inline-flex items-center gap-3">
            <Link href={`/knowledge/${item.slug}`} className="underline-offset-4 hover:underline">{item.title}</Link>
            <DetailSheet trigger={<span className="text-muted-foreground">概要</span>} title={item.title} description={item.category}>
              <DetailText title="概要" items={[item.summary]} />
              <DetailList items={[{ label: 'ファイル', value: <code className="break-all text-xs">{item.file}</code> }]} />
            </DetailSheet>
          </span>
        ),
      },
    };
  });

  return (
    <>
      <PageHead
        title="ナレッジ"
        sub={`${items.length} / ${all.length} 件`}
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

      <DataTable columns={COLUMNS} rows={rows} pageSize={50} emptyText="一致するナレッジはありません。" />
    </>
  );
}

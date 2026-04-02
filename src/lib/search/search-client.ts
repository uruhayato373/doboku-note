/**
 * MiniSearch ベースのクライアントサイド検索クライアント
 * ビルド時に生成された search-index.json を読み込み、全文検索を提供
 */
import MiniSearch from "minisearch";
import { tokenize } from "./tokenize";

export interface SearchIndexEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory: string;
  tags: string[];
  date: string;
  readTime: string;
  excerpt: string;
}

export interface SearchQuery {
  q: string;
  category?: string;
  subCategory?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: "relevance" | "date" | "readTime";
}

export interface SearchResult {
  posts: SearchIndexEntry[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
}

const STORE_FIELDS = [
  "id",
  "title",
  "description",
  "category",
  "subCategory",
  "tags",
  "date",
  "readTime",
  "excerpt",
] as const;

const MINISEARCH_OPTIONS = {
  fields: ["title", "description", "excerpt"],
  storeFields: [...STORE_FIELDS],
  tokenize,
  searchOptions: {
    boost: { title: 3, description: 2 },
    fuzzy: 0.2,
    prefix: true,
  },
};

let miniSearchInstance: MiniSearch<SearchIndexEntry> | null = null;

/** MiniSearch インスタンスを取得（シングルトン） */
async function getMiniSearch(): Promise<MiniSearch<SearchIndexEntry>> {
  if (miniSearchInstance) return miniSearchInstance;

  const res = await fetch("/search-index.json");
  if (!res.ok) throw new Error("検索インデックスの読み込みに失敗しました");

  const json = await res.json();
  miniSearchInstance = MiniSearch.loadJS(json, MINISEARCH_OPTIONS);
  return miniSearchInstance;
}

/** フィルタリング（カテゴリ・タグ） */
function applyFilters(
  entries: SearchIndexEntry[],
  query: SearchQuery
): SearchIndexEntry[] {
  let filtered = entries;

  if (query.category) {
    filtered = filtered.filter((e) => e.category === query.category);
  }
  if (query.subCategory) {
    filtered = filtered.filter((e) => e.subCategory === query.subCategory);
  }
  if (query.tags && query.tags.length > 0) {
    filtered = filtered.filter((e) =>
      query.tags!.some((tag) => e.tags?.includes(tag))
    );
  }

  return filtered;
}

/** ソート */
function applySort(
  entries: SearchIndexEntry[],
  sortBy: string
): SearchIndexEntry[] {
  if (sortBy === "date") {
    return [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
  if (sortBy === "readTime") {
    return [...entries].sort(
      (a, b) => parseInt(a.readTime) - parseInt(b.readTime)
    );
  }
  return entries;
}

/** 検索実行 */
export async function search(query: SearchQuery): Promise<SearchResult> {
  const q = query.q.trim();
  const page = query.page || 1;
  const limit = query.limit || 10;

  if (!q) {
    return { posts: [], total: 0, page, totalPages: 0, query: "" };
  }

  const ms = await getMiniSearch();
  const rawResults = ms.search(q, { prefix: true, fuzzy: 0.2 });

  // MiniSearch の結果から stored fields を取り出す
  let entries: SearchIndexEntry[] = rawResults.map((r) => ({
    id: r.id as string,
    title: (r as Record<string, unknown>).title as string,
    description: (r as Record<string, unknown>).description as string,
    category: (r as Record<string, unknown>).category as string,
    subCategory: (r as Record<string, unknown>).subCategory as string,
    tags: (r as Record<string, unknown>).tags as string[],
    date: (r as Record<string, unknown>).date as string,
    readTime: (r as Record<string, unknown>).readTime as string,
    excerpt: (r as Record<string, unknown>).excerpt as string,
  }));

  // フィルタリング
  entries = applyFilters(entries, query);

  // ソート（relevance以外の場合）
  if (query.sortBy && query.sortBy !== "relevance") {
    entries = applySort(entries, query.sortBy);
  }

  const total = entries.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paged = entries.slice(start, start + limit);

  return { posts: paged, total, page, totalPages, query: q };
}

/** 検索候補を取得 */
export async function getSuggestions(
  q: string,
  limit: number = 5
): Promise<string[]> {
  if (q.length < 2) return [];

  const ms = await getMiniSearch();
  const results = ms.search(q, { prefix: true, fuzzy: 0.2 });
  return results.slice(0, limit).map((r) => (r as Record<string, unknown>).title as string);
}

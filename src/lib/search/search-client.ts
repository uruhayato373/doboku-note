/**
 * Pagefind ベースのクライアントサイド検索クライアント
 * ビルド時に生成された /pagefind/ インデックスを動的ロードして全文検索を提供
 */

export interface SearchIndexEntry {
  id: string;
  title: string;
  description: string;
  path: string;
  category: string;
  tags: string[];
  excerpt: string; // HTML (<mark> ハイライト付き)
}

export interface SearchQuery {
  q: string;
  category?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: "relevance";
}

export interface SearchResult {
  posts: SearchIndexEntry[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
}

type PagefindModule = {
  init(): Promise<void>;
  search(q: string): Promise<{
    results: Array<{ id: string; data(): Promise<PagefindData> }>;
    unfilteredResultCount: number;
  }>;
};

type PagefindData = {
  url: string;
  excerpt: string;
  meta: { title?: string; image?: string };
  word_count: number;
};

let pf: PagefindModule | null = null;

async function getPagefind(): Promise<PagefindModule> {
  if (pf) return pf;
  try {
    // @ts-expect-error - pagefind runtime is served from /pagefind/ at run time only
    pf = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "/pagefind/pagefind.js");
    await pf!.init();
    return pf!;
  } catch {
    throw new Error(
      "検索インデックスが未生成です。npm run build を実行してください。"
    );
  }
}

function categoryFromPath(path: string): string {
  const exam = path.match(/^\/exam\/([^/]+)/)?.[1];
  if (exam) return exam;
  if (path.startsWith('/practice/')) return 'civil-practice';
  if (path.startsWith('/standards/')) return 'reference-materials';
  return "";
}

function stripMark(html: string): string {
  return html.replace(/<\/?mark>/g, "");
}

function toEntry(data: PagefindData): SearchIndexEntry {
  const path = data.url;
  return {
    id: path.replace(/^\//, ""),
    title: data.meta.title ?? "",
    description: stripMark(data.excerpt),
    path,
    category: categoryFromPath(path),
    tags: [],
    excerpt: data.excerpt,
  };
}

export async function search(query: SearchQuery): Promise<SearchResult> {
  const q = query.q.trim();
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  if (!q) return { posts: [], total: 0, page, totalPages: 0, query: "" };

  const engine = await getPagefind();
  const raw = await engine.search(q);
  const dataList = await Promise.all(raw.results.map((r) => r.data()));

  let entries = dataList.map(toEntry);

  if (query.category) {
    entries = entries.filter((e) => e.category === query.category);
  }

  const total = entries.length;
  const totalPages = Math.ceil(total / limit);
  const paged = entries.slice((page - 1) * limit, page * limit);

  return { posts: paged, total, page, totalPages, query: q };
}

export async function getSuggestions(
  q: string,
  limit = 5
): Promise<string[]> {
  if (q.length < 2) return [];
  try {
    const engine = await getPagefind();
    const raw = await engine.search(q);
    const top = raw.results.slice(0, limit);
    const dataList = await Promise.all(top.map((r) => r.data()));
    return dataList.map((d) => d.meta.title ?? "").filter(Boolean);
  } catch {
    return [];
  }
}

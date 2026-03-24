/**
 * D1 database client utilities.
 *
 * In production on Cloudflare Pages, the DB binding is available
 * through the platform env. For local development, use wrangler dev.
 */

export interface Env {
  DB: D1Database;
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(sql: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: object;
}

interface D1ExecResult {
  count: number;
  duration: number;
}

// Record a page view
export async function recordPageView(
  db: D1Database,
  pageId: string,
  referrer?: string,
  country?: string
) {
  await db
    .prepare(
      'INSERT INTO page_views (page_id, referrer, country) VALUES (?, ?, ?)'
    )
    .bind(pageId, referrer || null, country || null)
    .run();

  await db
    .prepare(
      'UPDATE content_pages SET view_count = view_count + 1, updated_at = datetime(\'now\') WHERE id = ?'
    )
    .bind(pageId)
    .run();
}

// Record feedback
export async function recordFeedback(
  db: D1Database,
  pageId: string,
  rating: number,
  comment?: string
) {
  await db
    .prepare(
      'INSERT INTO page_feedback (page_id, rating, comment) VALUES (?, ?, ?)'
    )
    .bind(pageId, rating, comment || null)
    .run();
}

// Get popular pages
export async function getPopularPages(db: D1Database, limit = 10) {
  const result = await db
    .prepare(
      'SELECT id, title, category, view_count FROM content_pages ORDER BY view_count DESC LIMIT ?'
    )
    .bind(limit)
    .all();
  return result.results;
}

// Record search query
export async function recordSearch(
  db: D1Database,
  query: string,
  resultsCount: number,
  clickedPageId?: string
) {
  await db
    .prepare(
      'INSERT INTO search_queries (query, results_count, clicked_page_id) VALUES (?, ?, ?)'
    )
    .bind(query, resultsCount, clickedPageId || null)
    .run();
}

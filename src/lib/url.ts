/**
 * URL resolution utilities for doboku-note.
 * Handles mapping between file paths, doc IDs, and URL slugs.
 */

/**
 * Convert a URL slug array to a path string.
 * ['general', 'common-specs', 'common'] → '/docs/general/common-specs/common'
 */
export function slugToPath(slug: string[]): string {
  return '/docs/' + slug.join('/');
}

/**
 * Convert a path string to a slug array.
 * '/docs/general/common-specs/common' → ['general', 'common-specs', 'common']
 */
export function pathToSlug(path: string): string[] {
  return path.replace(/^\/docs\//, '').split('/').filter(Boolean);
}

/**
 * Generate a heading ID from text (for anchor links).
 * Supports Japanese characters.
 */
export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .trim()
    .replace(/[^\w\u3000-\u9fff\uf900-\ufaff]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if a URL is external.
 */
export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

/**
 * Local MDX post reader (server / build-time only).
 *
 * All access to `content/site/**` lives here, and `fs` / `path` are obtained
 * via `createRequire` rather than static ESM imports. Turbopack's dependency
 * tracer applies a "broad file pattern" heuristic to dynamic `fs`/`path.resolve`
 * calls whose base directory it can constant-fold to a literal (here
 * `content/site`, which contains ~18k files). Hiding the node builtins behind
 * `createRequire` keeps Turbopack from recognising them as `node:fs` / `node:path`,
 * so the dynamic reads are no longer traced as a whole-directory glob.
 *
 * This module is imported only from server code paths (`getDoc` / `getDocMeta` /
 * `getAllDocSlugs`), which fall back to R2 when the local directory is absent.
 */
import { createRequire } from 'node:module';
import { SITE_CONTENT_ROOT } from '../../scripts/lib/repository-paths.mjs';

const nodeRequire = createRequire(import.meta.url);
const fs = nodeRequire('fs') as typeof import('fs');
const path = nodeRequire('path') as typeof import('path');

const localContentDirectory = SITE_CONTENT_ROOT;

/**
 * Whether the local content root exists (dev / static-export build). When false,
 * callers should fall back to R2.
 */
export function localPostsExist(): boolean {
  return fs.existsSync(localContentDirectory);
}

/**
 * Resolve a relative post path against the local content root with path-traversal
 * validation. Returns the absolute file path, or null if the input is unsafe or
 * not an .mdx file.
 *
 * Validation and the final join are done with plain string operations rather than
 * `path.resolve` / `path.join` on the dynamic `relativePath`: Turbopack's tracer
 * treats a `path.resolve(<known dir>, <dynamic>)` call as a broad file-pattern
 * read of the whole directory. String concatenation avoids that heuristic while
 * still rejecting absolute paths, null bytes, and `..` / `.` traversal segments.
 */
function resolveLocalPostPath(relativePath: string): string | null {
  if (!relativePath) return null;
  if (relativePath.includes('\0')) return null;
  if (!relativePath.endsWith('.mdx')) return null;

  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.startsWith('/')) return null;        // posix absolute
  if (/^[A-Za-z]:/.test(normalized)) return null;      // windows drive-absolute
  const segments = normalized.split('/');
  if (segments.some((s) => s === '..' || s === '.' || s === '')) return null;

  return localContentDirectory + path.sep + segments.join(path.sep);
}

/**
 * Read a local MDX post by its relative path, or null if the local content root
 * or the resolved file does not exist.
 */
export function readLocalPost(relativePath: string): string | null {
  if (!fs.existsSync(localContentDirectory)) return null;
  const filePath = resolveLocalPostPath(relativePath);
  if (!filePath) return null;
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Recursively find all .mdx files under the local content root and return
 * slug + relative path pairs. Converts path segments to hyphen-separated slug
 * strings for the flat URL structure.
 *
 * Two naming conventions:
 * - article.mdx: directory path becomes the slug (e.g., followership/article.mdx -> followership)
 * - Individual files: filename included in slug (e.g., guide/strategy.mdx -> guide-strategy)
 */
export function findLocalMdxFiles(): { slug: string; relativePath: string }[] {
  if (!fs.existsSync(localContentDirectory)) return [];
  return walk(localContentDirectory, []);
}

function walk(dir: string, basePath: string[]): { slug: string; relativePath: string }[] {
  const results: { slug: string; relativePath: string }[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const fileName = entry.name.replace(/\.mdx$/, '');

    if (entry.isDirectory()) {
      const newPath = [...basePath, fileName];
      results.push(...walk(fullPath, newPath));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      // For article.mdx, use the directory path as slug (convention: {slug}/article.mdx -> {slug})
      // For other .mdx files, include the filename in the slug
      const slugPath = fileName === 'article' ? basePath : [...basePath, fileName];
      if (slugPath.length > 0) {
        const slug = slugPath.join('-');
        const relativePath = [...basePath, entry.name].join('/');
        results.push({ slug, relativePath });
      }
    }
  }

  return results;
}

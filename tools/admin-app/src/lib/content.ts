import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { repoPath } from './repo-root';

/**
 * content.ts — 記事 / note 記事 / マガジン一覧（読み取り専用）。
 * tools/admin/lib/content.mjs を findRepoRoot ベースで移植。
 *
 *   articlesIndex() … src/config/doc-meta-index.json（refresh-indexes 生成）
 *   magazines()     … src/lib/note-magazines.ts を regex 抽出（tsx 不要・verify と同方式）
 *   noteArticles()  … docs/note/** の article*.md frontmatter
 */

function readJson<T>(abs: string): T | null {
  try {
    return JSON.parse(readFileSync(abs, 'utf8')) as T;
  } catch {
    return null;
  }
}

// ─── サイト記事一覧（doc-meta-index.json）────────────────────
export interface SiteDoc {
  slug: string;
  title: string;
  category: string;
  group: string;
  published: boolean;
  publishedAt: string | null;
  dateModified: string | null;
  reviewStatus: string | null;
}
export interface ArticlesIndex {
  summary: Record<string, number>;
  generatedAt: string | null;
  docs: SiteDoc[];
}

export function articlesIndex(): ArticlesIndex {
  const d = readJson<{
    summary?: Record<string, number>;
    generated_at?: string;
    docs?: Record<string, Record<string, unknown>>;
  }>(repoPath('src', 'config', 'doc-meta-index.json'));
  if (!d) return { summary: {}, generatedAt: null, docs: [] };
  const docs: SiteDoc[] = Object.entries(d.docs ?? {}).map(([slug, m]) => ({
    slug,
    title: (m.title as string) || slug,
    category: (m.category as string) || '?',
    group: (m.group as string) || 'other',
    published: m.published !== false,
    publishedAt: (m.publishedAt as string) || (m.created as string) || null,
    dateModified: (m.dateModified as string) || null,
    reviewStatus: (m.reviewStatus as string) || null,
  }));
  docs.sort(
    (a, b) =>
      (b.publishedAt || '').localeCompare(a.publishedAt || '') || a.slug.localeCompare(b.slug),
  );
  return { summary: d.summary ?? {}, generatedAt: d.generated_at ?? null, docs };
}

// ─── マガジン一覧（note-magazines.ts の regex 抽出）──────────
export interface Magazine {
  id: string;
  published: boolean;
  noteUrl: string;
  key: string | null;
  title: string | null;
  badge: string | null;
  priceStr: string | null;
  priceNum: number | null;
}

export function magazines(): Magazine[] {
  const sot = repoPath('src', 'lib', 'note-magazines.ts');
  if (!existsSync(sot)) return [];
  const ts = readFileSync(sot, 'utf8');
  // id / published / noteUrl はこの順で固定（ファイル規約・verify-note-magazines.mjs と同じ）
  const re = /id:\s*'([^']+)',\s*published:\s*(true|false),\s*noteUrl:\s*'([^']*)'/g;
  const idx: { id: string; published: boolean; noteUrl: string; at: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(ts)) !== null) {
    idx.push({ id: m[1]!, published: m[2] === 'true', noteUrl: m[3]!, at: m.index });
  }
  return idx.map((cur, i) => {
    const slice = ts.slice(cur.at, idx[i + 1] ? idx[i + 1]!.at : ts.length);
    const pick = (re2: RegExp): string | null => {
      const mm = slice.match(re2);
      return mm ? mm[1]! : null;
    };
    const priceStr = pick(/price:\s*'([^']*)'/);
    return {
      id: cur.id,
      published: cur.published,
      noteUrl: cur.noteUrl,
      key: (cur.noteUrl.match(/\/m\/(m[0-9a-f]+)/) || [])[1] ?? null,
      title: pick(/title:\s*'([^']*)'/) ?? pick(/title:\s*"([^"]*)"/),
      badge: pick(/badge:\s*'([^']*)'/),
      priceStr,
      priceNum: priceStr
        ? Number((priceStr.match(/¥?\s*([\d,]+)/) || [])[1]?.replace(/,/g, '')) || null
        : null,
    };
  });
}

// ─── note 記事一覧（docs/note の article*.md frontmatter）────
export interface NoteArticle {
  rel: string;
  dir: string;
  file: string;
  title: string;
  pricing: string;
  series: string | null;
  noteUrl: string | null;
  published: boolean;
  exam: string;
}

export function noteArticles(): NoteArticle[] {
  const NOTE = repoPath('docs', 'note');
  const items: NoteArticle[] = [];
  const walk = (absDir: string, rel: string) => {
    let entries;
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (e.name === 'img') continue;
        walk(join(absDir, e.name), rel ? `${rel}/${e.name}` : e.name);
      } else if (/^article[A-Za-z0-9-]*\.md$/.test(e.name)) {
        let fm: Record<string, unknown> = {};
        try {
          fm = (matter(readFileSync(join(absDir, e.name), 'utf8')).data as Record<string, unknown>) ?? {};
        } catch {
          /* skip */
        }
        items.push({
          rel: `${rel}/${e.name}`,
          dir: rel,
          file: e.name,
          title: (fm.title as string) || rel.split('/').pop() || rel,
          pricing: (fm.notePricing as string) || 'unknown',
          series: (fm.noteSeries as string) || (fm.noteMagazine as string) || null,
          noteUrl: (fm.noteUrl as string) || null,
          published: !!fm.noteUrl, // noteUrl があれば公開済みと見なす
          exam: rel.split('/')[0] ?? '',
        });
      }
    }
  };
  if (existsSync(NOTE)) walk(NOTE, '');
  items.sort((a, b) => a.rel.localeCompare(b.rel));
  return items;
}

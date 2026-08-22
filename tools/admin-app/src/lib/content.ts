import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { findRepoRoot, repoPath } from './repo-root';
import { NOTE_CONTENT_ROOT } from '../../../../scripts/lib/repository-paths.mjs';

/**
 * content.ts — 記事 / note 記事 / マガジン一覧（読み取り専用）。
 * tools/admin/lib/content.mjs を findRepoRoot ベースで移植。
 *
 *   articlesIndex() … src/config/doc-meta-index.json（refresh-indexes 生成）
 *   magazines()     … src/lib/note-magazines.ts を regex 抽出（tsx 不要・verify と同方式）
 *   noteArticles()  … content/note/** の article*.md frontmatter
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

// ─── note 記事一覧（content/note の article*.md frontmatter）────
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
  const NOTE = NOTE_CONTENT_ROOT;
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

// ─── note 要再公開ドリフト（check-note-republish --json）─────────
/**
 * `check-note-republish` は「公開時の本文 hash」と現在の本文を突合して
 * **note 側の再公開が要るか**を出す（CLI + 週次 PDCA で運用中）。ここでは
 * 管理画面の note 記事タブに列として出すためだけに読む。
 *
 * 判定ロジックは CLI 側に残す（admin は既存 CLI を child_process 実行し、
 * ガードは CLI に置く方針 — tools/admin-app/README.md）。
 *
 * **取得に失敗したときは「ドリフト無し」ではなく `ok:false` を返す**。
 * 空の Set を返すと画面が全件緑になり、検査していないことが「問題なし」に
 * 化ける（CLAUDE.md §9「検査ゼロを PASS と呼ばない」）。
 */
export interface NoteRepublishState {
  ok: boolean;
  error: string | null;
  drift: Set<string>;
  unknown: Set<string>;
  counts: { synced: number; drift: number; unknown: number };
}

export function noteRepublishState(): NoteRepublishState {
  const empty = { drift: new Set<string>(), unknown: new Set<string>(), counts: { synced: 0, drift: 0, unknown: 0 } };
  try {
    const out = execFileSync(process.execPath, [repoPath('scripts', 'check-note-republish.mjs'), '--json'], {
      cwd: findRepoRoot(),
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    const d = JSON.parse(out) as {
      synced?: number;
      drift?: number;
      unknown?: number;
      driftFiles?: string[];
      unknownFiles?: string[];
    };
    return {
      ok: true,
      error: null,
      drift: new Set(d.driftFiles ?? []),
      unknown: new Set(d.unknownFiles ?? []),
      counts: { synced: d.synced ?? 0, drift: d.drift ?? 0, unknown: d.unknown ?? 0 },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message.slice(0, 200), ...empty };
  }
}

/**
 * note 記事の rel（`{dir}/{file}`）を check-note-republish が返すリポジトリ相対パスへ揃える。
 * 置き場をパス定義（repository-paths.mjs）から導出する — 'content/note' を文字列で
 * 書くと、次に置き場が動いたとき静かに 0 件マッチになる。
 */
export function noteRepoRelPath(rel: string): string {
  const root = relative(findRepoRoot(), NOTE_CONTENT_ROOT).replace(/\\/g, '/');
  return `${root}/${rel.replace(/^\/+/, '')}`;
}

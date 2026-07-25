import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';
import { repoPath } from './repo-root';

const ROOT = repoPath('.claude', 'knowledge');
const ALLOWED_EXTENSIONS = new Set(['.md', '.json']);
const toPosix = (value: string) => value.split(sep).join('/');

export interface KnowledgeEntry {
  slug: string;
  file: string;
  title: string;
  category: string;
  summary: string;
  modifiedAt: string;
  size: number;
  searchText: string;
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (ALLOWED_EXTENSIONS.has(extname(entry.name))) out.push(path);
  }
  return out;
}

function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function loadKnowledge(): KnowledgeEntry[] {
  return walk(ROOT)
    .map((absolute) => {
      const rel = toPosix(relative(ROOT, absolute));
      const file = `.claude/knowledge/${rel}`;
      const raw = readFileSync(absolute, 'utf8');
      const extension = extname(rel);
      const parsed: { data: Record<string, unknown>; content: string } =
        extension === '.md' ? matter(raw) : { data: {}, content: raw };
      const heading = parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
      const title = String(parsed.data.title ?? heading ?? rel.replace(/\.(md|json)$/, ''));
      const category = rel.split('/')[0] ?? 'other';
      const text = plainText(parsed.content);
      const stats = statSync(absolute);
      return {
        slug: rel.replace(/\.(md|json)$/, ''),
        file,
        title,
        category,
        summary: text.slice(0, 180),
        modifiedAt: stats.mtime.toISOString(),
        size: stats.size,
        searchText: `${title} ${rel} ${text}`.toLocaleLowerCase('ja'),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'ja'));
}

export function loadKnowledgeDocument(slugParts: string[]) {
  const slug = slugParts.join('/');
  const candidates = [resolve(ROOT, `${slug}.md`), resolve(ROOT, `${slug}.json`)];
  const rootPrefix = `${resolve(ROOT)}${sep}`;
  const absolute = candidates.find(
    (candidate) => candidate.startsWith(rootPrefix) && existsSync(candidate),
  );
  if (!absolute) return null;

  const raw = readFileSync(absolute, 'utf8');
  const rel = toPosix(relative(ROOT, absolute));
  if (extname(absolute) === '.json') {
    let formatted = raw;
    try {
      formatted = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      // 壊れた JSON も Admin で確認できるよう原文を表示する。
    }
    return {
      title: rel,
      file: `.claude/knowledge/${rel}`,
      html: '',
      json: formatted,
    };
  }

  const parsed = matter(raw);
  const heading = parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const html = String(
    remark().use(remarkGfm).use(remarkHtml, { sanitize: true }).processSync(parsed.content),
  );
  return {
    title: String(parsed.data.title ?? heading ?? rel.replace(/\.md$/, '')),
    file: `.claude/knowledge/${rel}`,
    html,
    json: null,
  };
}

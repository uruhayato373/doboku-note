import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import matter from 'gray-matter';
import { repoPath } from './repo-root';

/**
 * registry.ts — .claude/agents/*.md と .claude/skills/**\/SKILL.md の
 * frontmatter をパースして一覧化する。
 * frontmatter 破損はページを落とさず errors[] に集約する。
 */

export interface AgentEntry {
  name: string;
  description: string;
  model: string | null;
  tools: string | null;
  file: string; // repo-relative
}

export interface SkillEntry {
  name: string;
  description: string;
  category: string; // skills/ 直下ディレクトリ名
  file: string; // repo-relative
}

export interface RegistryResult<T> {
  items: T[];
  errors: string[];
}

const toPosix = (p: string) => p.split(sep).join('/');

function firstLine(s: unknown): string {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function loadAgents(): RegistryResult<AgentEntry> {
  const dir = repoPath('.claude', 'agents');
  const items: AgentEntry[] = [];
  const errors: string[] = [];
  if (!existsSync(dir)) return { items, errors };
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.md')).sort()) {
    const abs = join(dir, f);
    try {
      const { data } = matter(readFileSync(abs, 'utf8'));
      items.push({
        name: String(data.name ?? f.replace(/\.md$/, '')),
        description: firstLine(data.description),
        model: data.model ? String(data.model) : null,
        tools: data.tools ? String(data.tools) : null,
        file: '.claude/agents/' + f,
      });
    } catch (e) {
      errors.push(`${f}: ${(e as Error).message}`);
    }
  }
  return { items, errors };
}

/** skills/ 配下を再帰走査して SKILL.md を集める。 */
function findSkillFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'SKILL.md') out.push(p);
    }
  };
  if (existsSync(root)) walk(root);
  return out;
}

export function loadSkills(): RegistryResult<SkillEntry> {
  const root = repoPath('.claude', 'skills');
  const items: SkillEntry[] = [];
  const errors: string[] = [];
  for (const abs of findSkillFiles(root).sort()) {
    const rel = toPosix(relative(repoPath(), abs));
    const category = rel.split('/')[2] ?? 'その他'; // .claude/skills/<category>/...
    try {
      const { data } = matter(readFileSync(abs, 'utf8'));
      items.push({
        name: String(data.name ?? rel.split('/').slice(-2, -1)[0] ?? rel),
        description: firstLine(data.description),
        category,
        file: rel,
      });
    } catch (e) {
      errors.push(`${rel}: ${(e as Error).message}`);
    }
  }
  return { items, errors };
}

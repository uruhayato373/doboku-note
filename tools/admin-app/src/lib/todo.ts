import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo-root';

/**
 * todo.ts — docs/todo/*.md の read-only 統合ビュー。
 * tools/admin/lib/todo.mjs の機械読取契約を findRepoRoot ベースで移植。
 *
 * backlog.md 契約:
 *   `## 🔴/🟡/🟢/🟣 …` = tier セクション / `### タスク名` = カード /
 *   見出し直下 `タグ: [カテゴリ] [Codex候補]` = カテゴリ + Codex フラグ
 */

export type Tier = 'high' | 'mid' | 'low' | 'hold';

const TIER: Record<string, Tier> = { '🔴': 'high', '🟡': 'mid', '🟢': 'low', '🟣': 'hold' };

interface FileSpec {
  id: string;
  file: string;
  label: string;
  mode: 'backlog' | 'sections';
  level?: number;
}

const FILES: FileSpec[] = [
  { id: 'backlog', file: 'backlog.md', label: 'バックログ', mode: 'backlog' },
  { id: 'weekly', file: 'weekly.md', label: '週間', mode: 'sections', level: 2 },
  { id: 'monthly', file: 'monthly.md', label: '月間', mode: 'sections', level: 3 },
  { id: 'annual', file: 'annual.md', label: '年間', mode: 'sections', level: 3 },
  { id: 'measurement', file: 'measurement-infra-enhancement.md', label: '計測基盤', mode: 'sections', level: 3 },
  { id: 'codex', file: 'codex-integration.md', label: 'Codex方針', mode: 'sections', level: 2 },
  { id: 'refsites', file: 'reference-sites.md', label: '参考サイト', mode: 'sections', level: 2 },
];

export interface TodoCard {
  file: string;
  fileLabel: string;
  path: string;
  abs: string;
  line: number;
  tier: Tier | null;
  category: string;
  title: string;
  codex: boolean;
  body: string;
}

function tierOf(text: string): Tier | null {
  for (const [emoji, tier] of Object.entries(TIER)) if (text.includes(emoji)) return tier;
  return null;
}

function parseBacklog(lines: string[], f: FileSpec, todoDir: string): TodoCard[] {
  const out: TodoCard[] = [];
  let tier: Tier | null = null;
  let cur: (TodoCard & { bodyLines: string[] }) | null = null;
  const flush = () => {
    if (cur) {
      const { bodyLines, ...card } = cur;
      card.body = bodyLines.join('\n').trim();
      out.push(card);
      cur = null;
    }
  };
  lines.forEach((ln, i) => {
    if (/^###\s+/.test(ln)) {
      flush();
      if (tier) {
        cur = {
          file: f.id,
          fileLabel: f.label,
          path: 'docs/todo/' + f.file,
          abs: join(todoDir, f.file),
          line: i + 1,
          tier,
          category: '未分類',
          title: ln.replace(/^###\s+/, '').trim(),
          codex: false,
          body: '',
          bodyLines: [],
        };
      }
      return;
    }
    if (/^##\s+/.test(ln)) {
      flush();
      tier = tierOf(ln);
      return;
    }
    if (!cur) return;
    const tag = ln.match(/^タグ:\s*(.+)/);
    if (tag && cur.bodyLines.filter((l) => l.trim()).length === 0) {
      const tokens = [...tag[1]!.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]!);
      cur.codex = tokens.includes('Codex候補');
      cur.category = tokens.find((t) => t !== 'Codex候補') ?? '未分類';
      return;
    }
    cur.bodyLines.push(ln);
  });
  flush();
  return out;
}

function parseSections(lines: string[], f: FileSpec, todoDir: string): TodoCard[] {
  const out: TodoCard[] = [];
  let cur: (TodoCard & { bodyLines: string[] }) | null = null;
  const level = f.level ?? 2;
  const open = new RegExp(`^#{${level}}\\s+(.*)`);
  const close = new RegExp(`^#{1,${level}}\\s+`);
  const flush = () => {
    if (cur) {
      const { bodyLines, ...card } = cur;
      card.body = bodyLines.join('\n').trim();
      out.push(card);
      cur = null;
    }
  };
  lines.forEach((ln, i) => {
    const m = ln.match(open);
    if (m) {
      flush();
      const title = m[1]!.trim();
      cur = {
        file: f.id,
        fileLabel: f.label,
        path: 'docs/todo/' + f.file,
        abs: join(todoDir, f.file),
        line: i + 1,
        tier: tierOf(title),
        category: f.label,
        title,
        codex: false,
        body: '',
        bodyLines: [],
      };
      return;
    }
    if (cur && close.test(ln)) {
      flush();
      return;
    }
    if (cur) cur.bodyLines.push(ln);
  });
  flush();
  return out;
}

export interface TodoBoard {
  files: { id: string; label: string; path: string; count: number }[];
  counts: Record<string, number>;
  items: TodoCard[];
}

export function todoBoard(): TodoBoard {
  const todoDir = repoPath('docs', 'todo');
  const items: TodoCard[] = [];
  for (const f of FILES) {
    const p = join(todoDir, f.file);
    if (!existsSync(p)) continue;
    const lines = readFileSync(p, 'utf8').split(/\r?\n/);
    items.push(...(f.mode === 'backlog' ? parseBacklog(lines, f, todoDir) : parseSections(lines, f, todoDir)));
  }
  const counts: Record<string, number> = { high: 0, mid: 0, low: 0, hold: 0, none: 0 };
  for (const it of items) counts[it.tier ?? 'none']!++;
  return {
    files: FILES.filter((f) => existsSync(join(todoDir, f.file))).map((f) => ({
      id: f.id,
      label: f.label,
      path: 'docs/todo/' + f.file,
      count: items.filter((i) => i.file === f.id).length,
    })),
    counts,
    items,
  };
}

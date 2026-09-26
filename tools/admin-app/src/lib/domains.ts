import { findRepoRoot } from './repo-root';
import { loadDomains } from '../../../../scripts/lib/domains.mjs';

export type Domain = { id: string; label: string; role: string; manages: string };

/** 領域の一覧（正本 .claude/config/domains.json の並び）。読めなければ空。 */
export function domainList(): Domain[] {
  try {
    return (loadDomains(findRepoRoot()) as { domains: Domain[] }).domains;
  } catch {
    return [];
  }
}

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { documentDomain } from '../../../../scripts/lib/domains.mjs';
import { parseBacklog } from '../../../../scripts/lib/backlog-lib.mjs';
import { loadAgents, loadSkills } from './registry';

export interface DomainOverview {
  domain: Domain;
  cards: { id: string; title: string; tier: string; due: string | null; wip: boolean }[];
  skills: { name: string; description: string }[];
  agents: { name: string; description: string }[];
  documents: string[];
}

/** 領域の概要: バックログのカード（[領域:]）・スキル/エージェント（frontmatter domain）・文書（documents）。 */
export function domainOverview(id: string): DomainOverview | null {
  const root = findRepoRoot();
  const cfg = loadDomains(root) as { domains: Domain[]; documents: Record<string, string> };
  const domain = cfg.domains.find((d) => d.id === id);
  if (!domain) return null;
  const inDomain = (v: string | null | undefined) => v === domain.id || v === domain.label;

  let cards: DomainOverview['cards'] = [];
  try {
    const parsed = parseBacklog(readFileSync(join(root, '.claude/todo/backlog.md'), 'utf8')) as {
      id: string; title: string; tier: string; due: string | null; wip: boolean; domain: string | null;
    }[];
    const order: Record<string, number> = { high: 0, mid: 1, low: 2, hold: 3 };
    cards = parsed
      .filter((c) => inDomain(c.domain))
      .map(({ id: cid, title, tier, due, wip }) => ({ id: cid, title, tier, due, wip }))
      .sort((a, b) => (order[a.tier] ?? 9) - (order[b.tier] ?? 9));
  } catch {
    cards = [];
  }

  const pick = (items: { name: string; description: string; domain: string | null }[]) =>
    items.filter((x) => inDomain(x.domain)).map(({ name, description }) => ({ name, description }));

  const documents: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (n.endsWith('.md')) {
        const rel = relative(root, p).split('\\').join('/');
        if (/^docs\/(reviews|handoffs)\//.test(rel)) continue;
        if (documentDomain(cfg, rel) === domain.id) documents.push(rel);
      }
    }
  };
  walk(join(root, 'docs'));
  walk(join(root, '.claude/knowledge/reference'));

  return { domain, cards, skills: pick(loadSkills().items), agents: pick(loadAgents().items), documents: documents.sort() };
}

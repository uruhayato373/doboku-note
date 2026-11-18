import { findRepoRoot } from './repo-root';
import { loadDomains } from '../../../../scripts/lib/domains.mjs';

export type NavView = { label: string; href: string; kind: string; match: string; matchAlso?: string[]; query?: Record<string, string> };
export type DomainRoles = { decides: string; review: string[]; gaps: { job: string; by: string; reason: string }[] };
export type Domain = { id: string; label: string; role: string; manages: string; nav: NavView[]; roles?: DomainRoles };
type DomainsConfig = {
  domains: Domain[];
  documents: Record<string, string>;
  actors?: Record<string, string>;
  documentStewards?: Record<string, { updates: string[]; approves: string }>;
  agentRoles?: Record<string, string>;
  agentTargets?: Record<string, string>;
};

/** 画面のパス → 根拠の文書（正本 config/domains.json の pageDocuments）。外枠が読んで見出しの右のリンクに渡す。読めなければ空。 */
export function pageDocumentMap(): Record<string, string[]> {
  try {
    return (loadDomains(findRepoRoot()) as { pageDocuments?: Record<string, string[]> }).pageDocuments ?? {};
  } catch {
    return {};
  }
}

/** 領域の一覧（正本 config/domains.json の並び）。読めなければ空。 */
export function domainList(): Domain[] {
  try {
    return (loadDomains(findRepoRoot()) as { domains: Domain[] }).domains;
  } catch {
    return [];
  }
}

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { documentDomain } from '../../../../scripts/lib/domains.mjs';
import { actorLabel, documentSteward } from '../../../../scripts/lib/domain-roles.mjs';
import { DATASETS, areaOf } from '../../../../scripts/lib/datasets.mjs';
import { writerLabeler } from './stores';
import { parseBacklog } from '../../../../scripts/lib/backlog-lib.mjs';
import { listFiles } from '../../../../scripts/lib/fs-walk.mjs';
import { loadAgents, loadSkills } from './registry';

export interface DomainOverview {
  domain: Domain;
  cards: { id: string; title: string; tier: string; due: string | null; wip: boolean }[];
  skills: { name: string; description: string }[];
  agents: { name: string; description: string; role: string; target: string }[];
  documents: { path: string; updates: string; approves: string }[];
  /** 決める人・判断の場・空白の担い手（表示名にしたもの） */
  roles: { decides: string; review: string[]; gaps: { job: string; by: string; reason: string }[] } | null;
  /** 台帳でこの領域に属するデータと書き手（scripts/lib/datasets.mjs） */
  datasets: { id: string; path: string; area: string | null; writers: string[]; writerNote: string }[];
}

/** 領域の概要: バックログのカード（[領域:]）・スキル/エージェント（frontmatter domain）・文書（documents）。 */
export function domainOverview(id: string): DomainOverview | null {
  const root = findRepoRoot();
  const cfg = loadDomains(root) as DomainsConfig;
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

  const label = (v: string) => actorLabel(v, cfg) as string;
  const skills = loadSkills().items.filter((x) => inDomain(x.domain)).map(({ name, description }) => ({ name, description }));
  const agents = loadAgents().items.filter((x) => inDomain(x.domain)).map(({ name, description, role, target }) => ({
    name,
    description,
    role: role ? cfg.agentRoles?.[role] ?? role : '',
    target: target ? cfg.agentTargets?.[target] ?? target : '',
  }));

  const documents: DomainOverview['documents'] = [];
  for (const dir of [join(root, 'docs'), join(root, '.claude/knowledge/reference')]) {
    for (const p of listFiles(dir, { allowMissing: true, followLinks: true, ext: '.md' })) {
      const rel = relative(root, p).split('\\').join('/');
      if (/^docs\/(reviews|handoffs)\//.test(rel)) continue;
      if (documentDomain(cfg, rel) !== domain.id) continue;
      const s = documentSteward(cfg, rel) as { updates: string[]; approves: string } | null;
      documents.push({ path: rel, updates: s ? s.updates.map(label).join('・') : '', approves: s ? label(s.approves) : '' });
    }
  }

  const writerLabel = writerLabeler(root);
  const datasets = (DATASETS as { id: string; path: string; domain: string; writer?: string[]; writerNote?: string }[])
    .filter((x) => x.domain === domain.id)
    .map((x) => ({ id: x.id, path: x.path, area: areaOf(x) as string | null, writers: (x.writer ?? []).map(writerLabel), writerNote: x.writerNote ?? '' }));

  const r = domain.roles;
  const roles = r ? { decides: label(r.decides), review: r.review.map(label), gaps: r.gaps.map((g) => ({ ...g, by: label(g.by) })) } : null;

  return { domain, cards, skills, agents, documents: documents.sort((a, b) => a.path.localeCompare(b.path)), roles, datasets };
}

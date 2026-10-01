import { readFileSync } from 'node:fs';

import { auditQualificationSsot, ALLOW_PATH, DERIVED_FILES } from '../../../../scripts/lib/qualification-ssot.mjs';
import { loadExamStages } from '../../../../scripts/lib/exam-stages.mjs';
import { findRepoRoot, repoPath } from './repo-root';

/**
 * ssot.ts — 管理画面「正本の検査」（/ops/ssot）の表示モデル（read-only）。
 *
 * 資格の正本（qualification-registry.json）の中身と、名前の写しの検査結果を並べる。
 * 判定は npm run check-qualification-ssot と同じ scripts/lib/qualification-ssot.mjs を呼ぶだけで、ここで判定しない。
 * 正本の変更はファイル＋PR で行い、この画面からは書き換えない（管理画面からの直接編集は DB 再検討の条件・data-storage-decision.md）。
 */

export interface SsotQualification {
  order: number;
  id: string;
  label: string;
  shortLabel: string | null;
  badgeLabel: string | null;
  familyLabel: string;
  portfolio: string;
  portfolioLabel: string;
  stages: string[];
}

export interface SsotGroup {
  id: string;
  label: string;
  shortLabel: string | null;
  badgeLabel: string | null;
  members: string[];
}

export interface SsotView {
  qualifications: SsotQualification[];
  groups: SsotGroup[];
  familyShortLabels: Record<string, string>;
  aliases: string[];
  config: { files: number; violations: { file: string; path: string }[]; allowed: { file: string; path: string; reason: string }[] };
  derived: { files: number; diffs: { file: string; slug: string; current: string; want: string }[] };
  derivedFiles: string[];
  code: { files: number; hits: { file: string; line: number; text: string }[] };
  allowRules: { file: string; path: string; reason: string }[];
  allowPath: string;
  error: string | null;
}

interface Registry {
  portfolioStatuses: Record<string, string>;
  families: Record<string, string>;
  familyShortLabels?: Record<string, string>;
  groups?: Record<string, { label: string; shortLabel?: string; badgeLabel?: string; members: string[] }>;
  qualifications: { id: string; label: string; shortLabel?: string; badgeLabel?: string; family: string; portfolio: string }[];
}

const EMPTY: Omit<SsotView, 'error'> = {
  qualifications: [], groups: [], familyShortLabels: {}, aliases: [],
  config: { files: 0, violations: [], allowed: [] }, derived: { files: 0, diffs: [] }, derivedFiles: [],
  code: { files: 0, hits: [] }, allowRules: [], allowPath: ALLOW_PATH,
};

export function loadSsotView(): SsotView {
  const root = findRepoRoot();
  try {
    const r = auditQualificationSsot(root) as unknown as Pick<SsotView, 'aliases' | 'config' | 'derived' | 'code'> & { registry: Registry };
    const stages = loadExamStages(root) as Map<string, { id: string; label: string }[]>;
    const reg = r.registry;
    const nameOf = (id: string) => reg.qualifications.find((q) => q.id === id)?.shortLabel ?? reg.qualifications.find((q) => q.id === id)?.label ?? id;
    return {
      qualifications: reg.qualifications.map((q, i) => ({
        order: i + 1,
        id: q.id,
        label: q.label,
        shortLabel: q.shortLabel ?? null,
        badgeLabel: q.badgeLabel ?? null,
        familyLabel: reg.families[q.family] ?? q.family,
        portfolio: q.portfolio,
        portfolioLabel: reg.portfolioStatuses[q.portfolio] ?? q.portfolio,
        stages: (stages.get(q.id) ?? []).map((s) => s.label),
      })),
      groups: Object.entries(reg.groups ?? {}).map(([id, g]) => ({ id, label: g.label, shortLabel: g.shortLabel ?? null, badgeLabel: g.badgeLabel ?? null, members: g.members.map(nameOf) })),
      familyShortLabels: reg.familyShortLabels ?? {},
      aliases: r.aliases,
      config: r.config,
      derived: r.derived,
      derivedFiles: (DERIVED_FILES as { file: string }[]).map((d) => d.file),
      code: r.code,
      allowRules: (JSON.parse(readFileSync(repoPath(...ALLOW_PATH.split('/')), 'utf8')).allow ?? []) as SsotView['allowRules'],
      allowPath: ALLOW_PATH,
      error: null,
    };
  } catch (e) {
    return { ...EMPTY, error: (e as Error).message };
  }
}

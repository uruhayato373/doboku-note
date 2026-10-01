import { readFileSync } from 'node:fs';

import { auditQualificationSsot, ALLOW_PATH, BASELINE_PATH } from '../../../../scripts/lib/qualification-ssot.mjs';
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
  family: string;
  familyLabel: string;
  portfolio: string;
  portfolioLabel: string;
  stages: string[];
}

export interface SsotView {
  qualifications: SsotQualification[];
  familyShortLabels: Record<string, string>;
  config: { files: number; violations: { file: string; path: string }[]; allowed: { file: string; path: string; reason: string }[] };
  code: { files: number; counts: Record<string, number>; over: { file: string; count: number; baseline: number }[]; under: { file: string; count: number; baseline: number }[] };
  allowRules: { file: string; path: string; reason: string }[];
  allowPath: string;
  baselinePath: string;
  error: string | null;
}

interface Registry {
  portfolioStatuses: Record<string, string>;
  families: Record<string, string>;
  familyShortLabels?: Record<string, string>;
  qualifications: { id: string; label: string; shortLabel?: string; family: string; portfolio: string }[];
}

export function loadSsotView(): SsotView {
  const root = findRepoRoot();
  try {
    const r = auditQualificationSsot(root) as unknown as Omit<SsotView, 'qualifications' | 'familyShortLabels' | 'allowRules' | 'allowPath' | 'baselinePath' | 'error'> & { registry: Registry };
    const stages = loadExamStages(root) as Map<string, { id: string; label: string }[]>;
    const reg = r.registry;
    const allowRules = (JSON.parse(readFileSync(repoPath(...ALLOW_PATH.split('/')), 'utf8')).allow ?? []) as SsotView['allowRules'];
    return {
      qualifications: reg.qualifications.map((q, i) => ({
        order: i + 1,
        id: q.id,
        label: q.label,
        shortLabel: q.shortLabel ?? null,
        family: q.family,
        familyLabel: reg.families[q.family] ?? q.family,
        portfolio: q.portfolio,
        portfolioLabel: reg.portfolioStatuses[q.portfolio] ?? q.portfolio,
        stages: (stages.get(q.id) ?? []).map((s) => s.label),
      })),
      familyShortLabels: reg.familyShortLabels ?? {},
      config: r.config,
      code: r.code,
      allowRules,
      allowPath: ALLOW_PATH,
      baselinePath: BASELINE_PATH,
      error: null,
    };
  } catch (e) {
    return { qualifications: [], familyShortLabels: {}, config: { files: 0, violations: [], allowed: [] }, code: { files: 0, counts: {}, over: [], under: [] }, allowRules: [], allowPath: ALLOW_PATH, baselinePath: BASELINE_PATH, error: (e as Error).message };
  }
}

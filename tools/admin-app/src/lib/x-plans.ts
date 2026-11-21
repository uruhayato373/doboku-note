import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { xPlanApproval } from '../../../../scripts/lib/registry-x-plan.mjs';
import { findRepoRoot } from './repo-root';

/** 画面が使う行の形（xPlanApproval の rows のうち表示する項目） */
export interface XPlanRow {
  id: string;
  date: string;
  time: string;
  slot: string | null;
  frame: string | null;
  status: string;
  approved: boolean;
  locked: boolean;
  text: string;
}

export interface XPlanView {
  plan: string;
  rows: XPlanRow[];
  unresolved: string[];
  digest: string;
  toWrite: number;
}

const CAMPAIGNS = 'content/sns/x/campaigns';

/** 計画ファイル名（月次計画 JSON）の一覧 */
export function listXPlanFiles(): string[] {
  return readdirSync(join(findRepoRoot(), CAMPAIGNS)).filter((f) => f.endsWith('.json')).sort();
}

/** 計画 1 本の承認の確かめ（計算は registry-x-plan.mjs が唯一の実装）。存在しない計画は null */
export function loadXPlan(plan: string): XPlanView | null {
  if (!/^[\w.-]+\.json$/.test(plan) || !listXPlanFiles().includes(plan)) return null;
  const r = xPlanApproval(findRepoRoot(), plan) as {
    plan: string; rows: XPlanRow[]; unresolved: string[]; digest: string; toWrite: unknown[];
  };
  return { plan: r.plan, rows: r.rows, unresolved: r.unresolved, digest: r.digest, toWrite: r.toWrite.length };
}

/** 承認の状態（予約後 > 承認済み > 未承認） */
export const approvalState = (r: Pick<XPlanRow, 'approved' | 'locked'>): 'locked' | 'approved' | 'pending' =>
  r.locked ? 'locked' : r.approved ? 'approved' : 'pending';

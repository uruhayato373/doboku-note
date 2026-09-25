import { existsSync, readFileSync } from 'node:fs';
import { repoPath } from './repo-root';

/**
 * quality-cem.ts — 技術士総監（pe-comprehensive-management）キーワードページの
 * 採点・リライト進捗（cem プロファイル）。DN-0321。
 *
 * これまで docs/editorial/05_品質サイクル進捗.md の A 節（build-progress-md.mjs が
 * 生成する巨大テーブル・739行）が担っていた表示を admin へ移す。docs/ は人が読む
 * 恒久判断の置き場で、機械データ（採点のたびに書き換わる）は .claude/state/ の
 * JSON が正（CLAUDE.md §8 情報の置き場）。
 *
 * GSC pos/impr/clicks の突合は旧 doc では行っていたが、正規化に doc-meta-index の
 * 公開パスマップ（scripts/lib/url-normalization.mjs）が要り、admin 側で二重実装
 * すると「同じ判定を複数箇所に実装しない」（CLAUDE.md §7）に反するため持ち込まない。
 * GSC 由来の優先順位付けは既存の /metrics/gsc・quality（census）が担う。
 */

const SCORES_PATH = () => repoPath('.claude/state/quality-scores.json');
const STATE_PATH = () => repoPath('.claude/state/quality-cycle-state.json');
const SUMMARIES_PATH = () => repoPath('.claude/state/keyword-summaries.json');

const CATEGORY = 'pe-comprehensive-management';

function readJson<T>(abs: string): T | null {
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, 'utf8')) as T;
  } catch {
    return null;
  }
}

interface ScoresFile {
  version: number;
  scored_at: string;
  pages: Record<
    string,
    {
      slug: string;
      scores: Record<string, number>;
      weighted: number;
      weak_axes: string[];
      qualitative_comment: string;
      scored_at: string;
    }
  >;
}

interface StateFile {
  version: number;
  cycle: number;
  started_at: string;
  pages: Record<
    string,
    {
      status: string;
      history: { date: string; action: string; cycle?: number; weighted?: number }[];
    }
  >;
}

interface SummariesFile {
  keywords: Record<string, { title: string }>;
}

export interface CemRow {
  slug: string;
  title: string;
  url: string;
  weighted: number;
  weakAxes: string[];
  rewriteCount: number;
  status: string;
  lastDate: string;
}

export interface CemSummary {
  present: boolean;
  scoredAt: string | null;
  rows: CemRow[];
  total: number;
  lt20: number;
  lt25: number;
  byStatus: Record<string, number>;
}

export function cemQualitySummary(): CemSummary {
  const scores = readJson<ScoresFile>(SCORES_PATH());
  if (!scores) {
    return { present: false, scoredAt: null, rows: [], total: 0, lt20: 0, lt25: 0, byStatus: {} };
  }
  const state = readJson<StateFile>(STATE_PATH()) ?? { version: 1, cycle: 0, started_at: '', pages: {} };
  const summaries = readJson<SummariesFile>(SUMMARIES_PATH()) ?? { keywords: {} };

  const rows: CemRow[] = Object.entries(scores.pages).map(([slug, score]) => {
    const cycleEntry = state.pages?.[slug];
    const history = cycleEntry?.history ?? [];
    const rewriteCount = history.filter((h) => h.action === 'rewritten').length;
    const lastDate = history.at(-1)?.date ?? score.scored_at;
    return {
      slug,
      title: summaries.keywords?.[slug]?.title ?? slug,
      url: `/exam/${CATEGORY}/keywords/${slug}`,
      weighted: score.weighted,
      weakAxes: score.weak_axes ?? [],
      rewriteCount,
      status: cycleEntry?.status ?? '未着手',
      lastDate: (lastDate || '').slice(0, 10) || '—',
    };
  });
  rows.sort((a, b) => a.weighted - b.weighted);

  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

  return {
    present: true,
    scoredAt: scores.scored_at,
    rows,
    total: rows.length,
    lt20: rows.filter((r) => r.weighted < 2.0).length,
    lt25: rows.filter((r) => r.weighted < 2.5).length,
    byStatus,
  };
}

import { existsSync, readFileSync } from 'node:fs';
import { repoPath } from './repo-root';

/**
 * quality.ts — コンテンツ品質ダッシュボード（読み取り専用）。
 * lint ラチェットの baseline × GA4 人気度 × ルール設定 を join し、
 * 記事別 / ルール別 / 資格別の違反集計と違反バーンダウン履歴を返す。
 * tools/admin/lib/quality.mjs を findRepoRoot ベースで移植（表示用の集約のみ・状態は持たない）。
 */

function readJson<T>(abs: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(abs, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

// relPath から /docs のフラット slug を推定（lint-mdx-mobile.mjs の deriveSlug と同一規約）。
function deriveSlug(rp: string): string {
  const parts = rp.split(/[\\/]/);
  const i = parts.indexOf('posts');
  const seg = i >= 0 ? parts.slice(i + 1) : parts;
  const last = seg[seg.length - 1]!;
  if (last === 'article.mdx') seg.pop();
  else seg[seg.length - 1] = last.replace(/\.mdx$/, '');
  return seg.join('-');
}

export type Severity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface QualityArticle {
  rp: string;
  slug: string;
  exam: string;
  group: string;
  title: string;
  users: number;
  rank: number | null;
  total: number;
  counts: Record<string, number>;
  priority: number;
}
export interface RuleAgg {
  rule: string;
  severity: Severity;
  total: number;
  files: number;
}
export interface ExamAgg {
  exam: string;
  files: number;
  total: number;
}
export interface HistoryPoint {
  date: string;
  violations: number;
  totals: Record<Severity, number>;
}
export interface QualitySummary {
  generatedFrom: string | null;
  window: { start: string; end: string } | null;
  fullScanRules: string[] | null;
  ruleSeverity: Record<string, Severity>;
  totals: Record<string, number>;
  articleCount: number;
  articles: QualityArticle[];
  byRule: RuleAgg[];
  byExam: ExamAgg[];
  history: HistoryPoint[];
}

export function qualitySummary(): QualitySummary {
  const baseline = readJson<{ counts?: Record<string, Record<string, number>> }>(
    repoPath('.claude', 'state', 'quality', 'lint-baseline.json'),
    { counts: {} },
  );
  const rules = readJson<{ defaults?: Record<string, Severity>; fullScan?: { rules?: string[] } }>(
    repoPath('.claude', 'config', 'content-rules.json'),
    { defaults: {}, fullScan: { rules: [] } },
  );
  const popular = readJson<{ pages?: { slug: string; activeUsers?: number }[]; generatedFrom?: string; window?: { start: string; end: string } }>(
    repoPath('src', 'config', 'popular-pages.json'),
    { pages: [] },
  );
  const docmeta = readJson<{ docs?: Record<string, Record<string, unknown>> }>(
    repoPath('src', 'config', 'doc-meta-index.json'),
    { docs: {} },
  );

  const sev = rules.defaults ?? {};
  const fullScanRules = rules.fullScan?.rules ?? null;
  const docs = docmeta.docs ?? {};

  const popMap = new Map<string, { users: number; rank: number }>();
  (popular.pages ?? []).forEach((p, i) => popMap.set(p.slug, { users: p.activeUsers ?? 0, rank: i + 1 }));

  const counts = baseline.counts ?? {};
  const articles: QualityArticle[] = [];
  const byRuleAgg: Record<string, RuleAgg> = {};
  const byExamAgg: Record<string, ExamAgg> = {};
  const totals: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };

  for (const [rp, ruleCounts] of Object.entries(counts)) {
    const slug = deriveSlug(rp);
    const meta = docs[slug] ?? {};
    const pop = popMap.get(slug) ?? { users: 0, rank: null as number | null };
    const exam = (meta.category as string) || rp.split(/[\\/]/)[3] || 'other';
    const group = (meta.group as string) || '';

    let total = 0;
    for (const [rule, n] of Object.entries(ruleCounts)) {
      total += n;
      const s = (sev[rule] as Severity) || 'MEDIUM';
      totals[s] = (totals[s] ?? 0) + n;
      const ra = (byRuleAgg[rule] ||= { rule, severity: s, total: 0, files: 0 });
      ra.total += n;
      ra.files += 1;
    }

    const ea = (byExamAgg[exam] ||= { exam, files: 0, total: 0 });
    ea.files += 1;
    ea.total += total;

    articles.push({
      rp,
      slug,
      exam,
      group,
      title: (meta.shortTitle as string) || (meta.title as string) || slug,
      users: pop.users,
      rank: pop.rank,
      total,
      counts: ruleCounts,
      priority: total * (pop.users + 1),
    });
  }

  articles.sort((a, b) => b.priority - a.priority || b.total - a.total);
  const byRule = Object.values(byRuleAgg).sort((a, b) => b.total - a.total);
  const byExam = Object.values(byExamAgg).sort((a, b) => b.total - a.total);

  let history: HistoryPoint[] = [];
  const HISTORY = repoPath('.claude', 'state', 'quality', 'history.jsonl');
  if (existsSync(HISTORY)) {
    history = readFileSync(HISTORY, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l) as HistoryPoint;
        } catch {
          return null;
        }
      })
      .filter((x): x is HistoryPoint => x !== null);
  }

  return {
    generatedFrom: popular.generatedFrom ?? null,
    window: popular.window ?? null,
    fullScanRules,
    ruleSeverity: sev,
    totals,
    articleCount: articles.length,
    articles,
    byRule,
    byExam,
    history,
  };
}

// ─── 採点カバレッジ census（census.json をそのまま返す）──────
export interface QualityCensus {
  present: boolean;
  hint?: string;
  generated_at?: string | null;
  thresholds?: Record<string, unknown> | null;
  totals?: Record<string, unknown> | null;
  by_category?: Record<string, unknown>;
  rewrite_queue_count?: number;
  articles?: QualityCensusArticle[];
}

export interface QualityCensusArticle {
  slug: string;
  category: string;
  group: string;
  body_chars: number;
  scored: boolean;
  weighted: number | null;
  scored_at: string | null;
  failed: boolean;
  thin: boolean;
}

export function qualityCensus(): QualityCensus {
  const CENSUS = repoPath('.claude', 'state', 'quality', 'census.json');
  if (!existsSync(CENSUS)) return { present: false, hint: 'npm run quality-census' };
  let c: {
    generated_at?: string;
    thresholds?: Record<string, unknown>;
    totals?: Record<string, unknown>;
    by_category?: Record<string, unknown>;
    rewrite_queue?: unknown[];
    articles?: QualityCensusArticle[];
  } | null = null;
  try {
    c = JSON.parse(readFileSync(CENSUS, 'utf8'));
  } catch {
    c = null;
  }
  if (!c) return { present: false, hint: 'npm run quality-census' };
  return {
    present: true,
    generated_at: c.generated_at ?? null,
    thresholds: c.thresholds ?? null,
    totals: c.totals ?? null,
    by_category: c.by_category ?? {},
    rewrite_queue_count: Array.isArray(c.rewrite_queue) ? c.rewrite_queue.length : 0,
    articles: Array.isArray(c.articles) ? c.articles : [],
  };
}

/**
 * quality.mjs — コンテンツ品質ダッシュボード（読み取り専用）。
 * lint ラチェットの baseline × GA4 人気度 × ルール設定 を join し、
 * 記事別 / ルール別 / 資格別の違反集計と、違反バーンダウン履歴を返す。
 *
 * データソース（すべて git 作業ツリー内・live 読み）:
 *   .claude/state/quality/lint-baseline.json … file × ruleID × 件数（真実源）
 *   .claude/state/quality/history.jsonl      … 違反総数のスナップショット（バーンダウン）
 *   src/config/popular-pages.json            … slug → activeUsers（優先度）
 *   .claude/config/content-rules.json        … ルールの重大度（defaults）・fullScan
 *   src/config/doc-meta-index.json           … slug → category / group / title
 *
 * lint 実装・ルールの真実源は .claude/scripts/lint-mdx-mobile.mjs / content-rules.json。
 * 本モジュールは表示用の集約のみで、状態は一切持たない（UI で SoT を二重化しない）。
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."));
const BASELINE = join(ROOT, ".claude", "state", "quality", "lint-baseline.json");
const HISTORY = join(ROOT, ".claude", "state", "quality", "history.jsonl");
const POPULAR = join(ROOT, "src", "config", "popular-pages.json");
const RULES = join(ROOT, ".claude", "config", "content-rules.json");
const DOCMETA = join(ROOT, "src", "config", "doc-meta-index.json");
const CENSUS = join(ROOT, ".claude", "state", "quality", "census.json");

function readJson(p, fallback) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fallback; }
}

// relPath（例 .local/r2/posts/pe-construction/river-coast-exam-themes/article.mdx）
// から /docs のフラット slug を推定。lint-mdx-mobile.mjs の deriveSlug と同一規約。
function deriveSlug(rp) {
  const parts = rp.split(/[\\/]/);
  const i = parts.indexOf("posts");
  const seg = i >= 0 ? parts.slice(i + 1) : parts;
  const last = seg[seg.length - 1];
  if (last === "article.mdx") seg.pop();
  else seg[seg.length - 1] = last.replace(/\.mdx$/, "");
  return seg.join("-");
}

export function qualitySummary() {
  const baseline = readJson(BASELINE, { counts: {} });
  const rules = readJson(RULES, { defaults: {}, fullScan: { rules: [] } });
  const popular = readJson(POPULAR, { pages: [] });
  const docmeta = readJson(DOCMETA, { docs: {} });

  const sev = rules.defaults || {};
  const fullScanRules = (rules.fullScan && rules.fullScan.rules) || null;
  const docs = docmeta.docs || {};

  const popMap = new Map();
  (popular.pages || []).forEach((p, i) => popMap.set(p.slug, { users: p.activeUsers || 0, rank: i + 1 }));

  const counts = baseline.counts || {};
  const articles = [];
  const byRuleAgg = {};
  const byExamAgg = {};
  const totals = { HIGH: 0, MEDIUM: 0, LOW: 0 };

  for (const [rp, ruleCounts] of Object.entries(counts)) {
    const slug = deriveSlug(rp);
    const meta = docs[slug] || {};
    const pop = popMap.get(slug) || { users: 0, rank: null };
    const exam = meta.category || rp.split(/[\\/]/)[3] || "other";
    const group = meta.group || "";

    let total = 0;
    for (const [rule, n] of Object.entries(ruleCounts)) {
      total += n;
      const s = sev[rule] || "MEDIUM";
      totals[s] = (totals[s] || 0) + n;
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
      title: meta.shortTitle || meta.title || slug,
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

  let history = [];
  if (existsSync(HISTORY)) {
    history = readFileSync(HISTORY, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  }

  return {
    generatedFrom: popular.generatedFrom || null,
    window: popular.window || null,
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

/**
 * ルーブリック採点カバレッジ census（読み取り専用）。
 * `.claude/state/quality/census.json`（npm run quality-census で生成）をそのまま返す。
 * 生成物が無い場合は present:false を返し、UI が生成コマンドを案内する。
 */
export function qualityCensus() {
  if (!existsSync(CENSUS)) {
    return { present: false, hint: "npm run quality-census" };
  }
  const c = readJson(CENSUS, null);
  if (!c) return { present: false, hint: "npm run quality-census" };
  // 記事全件（articles）は重いので、rewrite_queue の未採点/薄層別件数と
  // 資格 × group カバレッジ表・全体サマリーのみを返す（UI は census タブで軽量表示）。
  return {
    present: true,
    generated_at: c.generated_at || null,
    thresholds: c.thresholds || null,
    totals: c.totals || null,
    by_category: c.by_category || {},
    rewrite_queue_count: Array.isArray(c.rewrite_queue) ? c.rewrite_queue.length : 0,
  };
}

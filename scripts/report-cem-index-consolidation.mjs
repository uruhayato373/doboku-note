#!/usr/bin/env node
/**
 * 総監の crawled-not-indexed を5分類し、統合/noindexの承認対象を明示する。
 * 読み取り専用の分析であり、MDX・redirect・sitemap・外部状態は変更しない。
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  CEM_INDEX_ACTIONS,
  classifyCemIndexCandidate,
} from "./lib/cem-index-classifier.mjs";
import { toJoinKey } from "./lib/url-normalization.mjs";

const ROOT = process.cwd();
const METRICS = join(ROOT, ".claude/state/metrics");
const IMPROVEMENTS = join(ROOT, ".claude/state/improvements");
const CEM_PREFIX = "pe-comprehensive-management-";
const NOW = new Date();
const DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(NOW);

function readJson(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function latestFile(dir, prefix) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
    .sort();
  return files.length ? join(dir, files.at(-1)) : null;
}

function datedFiles(dir, prefix, cutoff) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
    .sort()
    .map((name) => ({ path: join(dir, name), json: readJson(join(dir, name)) }))
    .filter(({ json }) => {
      const end = json?.meta?.endDate || json?.endDate;
      return end && new Date(`${end}T23:59:59Z`) >= cutoff;
    });
}

function aggregateGsc(files) {
  const map = new Map();
  for (const { json } of files) {
    for (const row of json?.rows || []) {
      const page = row.keys?.[0];
      if (!page) continue;
      const key = toJoinKey(page);
      const current = map.get(key) || { impressionsMax90d: 0, clicksMax90d: 0, observedSnapshots: 0 };
      current.impressionsMax90d = Math.max(current.impressionsMax90d, row.impressions || 0);
      current.clicksMax90d = Math.max(current.clicksMax90d, row.clicks || 0);
      current.observedSnapshots += 1;
      map.set(key, current);
    }
  }
  return map;
}

function aggregateGa4(files) {
  const map = new Map();
  for (const { json } of files) {
    for (const row of json?.rows || []) {
      if (!row.page) continue;
      const key = toJoinKey(row.page);
      const current = map.get(key) || { activeUsersMax90d: 0, sessionsMax90d: 0, observedSnapshots: 0 };
      current.activeUsersMax90d = Math.max(current.activeUsersMax90d, row.activeUsers || 0);
      current.sessionsMax90d = Math.max(current.sessionsMax90d, row.sessions || 0);
      current.observedSnapshots += 1;
      map.set(key, current);
    }
  }
  return map;
}

function loadInspectionMaps() {
  const dir = join(METRICS, "url-inspection");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.startsWith("inspection-batch-") && name.endsWith(".json"))
    .sort()
    .slice(-2)
    .map((name) => {
      const json = readJson(join(dir, name), { results: [] });
      const states = new Map();
      for (const row of json.results || []) {
        if (!row.url) continue;
        states.set(toJoinKey(row.url), {
          verdict: row.index?.verdict || null,
          coverageState: row.index?.coverage_state || null,
        });
      }
      return { file: join(dir, name), states };
    });
}

function isNotIndexed(state) {
  if (!state) return false;
  if (state.verdict === "PASS") return false;
  return /未登録|認識されていません|除外/.test(state.coverageState || "");
}

function loadInbound(relations) {
  const counts = new Map();
  for (const list of Object.values(relations)) {
    for (const item of list || []) {
      if (!item?.slug) continue;
      counts.set(item.slug, (counts.get(item.slug) || 0) + 1);
    }
  }
  return counts;
}

function contentStats(bareSlug) {
  const path = join(ROOT, "content/site/pe-comprehensive-management", bareSlug, "article.mdx");
  if (!existsSync(path)) return { path: null, contentChars: 0 };
  const raw = readFileSync(path, "utf8")
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[#*_`>|\[\](){}-]/g, "")
    .replace(/\s/g, "");
  return { path, contentChars: raw.length };
}

function daysSince(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((NOW.getTime() - date.getTime()) / 86_400_000));
}

function pickTarget(bareSlug, relations, docs, currentUnindexed) {
  const source = docs[`${CEM_PREFIX}${bareSlug}`];
  const candidates = (relations[bareSlug] || [])
    .filter((item) => {
      const full = `${CEM_PREFIX}${item.slug}`;
      return docs[full]?.published && !currentUnindexed.has(full);
    })
    .map((item) => ({
      ...item,
      fullSlug: `${CEM_PREFIX}${item.slug}`,
      sameSection: !!source?.section && docs[`${CEM_PREFIX}${item.slug}`]?.section === source.section,
    }))
    .sort((a, b) => Number(b.sameSection) - Number(a.sameSection) || (b.score || 0) - (a.score || 0));
  return candidates[0] || null;
}

function renderMarkdown(report) {
  const lines = [
    "# 総監 index consolidation 候補",
    "",
    `- 生成: ${report.meta.generatedAt}`,
    `- 対象: 現行sitemap内の総監 crawled-not-indexed **${report.meta.candidates}件**`,
    `- 検索需要: 過去約90日に重なるGSC APIスナップショット ${report.meta.sources.gscSnapshots}本（重複期間を合算せず最大値で判定）`,
    `- URL Inspection: 直近${report.meta.sources.inspectionBatches.length}回`,
    "- このレポートは候補提示のみ。CONSOLIDATE / NOINDEX_REVIEW は対象URL承認後にだけ実施する",
    "",
    "## 分類件数",
    "",
    "| 分類 | 件数 | 次の扱い |",
    "|---|--:|---|",
  ];
  const next = {
    KEEP: "価値を保護。継続未登録ならindexability改善",
    IMPROVE: "検索意図・導入・内部リンクを個別改善",
    CONSOLIDATE: "統合先と本文差分を人が確認後、最大10件ずつ承認",
    NOINDEX_REVIEW: "削除/noindexではなく、まず固有価値を人が確認",
    MONITOR: "次回URL Inspectionまで据え置き",
  };
  for (const action of CEM_INDEX_ACTIONS) lines.push(`| ${action} | ${report.meta.counts[action]} | ${next[action]} |`);
  lines.push("", "## 全候補", "");
  lines.push("| 分類 | 次アクション | ページ | 需要(max) | 過去問 | inbound | 文字数 | 関連候補 | 根拠 |");
  lines.push("|---|---|---|---:|--:|--:|--:|---|---|");
  for (const row of report.rows) {
    const demand = `${row.clicksMax90d}c/${row.impressionsMax90d}i/${row.activeUsersMax90d}u`;
    const target = row.relatedCandidate ? `${row.relatedCandidate} (${row.relatedCandidateScore})` : "—";
    lines.push(`| ${row.action} | ${row.nextAction} | ${row.slug} | ${demand} | ${row.examOccurrences} | ${row.internalInbound} | ${row.contentChars} | ${target} | ${row.reasons.join(" / ")} |`);
  }
  lines.push("", "## 承認ゲート", "");
  lines.push("CONSOLIDATE / NOINDEX_REVIEW の適用時は、source・target・残す固有情報・301・sitemap差分を最大10件単位で提示し、明示承認を得る。未承認ではMDX、`public/_redirects`、published、noindex、GSC登録リクエストを変更しない。");
  return lines.join("\n") + "\n";
}

function main() {
  const searchGrowthPath = latestFile(IMPROVEMENTS, "search-growth-");
  if (!searchGrowthPath) throw new Error("search-growth JSON がありません。先に npm run search-growth:report を実行してください");
  const searchGrowth = readJson(searchGrowthPath);
  const docs = readJson(join(ROOT, "src/config/doc-meta-index.json"), { docs: {} }).docs || {};
  const relationDoc = readJson(join(ROOT, "src/config/keyword-relations.json"), { relations: {} });
  const relations = relationDoc.relations || {};
  const examBacklinks = readJson(join(ROOT, "src/config/past-exam-backlinks.json"), {});
  const inbound = loadInbound(relations);
  const cutoff = new Date(NOW.getTime() - 95 * 86_400_000);
  const gscFiles = datedFiles(join(METRICS, "gsc"), "gsc-page-query-", cutoff);
  const ga4Files = datedFiles(join(METRICS, "ga4"), "ga4-page-", cutoff);
  const gsc = aggregateGsc(gscFiles);
  const ga4 = aggregateGa4(ga4Files);
  const inspections = loadInspectionMaps();

  const candidates = (searchGrowth?.rows || []).filter(
    (row) => row.contentFamily === "pe-comprehensive-management" && row.gscUiIssue === "crawledNotIndexed" && row.inLiveSitemap,
  );
  const currentUnindexed = new Set(candidates.map((row) => row.url.split("/docs/").at(-1)?.replace(/\/$/, "")));

  const rows = candidates.map((row) => {
    const slug = row.url.split("/docs/").at(-1)?.replace(/\/$/, "");
    const bareSlug = slug?.startsWith(CEM_PREFIX) ? slug.slice(CEM_PREFIX.length) : slug;
    const meta = docs[slug] || {};
    const demand = gsc.get(toJoinKey(row.url)) || {};
    const usage = ga4.get(toJoinKey(row.url)) || {};
    const target = pickTarget(bareSlug, relations, docs, currentUnindexed);
    const content = contentStats(bareSlug);
    const inspectionStates = inspections.map(({ states }) => states.get(toJoinKey(row.url)) || null);
    const signal = {
      clicksMax90d: demand.clicksMax90d || 0,
      impressionsMax90d: demand.impressionsMax90d || 0,
      activeUsersMax90d: usage.activeUsersMax90d || 0,
      sessionsMax90d: usage.sessionsMax90d || 0,
      examOccurrences: examBacklinks[bareSlug]?.length || 0,
      internalInbound: inbound.get(bareSlug) || 0,
      contentChars: content.contentChars,
      daysSinceModified: daysSince(meta.dateModified || meta.lastRewrittenAt || meta.publishedAt),
      // keyword-relations は「関連」であって統合先の証明ではない。
      proposedTarget: null,
      proposedTargetScore: 0,
      notIndexedInLastTwoInspections: inspections.length >= 2 && inspectionStates.every(isNotIndexed),
    };
    const classified = classifyCemIndexCandidate(signal);
    return {
      url: row.url,
      slug,
      bareSlug,
      title: meta.title || null,
      section: meta.section || null,
      sourcePath: content.path ? content.path.replace(`${ROOT}/`, "") : null,
      ...signal,
      gscObservedSnapshots: demand.observedSnapshots || 0,
      ga4ObservedSnapshots: usage.observedSnapshots || 0,
      inspectionStates,
      relatedCandidate: target?.fullSlug || null,
      relatedCandidateUrl: target ? `https://doboku-note.com/docs/${target.fullSlug}` : null,
      relatedCandidateLabel: target?.label || null,
      relatedCandidateScore: target?.score || 0,
      action: classified.action,
      nextAction:
        classified.action === "KEEP" && signal.notIndexedInLastTwoInspections && (signal.daysSinceModified ?? 0) >= 60
          ? "IMPROVE_INDEXABILITY"
          : classified.action === "KEEP"
            ? "PRESERVE"
            : classified.action,
      confidence: classified.confidence,
      reasons: classified.reasons,
      requiresApproval: classified.requiresApproval,
    };
  }).sort((a, b) => CEM_INDEX_ACTIONS.indexOf(a.action) - CEM_INDEX_ACTIONS.indexOf(b.action) || b.confidence - a.confidence || a.slug.localeCompare(b.slug));

  const counts = Object.fromEntries(CEM_INDEX_ACTIONS.map((action) => [action, rows.filter((row) => row.action === action).length]));
  const report = {
    meta: {
      generatedAt: NOW.toISOString(),
      candidates: rows.length,
      counts,
      sources: {
        searchGrowth: searchGrowthPath.replace(`${ROOT}/`, ""),
        gscSnapshots: gscFiles.length,
        ga4Snapshots: ga4Files.length,
        inspectionBatches: inspections.map(({ file }) => file.replace(`${ROOT}/`, "")),
      },
      limitations: [
        "GSC Search Analytics APIは低ボリューム行を返さないことがある",
        "重複する28日窓は合算せず、約90日内の各スナップショット最大値と観測有無で判定する",
        "統合先はkeyword-relationsの同一区分・高スコア候補であり、本文差分の人手確認が必要",
      ],
    },
    rows,
  };

  mkdirSync(IMPROVEMENTS, { recursive: true });
  const jsonPath = join(IMPROVEMENTS, `cem-index-consolidation-${DATE}.json`);
  const mdPath = join(IMPROVEMENTS, `cem-index-consolidation-${DATE}.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  writeFileSync(mdPath, renderMarkdown(report), "utf8");
  console.log(`[cem-index] candidates=${rows.length} ${CEM_INDEX_ACTIONS.map((action) => `${action}:${counts[action]}`).join(" / ")}`);
  console.log(`  -> ${jsonPath}`);
  console.log(`  -> ${mdPath}`);
}

main();

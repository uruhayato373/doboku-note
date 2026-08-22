#!/usr/bin/env node
/**
 * report-search-growth.mjs — GSC UI 正規化 JSON と既存 API データ・sitemap・_redirects・
 * 生成 HTML を URL 単位で突合し、修正アクションへ分類したレポートを生成する（オフライン join）。
 * ---------------------------------------------------------------------------
 * 入力（すべて既存の state / build 生成物・最新スナップショット自動選択）:
 *   - GSC UI 正規化: .claude/state/metrics/gsc-ui/ssot/urls/*.json（**追跡 SSOT・優先**）
 *                    無ければ .claude/state/metrics/gsc-ui/<run>/normalized/*.json（gitignore・そのマシンのみ）
 *   - URL Inspection: .claude/state/metrics/url-inspection/inspection-*.json（最新）
 *   - GSC page:       .claude/state/metrics/gsc/gsc-page-*.json（最新・page×query 可）
 *   - GA4 page:       .claude/state/metrics/ga4/ga4-page-*.json（最新）
 *   - live sitemap:   https://doboku-note.com/sitemap.xml（取得可なら／不可なら out/sitemap.xml）
 *   - local sitemap:  out/sitemap.xml
 *   - _redirects:     public/_redirects
 *   - 生成 HTML:      out/docs/<slug>.html（canonical / robots / 存在=200）
 *   - doc-meta:       src/config/doc-meta-index.json（contentFamily）
 *
 * 出力:
 *   - .claude/state/improvements/search-growth-<run-id>.json（全 join 行 + signal + 分類）
 *   - .claude/state/improvements/search-growth-latest.md（サマリ + アクション別件数 + Top20）
 *
 * オフライン join。外部状態は変更しない。分類は scripts/lib/search-growth-classifier.mjs。
 * usage:
 *   node scripts/report-search-growth.mjs
 *   node scripts/report-search-growth.mjs --live-http   # 各 URL に live HEAD/GET（proxy 環境では省略推奨）
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { classifyUrl } from "./lib/search-growth-classifier.mjs";
import { toJoinKey, toComparisonKey, slugFromKey, toAbsoluteUrl } from "./lib/url-normalization.mjs";

const M = ".claude/state/metrics";
const OUT_DIR = ".claude/state/improvements";
const SITE_ORIGIN = "https://doboku-note.com";

const argv = process.argv.slice(2);
const LIVE_HTTP = argv.includes("--live-http");

// ── loaders ─────────────────────────────────────────────

function latest(dir, prefix) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(".json")).sort();
  return files.length ? join(dir, files[files.length - 1]) : null;
}
function readJson(p, def = null) {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return def;
  }
}

/**
 * GSC UI の正規化データを読む。
 *
 * 優先順:
 *   1. **追跡 SSOT** `.claude/state/metrics/gsc-ui/ssot/urls/*.json`（どのマシン・どの worktree でも読める）
 *   2. 旧経路 最新 run の `<run>/normalized/*.json`（gitignore・そのマシンで取得した直後だけ存在）
 *
 * 1 を先に見る理由: 旧実装は 2 だけを見ており、run ディレクトリは gitignore なので
 * 取得したマシン以外ではレポートが「GSC UI CSV 未取得」に落ちていた（2026-07-23 の run が
 * worktree ごと消えて実際に再現不能になった）。SSOT を先に読めば診断が常に再現する。
 */
function loadGscUi() {
  const base = join(M, "gsc-ui");
  const out = { rows: [], runId: null, runDir: null, byIssueScope: [], source: "none" };
  if (!existsSync(base)) return out;

  const collect = (norm, sourceLabel) => {
    out.byIssueScope.push({
      issue: norm.issue,
      scope: norm.scope,
      uiTotal: norm.uiTotal,
      exportedRows: norm.exportedRows,
      truncated: norm.truncated,
      runId: norm.runId ?? null,
      collectedAt: norm.collectedAt ?? null,
    });
    for (const r of norm.rows || []) out.rows.push({ ...r, issue: norm.issue, scope: norm.scope });
    out.source = sourceLabel;
  };

  // 1. 追跡 SSOT
  const urlsDir = join(base, "ssot", "urls");
  if (existsSync(urlsDir)) {
    const files = readdirSync(urlsDir).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      const norm = readJson(join(urlsDir, f));
      if (norm && Array.isArray(norm.rows)) collect(norm, "ssot");
    }
    if (out.rows.length || files.length) {
      // SSOT のユニットは run が混在しうる（部分取得のとき）。最新 runId を代表値にする。
      out.runId = out.byIssueScope.map((u) => u.runId).filter(Boolean).sort().at(-1) ?? null;
      out.runDir = urlsDir;
      return out;
    }
  }

  // 2. 旧経路（run ローカル normalized）
  const runs = readdirSync(base)
    .filter((f) => existsSync(join(base, f, "manifest.json")))
    .sort();
  if (!runs.length) return out;
  const runDir = join(base, runs[runs.length - 1]);
  const normDir = join(runDir, "normalized");
  out.runDir = runDir;
  out.runId = runs[runs.length - 1];
  if (!existsSync(normDir)) return out;
  for (const f of readdirSync(normDir).filter((f) => f.endsWith(".json") && !f.endsWith(".rejects.json"))) {
    const norm = readJson(join(normDir, f));
    if (norm) collect(norm, "run-normalized");
  }
  return out;
}

/** URL Inspection 最新 batch → joinKey→{state, googleCanonical, userCanonical, lastCrawl, fetchState, verdict} */
function loadInspection() {
  // batch を優先（single-URL の ad-hoc 検査に引きずられないよう prefix を固定）。
  const f = latest(join(M, "url-inspection"), "inspection-batch-") || latest(join(M, "url-inspection"), "inspection-");
  const map = new Map();
  if (!f) return { map, file: null };
  const j = readJson(f);
  const results = j?.results || [];
  for (const r of results) {
    if (!r.url) continue;
    const key = toJoinKey(r.url);
    const idx = r.index || {};
    map.set(key, {
      url: r.url,
      state: idx.coverage_state || null,
      verdict: idx.verdict || null,
      googleCanonical: idx.google_canonical || null,
      userCanonical: idx.user_canonical || null,
      lastCrawl: idx.last_crawl_time || null,
      fetchState: idx.page_fetch_state || null,
      robotsState: idx.robots_txt_state || null,
    });
  }
  return { map, file: f };
}

/** GSC page 最新 → joinKey→{clicks,impressions,ctr,position}（page 次元を集約）。 */
function loadGscPage() {
  // page×query を優先し page も許容。keys[0]=page。
  const f = latest(join(M, "gsc"), "gsc-page");
  const map = new Map();
  if (!f) return { map, file: null };
  const j = readJson(f);
  for (const r of j?.rows || []) {
    const page = r.keys?.[0];
    if (!page || !/^https?:/i.test(page)) continue;
    const key = toJoinKey(page);
    const cur = map.get(key) || { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, n: 0 };
    cur.clicks += r.clicks || 0;
    cur.impressions += r.impressions || 0;
    cur.ctrSum += (r.ctr || 0) * (r.impressions || 0);
    cur.posSum += (r.position || 0) * (r.impressions || 0);
    cur.n += 1;
    map.set(key, cur);
  }
  // 加重平均で ctr/position を確定
  for (const [k, v] of map) {
    const impr = v.impressions || 0;
    map.set(k, {
      clicks: v.clicks,
      impressions: impr,
      ctr: impr ? v.ctrSum / impr : 0,
      position: impr ? v.posSum / impr : null,
    });
  }
  return { map, file: f };
}

/** GA4 page 最新 → joinKey→{activeUsers,sessions,engagementRate}。 */
function loadGa4Page() {
  const f = latest(join(M, "ga4"), "ga4-page");
  const map = new Map();
  if (!f) return { map, file: null };
  const j = readJson(f);
  for (const r of j?.rows || []) {
    if (!r.page) continue;
    const key = toJoinKey(r.page);
    map.set(key, {
      activeUsers: r.activeUsers ?? 0,
      sessions: r.sessions ?? 0,
      engagementRate: r.engagementRate ?? null,
    });
  }
  return { map, file: f };
}

/** sitemap（live 優先・不可なら out/sitemap.xml）→ Set<joinKey>。 */
async function loadSitemaps() {
  const local = new Set();
  const localPath = "out/sitemap.xml";
  if (existsSync(localPath)) {
    for (const loc of parseSitemap(readFileSync(localPath, "utf-8"))) local.add(toJoinKey(loc));
  }
  let live = null;
  let liveSource = null;

  // 1. fetch（社内プロキシ環境では失敗する）
  let xml = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${SITE_ORIGIN}/sitemap.xml`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      xml = await res.text();
      liveSource = "live";
    }
  } catch {
    /* 次の curl 経路へ */
  }

  // 2. curl フォールバック。measurement-incidents.md の恒久ルール
  //    「外部取得は fetch でなく curl --ssl-no-revoke」をここにも適用する。
  //    out/sitemap.xml が無い環境（build 前・別マシン）で live=0 になり、
  //    sitemap 依存の分類が総崩れするのを防ぐ（2026-07-30 実走で local=0/live=0 を踏んだ）。
  if (xml == null) {
    try {
      xml = execFileSync("curl", ["-s", "--ssl-no-revoke", "--max-time", "20", `${SITE_ORIGIN}/sitemap.xml`], {
        encoding: "utf-8",
        maxBuffer: 64 * 1024 * 1024,
      });
      if (xml && xml.includes("<loc>")) liveSource = "live-curl";
      else xml = null;
    } catch {
      xml = null;
    }
  }

  if (xml != null) {
    live = new Set();
    for (const loc of parseSitemap(xml)) live.add(toJoinKey(loc));
  }
  if (!live || live.size === 0) {
    live = local;
    liveSource = local.size > 0 ? "local-fallback" : "none";
  }
  return { live, local, liveSource };
}
function parseSitemap(xml) {
  const locs = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) locs.push(m[1]);
  return locs;
}

/** _redirects → Map<fromKey, {to, code}>（完全一致の path のみ・ワイルドカードは別枠）。 */
function loadRedirects() {
  const map = new Map();
  const wildcards = [];
  const p = "public/_redirects";
  if (!existsSync(p)) return { map, wildcards };
  for (const raw of readFileSync(p, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const [from, to, code] = parts;
    const c = parseInt(code || "301", 10);
    if (from.includes("*")) {
      wildcards.push({ from, to, code: c });
    } else {
      map.set(toJoinKey(from), { to, code: c });
    }
  }
  return { map, wildcards };
}

const HTML_CACHE = new Map();
/** out/docs/<slug>.html を読み canonical/robots/存在 を返す。 */
function localHtmlInfo(joinKey) {
  const slug = slugFromKey(joinKey);
  if (!slug) return { exists: false };
  if (HTML_CACHE.has(slug)) return HTML_CACHE.get(slug);
  const path = join("out", "docs", `${slug}.html`);
  let info = { exists: false };
  if (existsSync(path)) {
    const html = readFileSync(path, "utf-8");
    const canon = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
    const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
    info = {
      exists: true,
      canonical: canon ? canon[1] : null,
      robots: robots ? robots[1] : null,
    };
  }
  HTML_CACHE.set(slug, info);
  return info;
}

/** doc-meta-index → slug→{category, group, title}。 */
function loadDocMeta() {
  const j = readJson("src/config/doc-meta-index.json", { docs: {} });
  return j.docs || {};
}

/**
 * `published: false` の下書き slug 集合を返す（source は在るが未公開＝404 は設計通り）。
 * doc-meta（公開済のみ）に無い 404 slug を「後継への redirect 候補」と誤判定しないため。
 * Convention B: `posts/{category}/{dir}/article.mdx` → slug=`{category}-{dir}`。
 * Convention A: `posts/{category}/{name}.mdx` → slug=`{name}`。
 */
function loadDraftSlugs() {
  const set = new Set();
  const base = "content/site";
  if (!existsSync(base)) return set;
  const isDraft = (mdxPath) => {
    try {
      return /^published:\s*false\b/m.test(readFileSync(mdxPath, "utf-8").slice(0, 800));
    } catch {
      return false;
    }
  };
  for (const cat of readdirSync(base)) {
    const catDir = join(base, cat);
    let entries;
    try {
      if (!statSync(catDir).isDirectory()) continue;
      entries = readdirSync(catDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const p = join(catDir, entry);
      try {
        if (statSync(p).isDirectory()) {
          const mdx = join(p, "article.mdx");
          if (existsSync(mdx) && isDraft(mdx)) set.add(`${cat}-${entry}`);
        } else if (entry.endsWith(".mdx") || entry.endsWith(".md")) {
          if (isDraft(p)) set.add(entry.replace(/\.mdx?$/, ""));
        }
      } catch {
        /* skip */
      }
    }
  }
  return set;
}

/** 内部リンク流入数（best-effort・keyword-relations.json が target として持つ回数）。無ければ null。 */
function loadInternalInbound() {
  const j = readJson("src/config/keyword-relations.json", null);
  if (!j) return null;
  const counts = new Map();
  const bump = (slug) => counts.set(slug, (counts.get(slug) || 0) + 1);
  // 形が版により異なるため防御的に走査
  const walk = (obj) => {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) return obj.forEach(walk);
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" && /^[a-z0-9-]+$/.test(v)) bump(v);
      else walk(v);
    }
  };
  walk(j);
  return counts;
}

/** live HTTP（任意）: HEAD→失敗時 GET。redirect chain と最終 status を返す。 */
async function liveHttp(url) {
  const out = { httpStatus: null, redirectTarget: null, redirectHops: 0, redirectLoop: false };
  let current = url;
  const seen = new Set();
  for (let hop = 0; hop < 6; hop++) {
    if (seen.has(current)) {
      out.redirectLoop = true;
      break;
    }
    seen.add(current);
    let res;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      res = await fetch(current, { method: hop === 0 ? "HEAD" : "GET", redirect: "manual", signal: ctrl.signal });
      clearTimeout(t);
    } catch {
      break;
    }
    out.httpStatus = res.status;
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      out.redirectHops = hop + 1;
      out.redirectTarget = loc;
      current = new URL(loc, current).toString();
      continue;
    }
    break;
  }
  return out;
}

// ── main ─────────────────────────────────────────────

async function main() {
  const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + "Z";
  const gscUi = loadGscUi();
  const inspection = loadInspection();
  const gscPage = loadGscPage();
  const ga4Page = loadGa4Page();
  const { live: liveSitemap, local: localSitemap, liveSource } = await loadSitemaps();
  const { map: redirects, wildcards } = loadRedirects();
  const docMeta = loadDocMeta();
  const internalInbound = loadInternalInbound();
  const draftSlugs = loadDraftSlugs();

  // URL universe = GSC UI 行 ∪ Inspection 結果（問題 URL に集中）。
  const universe = new Map(); // joinKey → { url, comparisonKey, issues:Set }
  for (const r of gscUi.rows) {
    const jk = toJoinKey(r.url);
    const e = universe.get(jk) || { url: r.url, comparisonKey: r.comparisonKey || toComparisonKey(r.url), issues: new Set() };
    if (r.issue) e.issues.add(r.issue);
    universe.set(jk, e);
  }
  for (const [jk, insp] of inspection.map) {
    // 既に indexed(PASS) なだけの URL は普段は不要だが、canonical 不一致等は拾えるよう全件入れる。
    const e = universe.get(jk) || { url: insp.url, comparisonKey: toComparisonKey(insp.url), issues: new Set() };
    universe.set(jk, e);
  }

  const rows = [];
  for (const [jk, e] of universe) {
    const insp = inspection.map.get(jk) || null;
    const g = gscPage.map.get(jk) || null;
    const a = ga4Page.map.get(jk) || null;
    const html = localHtmlInfo(jk);
    const redir = redirects.get(jk) || null;
    const slug = slugFromKey(jk);
    const meta = slug ? docMeta[slug] : null;
    const absUrl = toAbsoluteUrl(e.comparisonKey || jk, SITE_ORIGIN) || e.url;

    // httpStatus（オフライン導出 + 任意で live）
    let httpStatus = null;
    let redirectTarget = redir ? redir.to : null;
    let redirectHops = redir ? 1 : 0;
    let redirectLoop = false;
    if (redir) httpStatus = redir.code; // _redirects の 301/302
    else if (html.exists) httpStatus = 200; // build 済み HTML = 到達可能
    else if (liveSitemap.has(jk) || localSitemap.has(jk)) httpStatus = 200;
    if (LIVE_HTTP) {
      const live = await liveHttp(absUrl);
      if (live.httpStatus != null) {
        httpStatus = live.httpStatus;
        redirectTarget = live.redirectTarget || redirectTarget;
        redirectHops = Math.max(redirectHops, live.redirectHops);
        redirectLoop = live.redirectLoop;
      }
    }

    // canonical 判定: 現 build の HTML canonical を最優先。
    // URL Inspection は数週間古く、user_canonical が陳腐化して homepage 等の誤値を返すことがある
    // （2026-07-24 seo-fix-planner が /about 等 9 件の FIX_TECHNICAL 誤検知として指摘）。
    // Google が自己を canonical 採用（google==self）または正常インデックス（verdict=PASS）なら self とみなす。
    const inspVerdict = insp?.verdict || null;
    const googleCanonical = insp?.googleCanonical || null;
    const googleIsSelf = googleCanonical ? toJoinKey(googleCanonical) === jk : false;
    const htmlCanon = html.canonical || null;
    const userCanonical = htmlCanon || insp?.userCanonical || null;
    let selfCanonical;
    if (htmlCanon != null) selfCanonical = toJoinKey(htmlCanon) === jk;
    else if (googleIsSelf || inspVerdict === "PASS") selfCanonical = true;
    else if (insp?.userCanonical) selfCanonical = toJoinKey(insp.userCanonical) === jk;
    else selfCanonical = null;
    // canonical mismatch を分類器へ渡すのは「実際に問題がある」ときだけ。
    // Google 自己 canonical / PASS / HTML 自己 canonical なら不一致扱いにしない（陳腐値の誤検知抑止）。
    const canonicalOk = googleIsSelf || inspVerdict === "PASS" || selfCanonical === true;
    const robots = html.robots || null;

    const issuesArr = [...e.issues];
    const primaryIssue = issuesArr[0] || null;
    const inLive = liveSitemap.has(jk);
    const inLocal = localSitemap.has(jk);
    const impressions = g?.impressions ?? 0;
    const activeUsers = a?.activeUsers ?? 0;

    const signal = {
      comparisonKey: e.comparisonKey,
      inLiveSitemap: inLive,
      inLocalSitemap: inLocal,
      httpStatus,
      redirectTarget,
      redirectHops,
      redirectLoop,
      selfCanonical,
      googleCanonical,
      userCanonical,
      canonicalOk,
      robots,
      gscUiIssue: primaryIssue,
      gscInspectionState: insp?.state || null,
      clicks: g?.clicks ?? 0,
      impressions,
      ctr: g?.ctr ?? 0,
      position: g?.position ?? null,
      activeUsers,
      sessions: a?.sessions ?? 0,
      engagementRate: a?.engagementRate ?? null,
      internalInbound: internalInbound && slug ? internalInbound.get(slug) ?? 0 : null,
      lastCrawled: insp?.lastCrawl || null,
      // 派生シグナル
      isIntentionalRedirect: !!redir,
      hasSuccessor: !!redir,
      // published:false の下書き（source 在・未公開）＝404 は設計通り。redirect 候補にしない。
      isDraft: slug ? draftSlugs.has(slug) : false,
      lowValue: primaryIssue === "crawledNotIndexed" && impressions === 0 && activeUsers === 0,
      // 以下は意味判断が要るため保守的に false（seo-fix-planner が semantic に上書き）
      isIntentionalNoindex: robots ? /noindex/i.test(robots) : false,
      similarCluster: false,
      cannibalization: false,
      hasParent: false,
      hasExternalLinks: false,
      autoFixableInternalLink: false,
    };

    const cls = classifyUrl(signal);
    rows.push({
      url: absUrl,
      comparisonKey: e.comparisonKey,
      contentFamily: meta?.category || familyFromKey(jk),
      inLiveSitemap: inLive,
      inLocalSitemap: inLocal,
      httpStatus,
      redirectTarget,
      redirectHops,
      selfCanonical,
      googleCanonical,
      robots,
      gscUiIssue: primaryIssue,
      gscInspectionState: insp?.state || null,
      clicks: signal.clicks,
      impressions: signal.impressions,
      ctr: signal.ctr,
      position: signal.position,
      activeUsers: signal.activeUsers,
      sessions: signal.sessions,
      engagementRate: signal.engagementRate,
      internalInbound: signal.internalInbound,
      lastCrawled: signal.lastCrawled,
      action: cls.action,
      confidence: cls.confidence,
      reasons: cls.reasons,
      proposedTarget: redirectTarget,
      requiresApproval: cls.requiresApproval,
    });
  }

  // アクション別集計
  const ACTIONS = [
    "FIX_TECHNICAL",
    "REDIRECT_LEGACY",
    "KEEP_MONITOR",
    "CONSOLIDATE_CANDIDATE",
    "NOINDEX_CANDIDATE",
    "EXPECTED_EXCLUSION",
    "UNKNOWN_REVIEW",
  ];
  const counts = Object.fromEntries(ACTIONS.map((a) => [a, rows.filter((r) => r.action === a).length]));

  // 優先修正 Top20（FIX_TECHNICAL > REDIRECT_LEGACY、impressions 降順）
  const priorityRank = { FIX_TECHNICAL: 0, REDIRECT_LEGACY: 1, CONSOLIDATE_CANDIDATE: 2, NOINDEX_CANDIDATE: 3, UNKNOWN_REVIEW: 4, KEEP_MONITOR: 5, EXPECTED_EXCLUSION: 6 };
  const top = [...rows]
    .filter((r) => ["FIX_TECHNICAL", "REDIRECT_LEGACY", "CONSOLIDATE_CANDIDATE", "UNKNOWN_REVIEW"].includes(r.action))
    .sort((x, y) => (priorityRank[x.action] - priorityRank[y.action]) || (y.impressions - x.impressions) || (y.confidence - x.confidence))
    .slice(0, 20);

  // 前回レポートとの差分
  const prev = latest(OUT_DIR, "search-growth-") && findPrevReport(runId);
  const prevCounts = prev ? prev.counts : null;

  const meta = {
    runId,
    generatedAt: new Date().toISOString(),
    liveSource: liveSource,
    sources: {
      gscUiRun: gscUi.runId || null,
      gscUiRows: gscUi.rows.length,
      // どこから読んだか: "ssot"（追跡・常に再現可）/ "run-normalized"（そのマシンの run のみ）/ "none"
      gscUiSource: gscUi.source,
      inspection: inspection.file,
      gscPage: gscPage.file,
      ga4Page: ga4Page.file,
      sitemapLive: liveSitemap.size,
      sitemapLocal: localSitemap.size,
      redirects: redirects.size,
      wildcardRedirects: wildcards.length,
    },
    gscUiByIssueScope: gscUi.byIssueScope,
    counts,
    prevCounts,
    universe: rows.length,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = join(OUT_DIR, `search-growth-${runId}.json`);
  writeFileSync(jsonPath, JSON.stringify({ meta, rows }, null, 2), "utf-8");
  const md = renderMarkdown(meta, rows, top, counts, prevCounts);
  writeFileSync(join(OUT_DIR, "search-growth-latest.md"), md, "utf-8");

  console.log(`[search-growth] universe=${rows.length} URL / liveSitemap=${liveSource}`);
  // 分類は sitemap 収録の有無に強く依存する。sitemap が 1 件も読めていない状態で出した
  // 「NOINDEX_CANDIDATE 313 / UNKNOWN_REVIEW 1890」は根拠が無い（2026-07-30 実走で踏んだ）。
  // 退化を黙って通さず、明示して非 0 で返す（§9: 検査不成立を PASS と呼ばない）。
  if (liveSitemap.size === 0 && localSitemap.size === 0) {
    console.error("");
    console.error("[search-growth] ✗ sitemap を 1 件も読めていない（live=0 / local=0）。");
    console.error(
      "  sitemap 収録の有無に依存する分類（KEEP_MONITOR / NOINDEX_CANDIDATE / EXPECTED_EXCLUSION）は成立しません。",
    );
    console.error(
      "  対処: ネットワークが通る環境で再実行するか、npm run build で out/sitemap.xml を生成してから再実行してください。",
    );
    process.exitCode = 2;
  }
  console.log(`  ` + ACTIONS.map((a) => `${a}:${counts[a]}`).join(" / "));
  console.log(`  → ${jsonPath}`);
  console.log(`  → ${join(OUT_DIR, "search-growth-latest.md")}`);
}

function familyFromKey(jk) {
  const slug = slugFromKey(jk);
  if (!slug) return "other";
  const m = slug.match(/^(civil-construction-1|civil-construction-2|pe-comprehensive-management|pe-construction|pe-first-stage|concrete-chief-engineer|concrete-diagnostician|reference-materials)/);
  return m ? m[1] : "other";
}

function findPrevReport(currentRunId) {
  if (!existsSync(OUT_DIR)) return null;
  const files = readdirSync(OUT_DIR)
    .filter((f) => f.startsWith("search-growth-") && f.endsWith(".json"))
    .sort();
  const prev = files.filter((f) => !f.includes(currentRunId));
  if (!prev.length) return null;
  return readJson(join(OUT_DIR, prev[prev.length - 1]))?.meta || null;
}

function fmtPct(v) {
  return v == null ? "n.d." : (v * 100).toFixed(1) + "%";
}

function renderMarkdown(meta, rows, top, counts, prevCounts) {
  const L = [];
  L.push(`# Search Growth 診断レポート`);
  L.push("");
  L.push(`- run: \`${meta.runId}\` / 生成: ${meta.generatedAt}`);
  L.push(`- URL universe: **${meta.universe}** 件（GSC UI ${meta.sources.gscUiRows} 行 ∪ URL Inspection）`);
  L.push(`- sitemap: live=${meta.sources.sitemapLive}（source: ${meta.liveSource}）/ local=${meta.sources.sitemapLocal} / _redirects=${meta.sources.redirects}`);
  L.push(`- 入力: inspection=\`${short(meta.sources.inspection)}\` gsc-page=\`${short(meta.sources.gscPage)}\` ga4-page=\`${short(meta.sources.ga4Page)}\``);
  L.push(`- GSC UI データ源: \`${meta.sources.gscUiSource ?? "none"}\`（ssot=追跡SSOT・どのマシン/worktree でも再現／run-normalized=このマシンの run のみ）`);
  L.push("");

  if ((meta.sources.sitemapLive ?? 0) === 0 && (meta.sources.sitemapLocal ?? 0) === 0) {
    L.push(`> [!warning] sitemap を 1 件も読めていません（live=0 / local=0）。`);
    L.push(`> sitemap 収録の有無に依存する分類（KEEP_MONITOR / NOINDEX_CANDIDATE / EXPECTED_EXCLUSION）は**成立していません**。`);
    L.push(`> 下のアクション別件数はこの退化を含んだ数字なので、判断の根拠に使わないでください。`);
    L.push("");
  }

  if (meta.gscUiByIssueScope?.length) {
    L.push(`## GSC UI 理由別（画面総数 vs CSV 行数 / 1,000 件上限）`);
    L.push("");
    L.push(`| issue | scope | 画面総数 | CSV行数 | truncated |`);
    L.push(`|---|---|--:|--:|:--:|`);
    for (const u of meta.gscUiByIssueScope) {
      L.push(`| ${u.issue} | ${u.scope} | ${u.uiTotal ?? "?"} | ${u.exportedRows} | ${u.truncated ? "⚠ yes" : "no"} |`);
    }
    L.push("");
  } else {
    L.push(`> GSC UI CSV 未取得（\`npm run gsc-ui:fetch\` 前）。URL Inspection ベースで診断中。`);
    L.push("");
  }

  L.push(`## アクション別件数`);
  L.push("");
  L.push(`| action | 件数 | 前回比 |`);
  L.push(`|---|--:|--:|`);
  for (const [a, n] of Object.entries(counts)) {
    const diff = prevCounts ? n - (prevCounts[a] ?? 0) : null;
    L.push(`| ${a} | ${n} | ${diff == null ? "—" : (diff >= 0 ? "+" : "") + diff} |`);
  }
  L.push("");
  L.push(`> 自動適用は内部リンクの旧 URL 修正のみ。redirect 追加・noindex・統合・削除・deploy は approval gate で停止。`);
  L.push("");

  L.push(`## 優先修正 Top${top.length}（FIX_TECHNICAL → REDIRECT_LEGACY、impressions 降順）`);
  L.push("");
  L.push(`| # | action | url | status | impr | pos | inSitemap | issue | 根拠 |`);
  L.push(`|--:|---|---|--:|--:|--:|:--:|---|---|`);
  top.forEach((r, i) => {
    L.push(
      `| ${i + 1} | ${r.action} | ${r.comparisonKey || r.url} | ${r.httpStatus ?? "?"} | ${r.impressions} | ${r.position?.toFixed?.(1) ?? "—"} | ${r.inLiveSitemap ? "✓" : "—"} | ${r.gscUiIssue || r.gscInspectionState || "—"} | ${(r.reasons[0] || "").slice(0, 48)} |`,
    );
  });
  if (!top.length) L.push(`（優先修正候補なし）`);
  L.push("");

  L.push(`## 承認が必要な次アクション（人間判断）`);
  L.push("");
  L.push(`- FIX_TECHNICAL ${counts.FIX_TECHNICAL} 件: sitemap 掲載なのに壊れている URL の技術修正（redirect/canonical/robots）`);
  L.push(`- REDIRECT_LEGACY ${counts.REDIRECT_LEGACY} 件: 旧 URL → 後継への 301 追加（\`public/_redirects\`）`);
  L.push(`- CONSOLIDATE_CANDIDATE ${counts.CONSOLIDATE_CANDIDATE} 件 / NOINDEX_CANDIDATE ${counts.NOINDEX_CANDIDATE} 件: 統合/noindex は要精査（自動適用しない）`);
  L.push(`- UNKNOWN_REVIEW ${counts.UNKNOWN_REVIEW} 件: 追加データ（GSC UI CSV / live HTTP）で確定`);
  L.push("");
  L.push(`これらはいずれも外部状態・本文・redirect を変更しない。実施は \`/google-search-growth\` の approval gate 通過後。`);
  return L.join("\n");
}
function short(p) {
  return p ? String(p).split(/[\\/]/).pop() : "—";
}

main().catch((e) => {
  console.error("Error:", e?.message || e);
  process.exit(1);
});

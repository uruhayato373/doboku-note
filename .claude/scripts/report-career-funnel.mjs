/**
 * report-career-funnel.mjs — キャリア（転職アフィリエイト）ファネルの基線レポート。
 *
 * なぜ別スクリプトか: `report-buildjob-affiliate` は「案件（BuildJob / 建設JOBs）別の EPC」を見る。
 *   こちらは「記事単位の棚卸し」と「流入→回遊→CTA→成果のどこが詰まっているか」を見る。責務が
 *   直交するので複製ではなく併設し、窓の解決だけ `lib/ga4-snapshot.mjs` と同じ規約を踏襲する。
 *
 * 設計上の約束:
 *   - 外部 API を叩かない。ローカル/CI が取得済みの JSON だけを入力にする（会社 PC はプロキシで外部遮断）。
 *   - **GA4 と GSC の窓は一致しない**（GA4 = 直近 28 日 / GSC = 3 日遅れの 28 日）。同じ比率へ混ぜず、
 *     出所ごとに窓を明示する。窓が違うこと自体は異常ではないので WARN 止まり。
 *   - 検査ゼロを PASS と呼ばない（CLAUDE.md §9）: 入力ファイル・career 記事数・突合できた行数を必ず出す。
 *     career 記事 0 件や主要入力の全欠は exit 2（検査不成立）。
 *
 * Usage:
 *   node .claude/scripts/report-career-funnel.mjs            レポート生成（latest を上書き）
 *   node .claude/scripts/report-career-funnel.mjs --freeze   基線を固定名で凍結（Phase 06 の比較対象）
 *   node .claude/scripts/report-career-funnel.mjs --json     機械可読（stdout は JSON だけ）
 *
 * exit: 0 生成成功 / 2 検査不成立
 *
 * 設定（語彙・柱の分類規則）: .claude/config/career-funnel.json
 * 方針の真実源: .claude/knowledge/reference/affiliate-operations.md「キャリアの計測は 2 つの窓を混ぜない」
 * 評価サイクル: .claude/state/experiments.json の EXP-008（凍結した基線と deploy+28 日で比較する）
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GA4_DIR = join(ROOT, ".claude/state/metrics/ga4");
const GSC_DIR = join(ROOT, ".claude/state/metrics/gsc");
const AFF_DIR = join(ROOT, ".claude/state/metrics/affiliate");
const CONFIG = join(ROOT, ".claude/config/career-funnel.json");
const SITE_DIR = join(ROOT, "content/site");
const NOTE_DIR = join(ROOT, "content/note");

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const toPosix = (p) => p.split("\\").join("/");
const relative = (p) => toPosix(p).slice(toPosix(ROOT).length + 1);

/** prefix で始まる最新スナップショットを返す。数字境界で prefix の誤マッチを防ぐ。 */
export function latestSnapshot(dir, prefix) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && /\d/.test(f.charAt(prefix.length)) && f.endsWith(".json"))
    .sort();
  return files.length ? join(dir, files[files.length - 1]) : null;
}

// ---- 純関数（テストから使う）------------------------------------------------

/** slug を 5 本の柱へ分類する。配列順の first-match-wins。当たらなければ unclassified。 */
export function classifyPillar(slug, pillarRules) {
  for (const rule of pillarRules) {
    if (rule.slugPatterns.some((p) => slug.includes(p))) return rule.pillar;
  }
  return "unclassified";
}

/** query が高意図語彙を含むか。 */
export function isHighIntentQuery(query, terms) {
  return terms.some((t) => query.includes(t));
}

/**
 * GA4 と GSC の窓を比較する。**一致しないのが通常**（取得元の遅延が違う）なので不一致は WARN。
 * 片方でも欠けたら usable:false。
 */
export function checkWindows(ga4Meta, gscMeta) {
  const ga4 = ga4Meta ? { start: ga4Meta.startDate, end: ga4Meta.endDate } : null;
  const gsc = gscMeta ? { start: gscMeta.startDate, end: gscMeta.endDate } : null;
  const aligned = Boolean(ga4 && gsc && ga4.start === gsc.start && ga4.end === gsc.end);
  return { ga4, gsc, aligned, usable: Boolean(ga4 && gsc) };
}

/** 窓の終端が何日前かを返す（鮮度警告用）。解釈できなければ null。 */
export function stalenessDays(endDate, now) {
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(end)) return null;
  return Math.floor((now - end) / 86400000);
}

/** イベント行を Map<dimValue, {impressions, clicks}> へ畳む。実際に畳めた行数も返す。 */
export function foldEvents(rows, dimKey, { impressionEvent, clickEvent }) {
  const out = new Map();
  let matched = 0;
  for (const r of rows) {
    const key = r[dimKey];
    if (key == null) continue;
    if (r.eventName !== impressionEvent && r.eventName !== clickEvent) continue;
    matched += 1;
    const cur = out.get(key) ?? { impressions: 0, clicks: 0 };
    if (r.eventName === impressionEvent) cur.impressions += r.eventCount ?? 0;
    else cur.clicks += r.eventCount ?? 0;
    out.set(key, cur);
  }
  return { map: out, matched };
}

/**
 * `(not set)` の原因を切り分ける。
 *
 *   (a) 窓の始端が**カスタムディメンションの作成日より前** → GA4 は遡及しないので (not set) が出る。仕様。
 *   (b) 窓が全て作成日以降なのに (not set) がある → 本当に label/placement を出していない面がある。
 *
 * 2026-08-21 に (a) を (b) と読み違えた（cta_placement 作成 2026-07-25 / 窓の始端 07-16）ため、
 * 目視でなく機械で判定する。
 */
export function classifyNotSet({ windowStart, registeredAt }) {
  if (!registeredAt) return { kind: "unknown", preRegistrationDays: 0 };
  if (windowStart >= registeredAt) return { kind: "wiring-gap", preRegistrationDays: 0 };
  const days = Math.round((Date.parse(registeredAt) - Date.parse(windowStart)) / 86400000);
  return { kind: "pre-registration", preRegistrationDays: days };
}

/** A8 レコード配列を合算する。 */
export function sumA8(rows) {
  return rows.reduce(
    (acc, r) => ({
      clicks: acc.clicks + (r.clicks ?? 0),
      conversions: acc.conversions + (r.conversions ?? 0),
      approved: acc.approved + (r.approved ?? 0),
      revenueYen: acc.revenueYen + (r.revenueYen ?? 0),
    }),
    { clicks: 0, conversions: 0, approved: 0, revenueYen: 0 },
  );
}

// ---- 収集 -------------------------------------------------------------------

function collectCareerDocs(cfg) {
  const index = readJson(join(ROOT, "src/config/doc-meta-index.json"));
  const docs = [];
  for (const [slug, m] of Object.entries(index.docs)) {
    if (!(m.tags ?? []).includes("career")) continue;
    docs.push({
      slug,
      category: m.category,
      title: m.shortTitle || m.title,
      published: m.published !== false,
      reviewStatus: m.reviewStatus ?? null,
      group: m.group ?? null,
      pillar: classifyPillar(slug, cfg.pillarRules),
    });
  }
  docs.sort((a, b) => a.slug.localeCompare(b.slug));
  return { docs, indexTotal: Object.keys(index.docs).length };
}

/**
 * MDX 以外に内部リンクを持つソース。
 *
 * 2026-08-21 に hub の「悩みから選ぶ」表を `<CareerNeedPicker />` へ置き換えた結果、
 * hub → 5 柱のリンクが MDX から消えて **TS 設定側へ移った**。MDX だけを走査すると
 * 「hub が柱へ繋がっていない」と誤って報告されるため、ここも数える。
 */
const EXTRA_LINK_SOURCES = ["src/config/career-pathways.ts"];

/** content/site の全 MDX を読み、career slug への literal 内部リンクと CareerAffiliate 出現を数える。 */
function scanSiteSources(careerSlugs) {
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".mdx")) files.push(p);
    }
  };
  walk(SITE_DIR);

  const inboundLinks = new Map(careerSlugs.map((s) => [s, 0]));
  const affiliateBySlug = new Map(careerSlugs.map((s) => [s, { careerAffiliate: 0, placements: [] }]));
  const slugOfFile = new Map();

  for (const f of files) {
    const parts = relative(f).split("/"); // content/site/{category}/{...}
    const category = parts[2];
    const tail = parts.slice(3).join("/");
    const name = tail.endsWith("/article.mdx")
      ? tail.slice(0, -"/article.mdx".length)
      : tail.slice(0, -".mdx".length);
    slugOfFile.set(f, `${category}-${name}`);
  }

  for (const f of files) {
    const src = readFileSync(f, "utf8");
    const self = slugOfFile.get(f);
    for (const slug of careerSlugs) {
      if (slug === self) continue;
      const hits = src.split(`/docs/${slug}`).length - 1;
      if (hits > 0) inboundLinks.set(slug, inboundLinks.get(slug) + hits);
    }
    if (self && affiliateBySlug.has(self)) {
      const entry = affiliateBySlug.get(self);
      entry.careerAffiliate = src.split("<CareerAffiliate").length - 1;
      for (const m of src.matchAll(/placement=\{?["']([a-z-]+)["']\}?/g)) entry.placements.push(m[1]);
    }
  }
  // MDX の外にあるリンク源（TS 設定など）。どのファイルから来たかは区別せず本数だけ足す。
  let extraScanned = 0;
  for (const rel of EXTRA_LINK_SOURCES) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    extraScanned += 1;
    const src = readFileSync(abs, "utf8");
    for (const slug of careerSlugs) {
      const hits = src.split(`/docs/${slug}`).length - 1;
      if (hits > 0) inboundLinks.set(slug, inboundLinks.get(slug) + hits);
    }
  }

  return { inboundLinks, affiliateBySlug, siteFiles: files.length, extraScanned };
}

function collectNoteCareer(cfg) {
  const out = [];
  const field = (head, key) => {
    const m = new RegExp(`^${key}:\\s*"?([^"\\r\\n]+)"?`, "m").exec(head);
    return m ? m[1].trim() : null;
  };
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      // 型別ファイル（article-*.md）を落とさない（CLAUDE.md §9）
      else if (/^article(-[^/\\]+)?\.md$/.test(e.name)) {
        const head = readFileSync(p, "utf8").slice(0, 2000);
        const utm = field(head, "utmCampaign");
        if (!utm || !utm.startsWith(cfg.noteUtmPrefix)) continue;
        out.push({
          path: relative(p),
          utmCampaign: utm,
          noteId: field(head, "noteId"),
          noteUrl: field(head, "noteUrl"),
          noteStatus: field(head, "noteStatus"),
          notePricing: field(head, "notePricing"),
        });
      }
    }
  };
  walk(NOTE_DIR);
  out.sort((a, b) => a.utmCampaign.localeCompare(b.utmCampaign));
  return out;
}

// ---- 本体 -------------------------------------------------------------------

function main() {
  const jsonOut = process.argv.includes("--json");
  const freeze = process.argv.includes("--freeze");
  const say = jsonOut ? console.error : console.log;
  const warnings = [];

  const cfg = readJson(CONFIG);

  const inputs = {
    ga4Label: latestSnapshot(GA4_DIR, "ga4-cta-clicks-by-label-"),
    ga4Placement: latestSnapshot(GA4_DIR, "ga4-cta-clicks-by-placement-"),
    ga4Device: latestSnapshot(GA4_DIR, "ga4-cta-clicks-by-device-"),
    ga4Page: latestSnapshot(GA4_DIR, "ga4-page-"),
    gscPageQuery: latestSnapshot(GSC_DIR, "gsc-page-query-"),
    a8: existsSync(join(AFF_DIR, "a8-results.json")) ? join(AFF_DIR, "a8-results.json") : null,
  };
  const missing = Object.entries(inputs)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    warnings.push(`入力欠落 ${missing.length} 件: ${missing.join(", ")}（CI の fetch-metrics 供給を確認する）`);
  }
  if (!inputs.ga4Label || !inputs.gscPageQuery) {
    console.error("✗ 検査不成立: GA4 by-label と GSC page-query が揃わないとファネルを描けない");
    process.exit(2);
  }

  const ga4Label = readJson(inputs.ga4Label);
  const ga4Placement = inputs.ga4Placement ? readJson(inputs.ga4Placement) : { meta: null, rows: [] };
  const ga4Page = inputs.ga4Page ? readJson(inputs.ga4Page) : { meta: null, rows: [] };
  const gscPageQuery = readJson(inputs.gscPageQuery);
  const a8 = inputs.a8 ? readJson(inputs.a8) : { records: [] };

  const windows = checkWindows(ga4Label.meta, gscPageQuery.meta);
  if (!windows.aligned) {
    warnings.push(
      `窓が不一致（GA4 ${windows.ga4.start}〜${windows.ga4.end} / GSC ${windows.gsc.start}〜${windows.gsc.end}）。` +
        "取得元の遅延差なので異常ではないが、出所を跨いで CTR/EPC を割らないこと",
    );
  }
  const stale = stalenessDays(windows.ga4.end, Date.now());
  if (stale != null && stale > 10) {
    warnings.push(`GA4 の窓の終端が ${stale} 日前。計測 CI の供給停止を疑う（fetch-metrics の直近 run を見る）`);
  }

  // --- 記事台帳 ---
  const { docs, indexTotal } = collectCareerDocs(cfg);
  if (docs.length === 0) {
    console.error("✗ 検査不成立: career タグの記事が 0 件（doc-meta-index の破損を疑う）");
    process.exit(2);
  }
  const careerSlugs = docs.map((d) => d.slug);
  const { inboundLinks, affiliateBySlug, siteFiles, extraScanned } = scanSiteSources(careerSlugs);

  const ga4PageBySlug = new Map();
  for (const r of ga4Page.rows ?? []) {
    const m = /^\/docs\/([^/?#]+)/.exec(r.page ?? "");
    if (m) ga4PageBySlug.set(m[1], { users: r.activeUsers ?? 0, sessions: r.sessions ?? 0 });
  }

  const gscBySlug = new Map();
  let gscCareerRows = 0;
  for (const r of gscPageQuery.rows ?? []) {
    const [url, query] = r.keys ?? [];
    if (!url) continue;
    const m = /\/docs\/([^/?#]+)/.exec(url);
    if (!m) continue;
    const slug = m[1];
    if (!inboundLinks.has(slug)) continue;
    gscCareerRows += 1;
    const cur = gscBySlug.get(slug) ?? { impressions: 0, clicks: 0, positions: [], queries: [] };
    cur.impressions += r.impressions ?? 0;
    cur.clicks += r.clicks ?? 0;
    if (typeof r.position === "number") cur.positions.push(r.position);
    cur.queries.push({ query, impressions: r.impressions ?? 0, clicks: r.clicks ?? 0 });
    gscBySlug.set(slug, cur);
  }

  const ledger = docs.map((d) => {
    const gsc = gscBySlug.get(d.slug);
    const ga = ga4PageBySlug.get(d.slug);
    const aff = affiliateBySlug.get(d.slug) ?? { careerAffiliate: 0, placements: [] };
    const avgPos =
      gsc && gsc.positions.length
        ? Number((gsc.positions.reduce((s, n) => s + n, 0) / gsc.positions.length).toFixed(1))
        : null;
    return {
      ...d,
      gscImpressions: gsc?.impressions ?? 0,
      gscClicks: gsc?.clicks ?? 0,
      gscPosition: avgPos,
      topQueries: (gsc?.queries ?? []).sort((a, b) => b.impressions - a.impressions).slice(0, 3),
      ga4Users: ga?.users ?? null,
      ga4Sessions: ga?.sessions ?? null,
      inboundLiteralLinks: inboundLinks.get(d.slug) ?? 0,
      careerAffiliateCount: aff.careerAffiliate,
      placements: [...new Set(aff.placements)],
    };
  });

  const inGa4Top = ledger.filter((r) => r.ga4Users != null).length;
  if (inGa4Top === 0) {
    warnings.push(
      `GA4 page スナップショットは上位 ${ga4Page.meta?.limit ?? "?"} ページのみで、career 記事は 1 本も入っていない。` +
        "users/sessions は「0」ではなく「観測範囲外」なので断定に使わない",
    );
  }

  // --- 高意図 query ---
  const terms = cfg.highIntentQueryTerms;
  let hiImpr = 0;
  let hiClicks = 0;
  const hiRows = [];
  for (const r of gscPageQuery.rows ?? []) {
    const [url, query] = r.keys ?? [];
    if (!query || !isHighIntentQuery(query, terms)) continue;
    hiImpr += r.impressions ?? 0;
    hiClicks += r.clicks ?? 0;
    hiRows.push({
      query,
      url,
      impressions: r.impressions ?? 0,
      clicks: r.clicks ?? 0,
      position: r.position ?? null,
    });
  }
  hiRows.sort((a, b) => b.impressions - a.impressions);

  // --- affiliate CTA ---
  const byLabel = foldEvents(ga4Label.rows ?? [], "label", {
    impressionEvent: "affiliate_cta_impression",
    clickEvent: "affiliate_cta_click",
  });
  const byPlacement = foldEvents(ga4Placement.rows ?? [], "placement", {
    impressionEvent: "affiliate_cta_impression",
    clickEvent: "affiliate_cta_click",
  });
  const totalImpr = [...byPlacement.map.values()].reduce((s, v) => s + v.impressions, 0);
  const totalClicks = [...byPlacement.map.values()].reduce((s, v) => s + v.clicks, 0);

  // (not set) は label / placement の**両方**を見る。片方だけ見ると、
  // 「表示には placement が付くがクリックには付かない」面（= クリックの帰属が丸ごと消える）を見逃す。
  //
  // ただし原因は 2 通りあり、混同すると存在しない配線バグを追いかけることになる。
  //   (a) 窓の始端が**カスタムディメンションの作成日より前** → GA4 は遡及しないので (not set) が出る。仕様。
  //   (b) 窓が全て作成日以降なのに (not set) がある → 本当に label/placement を出していない面がある。
  // 2026-08-21 に (a) を (b) と読み違えた（cta_placement 作成 2026-07-25 / 窓の始端 07-16）ので、
  // ここで機械的に切り分ける。
  const notSetFindings = [];
  for (const [dim, param, folded] of [
    ["label", "event_label", byLabel],
    ["placement", "cta_placement", byPlacement],
  ]) {
    const notSet = [...folded.map.entries()].filter(([k]) => k === "(not set)" || k === "");
    if (!notSet.length) continue;
    const clicks = notSet.reduce((s, [, v]) => s + v.clicks, 0);
    const impressions = notSet.reduce((s, [, v]) => s + v.impressions, 0);
    const registeredAt = cfg.dimensionRegisteredAt?.[param] ?? null;
    const verdict = classifyNotSet({ windowStart: windows.ga4.start, registeredAt });
    const share = totalClicks ? `（全クリックの ${((clicks / totalClicks) * 100).toFixed(0)}%）` : "";
    const cause =
      verdict.kind === "pre-registration"
        ? `窓の始端 ${windows.ga4.start} が ${param} の作成日 ${registeredAt} より ${verdict.preRegistrationDays} 日前。` +
          "GA4 は作成日より前へ遡及しないため**仕様どおり**で、配線欠落ではない。" +
          `判定は ${registeredAt} 以降の窓で行う`
        : verdict.kind === "wiring-gap"
          ? `窓は全て ${param} 作成日（${registeredAt}）以降。` +
            "**本当に label/placement を出していない面がある**（Phase 03 の対象）"
          : `${param} の作成日が設定に無く、遡及不可か配線欠落かを切り分けられない`;
    notSetFindings.push({ dim, param, clicks, impressions, registeredAt, ...verdict, cause });
    warnings.push(`by-${dim} の (not set): 表示 ${impressions} / クリック ${clicks}${share}。${cause}`);
  }

  // --- A8 ---
  const startMonth = windows.ga4.start.slice(0, 7);
  const endMonth = windows.ga4.end.slice(0, 7);
  const a8All = a8.records ?? [];
  const a8InWindow = a8All.filter((r) => r.month >= startMonth && r.month <= endMonth);

  // --- 起票時基線との比較 ---
  const base = cfg.reportedBaseline;
  const drift = [];
  const cmp = (name, now, was) => {
    if (!was) return;
    const ratio = now / was;
    if (ratio < 0.7 || ratio > 1.4) {
      drift.push(`${name}: 起票時 ${was} → 今回 ${now}（${(ratio * 100).toFixed(0)}%）`);
    }
  };
  cmp("affiliate 表示", totalImpr, base.affiliateImpressions);
  cmp("affiliate クリック", totalClicks, base.affiliateClicks);
  cmp("高意図 query 表示", hiImpr, base.highIntentQueryImpressions);

  const pillarSummary = {};
  for (const r of ledger) {
    const p = (pillarSummary[r.pillar] ??= { articles: 0, gscImpressions: 0, gscClicks: 0, inboundLinks: 0 });
    p.articles += 1;
    p.gscImpressions += r.gscImpressions;
    p.gscClicks += r.gscClicks;
    p.inboundLinks += r.inboundLiteralLinks;
  }

  const noteCareer = collectNoteCareer(cfg);

  const result = {
    generatedAt: new Date().toISOString(),
    windows,
    inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v ? relative(v) : null])),
    coverage: {
      docMetaIndexTotal: indexTotal,
      careerArticles: ledger.length,
      siteMdxScanned: siteFiles,
      extraLinkSourcesScanned: extraScanned,
      gscRowsTotal: (gscPageQuery.rows ?? []).length,
      gscRowsMatchedCareer: gscCareerRows,
      ga4LabelRowsMatched: byLabel.matched,
      ga4PlacementRowsMatched: byPlacement.matched,
      careerArticlesInGa4Top: inGa4Top,
      noteCareerArticles: noteCareer.length,
    },
    funnel: {
      highIntentQuery: { impressions: hiImpr, clicks: hiClicks, rows: hiRows.slice(0, 25) },
      internalLinks: Object.fromEntries(Object.entries(pillarSummary).map(([k, v]) => [k, v.inboundLinks])),
      affiliateCta: {
        byPlacement: Object.fromEntries(byPlacement.map),
        byLabel: Object.fromEntries([...byLabel.map].sort((a, b) => b[1].impressions - a[1].impressions)),
        totalImpressions: totalImpr,
        totalClicks: totalClicks,
        ctr: totalImpr ? totalClicks / totalImpr : null,
        notSet: notSetFindings,
      },
      a8: {
        window: sumA8(a8InWindow),
        allTime: sumA8(a8All),
        monthsInWindow: [...new Set(a8InWindow.map((r) => r.month))],
      },
    },
    pillars: pillarSummary,
    ledger,
    noteCareer,
    baselineDrift: drift,
    warnings,
  };

  writeFileSync(join(AFF_DIR, "career-funnel-latest.json"), `${JSON.stringify(result, null, 2)}\n`);
  writeFileSync(join(AFF_DIR, "career-funnel-latest.md"), renderMarkdown(result, cfg));
  let frozen = null;
  if (freeze) {
    frozen = join(AFF_DIR, `career-funnel-baseline-${windows.ga4.end}.json`);
    writeFileSync(frozen, `${JSON.stringify(result, null, 2)}\n`);
  }

  say(
    `[report-career-funnel] career 記事 ${ledger.length} 本 / site MDX ${siteFiles} 件＋設定 ${extraScanned} 件を実走査 / ` +
      `GSC ${gscCareerRows}/${(gscPageQuery.rows ?? []).length} 行が career に一致 / WARN ${warnings.length}`,
  );
  for (const w of warnings) say(`  WARN ${w}`);
  if (frozen) say(`  基線を凍結: ${relative(frozen)}`);
  if (jsonOut) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else say("  出力: .claude/state/metrics/affiliate/career-funnel-latest.{json,md}");
}

function renderMarkdown(r, cfg) {
  const L = [];
  const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(2)}%`);
  L.push("# キャリアファネル基線レポート", "");
  L.push(`生成: ${r.generatedAt}`, "");
  L.push("> [!warning]");
  L.push("> GA4 と GSC は取得遅延が違うため**窓が一致しない**。出所を跨いで CTR や EPC を割らないこと。");
  L.push(`> GA4 ${r.windows.ga4.start}〜${r.windows.ga4.end} ／ GSC ${r.windows.gsc.start}〜${r.windows.gsc.end}`, "");

  L.push("## 実検査の内訳", "");
  L.push("_「異常 0 件」と「1 件も検査していない」を区別するための欄（CLAUDE.md §9）。_", "");
  L.push("| 対象 | 件数 |", "|---|---|");
  for (const [k, v] of Object.entries(r.coverage)) L.push(`| ${k} | ${v} |`);
  L.push("");

  if (r.warnings.length) {
    L.push("## WARN", "");
    for (const w of r.warnings) L.push(`- ${w}`);
    L.push("");
  }

  L.push("## 漏斗", "");
  L.push("### 1. 高意図 query（GSC 窓）", "");
  L.push(`表示 ${r.funnel.highIntentQuery.impressions} ／ クリック ${r.funnel.highIntentQuery.clicks}`, "");
  L.push(`語彙: ${cfg.highIntentQueryTerms.join("・")}`, "");
  if (r.funnel.highIntentQuery.rows.length) {
    L.push("| query | 表示 | クリック | 順位 |", "|---|---|---|---|");
    for (const q of r.funnel.highIntentQuery.rows.slice(0, 15)) {
      L.push(`| ${q.query} | ${q.impressions} | ${q.clicks} | ${q.position == null ? "—" : q.position.toFixed(1)} |`);
    }
  } else {
    L.push("_該当 0 件。GSC は低ボリューム行を落とすため「無い」ではなく「見えていない」可能性がある。_");
  }
  L.push("");

  L.push("### 2. キャリアページの流入（GA4 窓）", "");
  L.push(`GA4 上位ページに入った career 記事: ${r.coverage.careerArticlesInGa4Top} / ${r.coverage.careerArticles} 本`, "");

  L.push("### 3. 柱ごとの検索と内部リンク", "");
  L.push("_被リンクは literal リンクの本数であり、実際の遷移ではない。回遊の実測ではなく構造の proxy。_", "");
  L.push("| 柱 | 記事 | GSC 表示 | GSC クリック | 被リンク |", "|---|---|---|---|---|");
  for (const [p, v] of Object.entries(r.pillars).sort((a, b) => b[1].articles - a[1].articles)) {
    L.push(`| ${p} | ${v.articles} | ${v.gscImpressions} | ${v.gscClicks} | ${v.inboundLinks} |`);
  }
  L.push("");

  L.push("### 4. affiliate CTA（GA4 窓）", "");
  L.push(
    `表示 ${r.funnel.affiliateCta.totalImpressions} ／ クリック ${r.funnel.affiliateCta.totalClicks} ／ CTR ${pct(r.funnel.affiliateCta.ctr)}`,
    "",
  );
  L.push("| placement | 表示 | クリック | CTR |", "|---|---|---|---|");
  for (const [k, v] of Object.entries(r.funnel.affiliateCta.byPlacement)) {
    L.push(`| ${k} | ${v.impressions} | ${v.clicks} | ${pct(v.impressions ? v.clicks / v.impressions : null)} |`);
  }
  L.push("");
  L.push("| label | 表示 | クリック |", "|---|---|---|");
  for (const [k, v] of Object.entries(r.funnel.affiliateCta.byLabel).slice(0, 12)) {
    L.push(`| ${k} | ${v.impressions} | ${v.clicks} |`);
  }
  L.push("");

  L.push("### 5. A8 成果", "");
  const w = r.funnel.a8.window;
  const a = r.funnel.a8.allTime;
  L.push(
    `窓内（${r.funnel.a8.monthsInWindow.join("・") || "該当月なし"}）: 発生 ${w.conversions} ／ 確定 ${w.approved} ／ 確定報酬 ¥${w.revenueYen}`,
  );
  L.push(`累計: 発生 ${a.conversions} ／ 確定 ${a.approved} ／ 確定報酬 ¥${a.revenueYen}`, "");
  L.push("_A8 管理画面のクリックは口座共用（stats47 と同居）のため分母に使わない。分母は GA4。_", "");

  if (r.baselineDrift.length) {
    L.push("## 起票時基線からのずれ（±30% 超）", "");
    for (const d of r.baselineDrift) L.push(`- ${d}`);
    L.push("");
  }

  L.push("## 記事台帳", "");
  L.push("| slug | 柱 | 公開 | GSC 表示 | クリック | 順位 | 被リンク | CTA |", "|---|---|---|---|---|---|---|---|");
  for (const d of [...r.ledger].sort((x, y) => y.gscImpressions - x.gscImpressions)) {
    L.push(
      `| ${d.slug} | ${d.pillar} | ${d.published ? "○" : "×"} | ${d.gscImpressions} | ${d.gscClicks} | ` +
        `${d.gscPosition ?? "—"} | ${d.inboundLiteralLinks} | ${d.careerAffiliateCount} |`,
    );
  }
  L.push("");

  L.push("## note 側キャリア記事", "");
  L.push("| utmCampaign | 状態 | 価格 | noteId |", "|---|---|---|---|");
  for (const n of r.noteCareer) {
    L.push(`| ${n.utmCampaign} | ${n.noteStatus ?? "—"} | ${n.notePricing ?? "—"} | ${n.noteId ?? "—"} |`);
  }
  L.push("");
  return `${L.join("\n")}\n`;
}

if (process.argv[1] && toPosix(process.argv[1]).endsWith("report-career-funnel.mjs")) main();

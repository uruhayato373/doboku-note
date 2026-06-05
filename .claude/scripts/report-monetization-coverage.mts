/**
 * 収益カバレッジ ダッシュボード（オフライン・週次レビュー統合用）
 *
 * GA4 のページ別流入 × CTA クリック × 実際の CTA 配置（note 有料マガジン /
 * アフィリエイト）を突合し、「高流入なのに収益導線が無い/弱い」ページを自動検出する。
 * 2026-06-06 の手作業監査（last-minute-2026 の無導線発見）を機械化したもの。
 *
 * データソース:
 *   - .claude/state/metrics/ga4/ga4-page-*.json        … ページ別流入（最新を自動選択）
 *   - .claude/state/metrics/ga4/ga4-cta-clicks-*.json   … CTA クリック（あれば。無ければ n.d.）
 *   - src/config/doc-meta-index.json                    … 全 doc の category/group/tags
 *
 * 配置の真実源:
 *   - note CTA: src/lib/magazine-placement.ts（resolvePlacement）+ note-magazines.ts（公開判定）
 *   - アフィリ: src/app/docs/[...slug]/page.tsx のサイドバー条件をミラー（下記 deriveAffiliate）
 *
 * 使い方:
 *   npx tsx .claude/scripts/report-monetization-coverage.mts
 *   npx tsx .claude/scripts/report-monetization-coverage.mts --min-users 20
 *   （出力: コンソール md + .claude/state/metrics/monetization/coverage-*.json + coverage-latest.md）
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from "fs";
import { join } from "path";
import { classifyDoc } from "../../src/lib/doc-classifier.ts";
import { resolvePlacement } from "../../src/lib/magazine-placement.ts";
import { getMagazine } from "../../src/lib/note-magazines.ts";

const ROOT = process.cwd();
const GA4_DIR = join(ROOT, ".claude/state/metrics/ga4");
const OUT_DIR = join(ROOT, ".claude/state/metrics/monetization");
const META_INDEX = join(ROOT, "src/config/doc-meta-index.json");

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? parseInt(process.argv[i + 1], 10) : fallback;
}
const MIN_USERS = arg("--min-users", 15); // gap 判定の高流入しきい値

function latest(prefix: string): string | null {
  if (!existsSync(GA4_DIR)) return null;
  const files = readdirSync(GA4_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .sort();
  return files.length ? join(GA4_DIR, files[files.length - 1]) : null;
}

function normPath(p: string): string {
  return p.replace(/\/+$/, "") || "/";
}

// ── アフィリエイト サイドバー配置の導出（page.tsx のミラー。SoT は page.tsx） ──
// 表示条件: (civil-1/2 → GKS) / (PE keyword|guide|pastExam → SAT)。
// ただし priced な note マガジンが sidebar に出ているページ (sidebarHasPaidMagazine) では
// カニバリ回避で非表示。tankan(精読ガイド)は price 無し＝アフィリと併存する。
function deriveAffiliate(
  category: string,
  docGroup: string,
  sidebarHasPaidMagazine: boolean,
): string | null {
  if (sidebarHasPaidMagazine) return null;
  if (category === "civil-construction-1" || category === "civil-construction-2") return "GKS";
  if (
    category === "pe-comprehensive-management" &&
    (docGroup === "keyword" || docGroup === "guide" || docGroup === "pastExam")
  )
    return "SAT";
  return null;
}

// ── load ──
const metaIndex = JSON.parse(readFileSync(META_INDEX, "utf-8")).docs as Record<
  string,
  any
>;

const pageFile = latest("ga4-page-");
if (!pageFile) {
  console.error("ga4-page-*.json が見つかりません。先に npm run fetch-ga4-data -- --dimension page");
  process.exit(1);
}
const pageData = JSON.parse(readFileSync(pageFile, "utf-8"));
const traffic = new Map<string, { users: number; sessions: number }>();
for (const r of pageData.rows) {
  traffic.set(normPath(r.page), {
    users: r.activeUsers ?? 0,
    sessions: r.sessions ?? 0,
  });
}

const clickFile = latest("ga4-cta-clicks-");
const noteClicks = new Map<string, number>();
const affClicks = new Map<string, number>();
let clickData: any = null;
if (clickFile) {
  clickData = JSON.parse(readFileSync(clickFile, "utf-8"));
  for (const r of clickData.rows) {
    const p = normPath(r.page);
    if (r.eventName === "note_cta_click")
      noteClicks.set(p, (noteClicks.get(p) ?? 0) + r.eventCount);
    else if (r.eventName === "affiliate_cta_click")
      affClicks.set(p, (affClicks.get(p) ?? 0) + r.eventCount);
  }
}

// ── join: doc ごとに配置を解決し traffic/clicks と突合 ──
interface Row {
  slug: string;
  page: string;
  category: string;
  docGroup: string;
  users: number;
  sessions: number;
  noteCta: string[];
  affiliate: string | null;
  linksFallback: boolean;
  noteClicks: number | null;
  affClicks: number | null;
  monetized: boolean;
  gap: boolean;
}

const rows: Row[] = [];
for (const [slug, meta] of Object.entries(metaIndex)) {
  if (meta.published === false) continue;
  const page = `/docs/${slug}`;
  const t = traffic.get(page);
  const users = t?.users ?? 0;
  const sessions = t?.sessions ?? 0;

  const docGroup = classifyDoc({ slug, ...meta } as any);
  const placement = resolvePlacement(slug, docGroup as any);
  const liveInline = placement.inline.filter((s) => getMagazine(s.magazineId));
  const liveSidebar = placement.sidebar.filter((s) => getMagazine(s.magazineId));
  const noteCta = [
    ...new Set([...liveInline, ...liveSidebar].map((s) => s.magazineId)),
  ];
  const sidebarHasPaidMagazine = liveSidebar.some(
    (s) => Boolean(getMagazine(s.magazineId)?.price),
  );
  const affiliate = deriveAffiliate(meta.category, docGroup, sidebarHasPaidMagazine);
  // /links フォールバック（PE keyword かつ sidebar に live マガジン無し）
  const linksFallback =
    meta.category === "pe-comprehensive-management" &&
    docGroup === "keyword" &&
    liveSidebar.length === 0;

  const monetized = noteCta.length > 0 || affiliate !== null || linksFallback;
  const gap = users >= MIN_USERS && !monetized;

  rows.push({
    slug,
    page,
    category: meta.category,
    docGroup,
    users,
    sessions,
    noteCta,
    affiliate,
    linksFallback,
    noteClicks: clickFile ? noteClicks.get(page) ?? 0 : null,
    affClicks: clickFile ? affClicks.get(page) ?? 0 : null,
    monetized,
    gap,
  });
}

rows.sort((a, b) => b.users - a.users);

// ── render markdown ──
const trafficked = rows.filter((r) => r.users > 0);
const gaps = trafficked.filter((r) => r.gap);
const ctr = (clicks: number | null, users: number) =>
  clicks === null ? "n.d." : users > 0 ? `${((clicks / users) * 100).toFixed(1)}%` : "—";
const noteLabel = (r: Row) =>
  r.noteCta.length ? r.noteCta.join("+") : r.linksFallback ? "(/links)" : "—";

const lines: string[] = [];
lines.push("## 収益カバレッジ ダッシュボード");
lines.push("");
lines.push(
  `> 流入: \`${pageData.meta.startDate}〜${pageData.meta.endDate}\`（${pageFile.split("/").pop()}）` +
    (clickFile
      ? ` / クリック: \`${clickData.meta.startDate}〜${clickData.meta.endDate}\``
      : " / クリック: **未取得**（計装直後はデータ無しが正常）"),
);
lines.push("");
lines.push(
  `- 流入のあるページ: **${trafficked.length}**　/　高流入(≥${MIN_USERS}users)で**収益導線ゼロ**: **${gaps.length}**`,
);
lines.push("");

if (gaps.length) {
  lines.push(`### 要対応ギャップ（高流入 × 無導線）`);
  lines.push("");
  lines.push("| ページ | users | category | group |");
  lines.push("|---|--:|---|---|");
  for (const r of gaps)
    lines.push(`| \`${r.slug}\` | ${r.users} | ${r.category} | ${r.docGroup} |`);
  lines.push("");
} else {
  lines.push("### 要対応ギャップ（高流入 × 無導線）");
  lines.push("");
  lines.push(`- なし（≥${MIN_USERS}users のページはすべて何らかの収益導線あり）`);
  lines.push("");
}

lines.push("### 上位 25 ページ × 収益カバレッジ");
lines.push("");
lines.push("| # | ページ | users | note CTA | アフィリ | noteCTR | affCTR |");
lines.push("|--:|---|--:|---|---|--:|--:|");
trafficked.slice(0, 25).forEach((r, i) => {
  lines.push(
    `| ${i + 1} | \`${r.slug}\` | ${r.users} | ${noteLabel(r)} | ${r.affiliate ?? "—"} | ${ctr(r.noteClicks, r.users)} | ${ctr(r.affClicks, r.users)} |`,
  );
});
lines.push("");
lines.push(
  `> note CTA: 配置済み live マガジン id（\`(/links)\`=教材ハブ送り）。アフィリ: サイドバー枠の導出（SoT=page.tsx）。CTR は users 比、\`n.d.\`=クリック未取得。`,
);
lines.push("");

const md = lines.join("\n");
console.log(md);

// ── persist ──
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
writeFileSync(
  join(OUT_DIR, `coverage-${stamp}.json`),
  JSON.stringify(
    {
      meta: {
        trafficWindow: { start: pageData.meta.startDate, end: pageData.meta.endDate },
        clickWindow: clickData
          ? { start: clickData.meta.startDate, end: clickData.meta.endDate }
          : null,
        minUsers: MIN_USERS,
        pageFile: pageFile.split("/").pop(),
        clickFile: clickFile ? clickFile.split("/").pop() : null,
      },
      summary: { trafficked: trafficked.length, gaps: gaps.length },
      rows,
    },
    null,
    2,
  ),
);
writeFileSync(join(OUT_DIR, "coverage-latest.md"), md + "\n");
console.error(`\n[written] ${join(OUT_DIR, "coverage-latest.md")}`);
